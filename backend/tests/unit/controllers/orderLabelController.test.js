const path = require("path");

// src/middleware/auth.js throws at import time without a JWT secret, so the
// environment has to be loaded before the router is required.
require("dotenv").config({ path: path.join(__dirname, "..", "..", "..", ".env") });

const mongoose = require("mongoose");
const express = require("express");

const orderRoutes = require("../../../src/routes/orderRoutes");
const resolveAuthorizationContext = require("../../../src/middleware/resolveAuthorizationContext");
const { permissions } = require("../../../src/config/rbac/permissions");
const Permission = require("../../../src/models/Permission");
const Role = require("../../../src/models/Role");
const User = require("../../../src/models/User");
const UserStore = require("../../../src/models/UserStore");
const Store = require("../../../src/models/Store");
const Order = require("../../../src/models/Order");
const OrderLabel = require("../../../src/models/OrderLabel");

// SFG-155 — the HTTP surface of Print Labels, exercised through the real
// guard chain (resolveAuthorizationContext → requireStoreAccess →
// requirePermission) rather than by calling the controller directly, because
// what the ticket asks to prove — "a Store A user can never print a Store B
// order, a user without the permission gets 403" — lives in that chain.

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sofiagen_test";
const unique = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let app;
let storeA;
let storeB;
let printer; // member of store A, may print
let viewer; // member of store A, Orders.view only
let currentUser;

// Stands in for isAuth + loadUser: the JWT itself is not what this suite is
// about, everything downstream of it is.
const injectUser = (req, res, next) => {
  req.user = currentUser;
  req.userId = currentUser._id;
  req.currentStoreId = currentUser.currentStoreId;
  next();
};

const request = (method, url, body) =>
  new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const { port } = server.address();
      try {
        const response = await fetch(`http://127.0.0.1:${port}${url}`, {
          method: method.toUpperCase(),
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/pdf")
          ? Buffer.from(await response.arrayBuffer())
          : await response.json().catch(() => null);
        server.close(() =>
          resolve({
            status: response.status,
            contentType,
            disposition: response.headers.get("content-disposition"),
            cacheControl: response.headers.get("cache-control"),
            body: payload,
          })
        );
      } catch (error) {
        server.close(() => reject(error));
      }
    });
  });

const makeOrder = (storeId) =>
  Order.create({
    storeId,
    user_info: { name: "Client", phone: "+216 20 000 000", address: "Rue de Rome", city: "Tunis" },
    cart: [],
    subTotal: 50,
    total: 50,
    currency: "DT",
    paymentMethod: "cash on delivery",
  });

const makeUser = async (store, permissionCodes) => {
  const role = await Role.create({
    name: unique("sfg155-role"),
    slug: unique("sfg155-role").toLowerCase(),
    scope: "store",
    permissions: (await Permission.find({ code: { $in: permissionCodes } })).map((p) => p._id),
  });
  const user = await User.create({
    name: "SFG155 User",
    email: `${unique("sfg155")}@test.com`,
    password: "hashed-placeholder-password",
    role: [],
  });
  await UserStore.create({ userId: user._id, storeId: store._id, roleId: role._id, status: "active" });
  return { _id: user._id, isSuperAdmin: false, role: [], currentStoreId: store._id.toString() };
};

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // The routes name their permissions through getCode(), so the DB has to
  // hold the same catalogue the config declares.
  for (const perm of permissions.filter((p) => p.module === "Orders")) {
    await Permission.findOneAndUpdate(
      { code: perm.code },
      {
        code: perm.code,
        name: perm.name,
        module: perm.module,
        action: perm.action,
        scope: perm.scope,
        category: perm.category,
        riskLevel: "low",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  storeA = await Store.create({ name: unique("SFG155-A"), status: "active" });
  storeB = await Store.create({ name: unique("SFG155-B"), status: "active" });

  printer = await makeUser(storeA, ["orders.view", "orders.print.label"]);
  viewer = await makeUser(storeA, ["orders.view"]);
  currentUser = printer;

  app = express();
  app.use(express.json());
  app.use("/api/orders", injectUser, resolveAuthorizationContext, orderRoutes);
});

afterAll(async () => {
  await Promise.all([
    Order.deleteMany({ storeId: { $in: [storeA._id, storeB._id] } }),
    OrderLabel.deleteMany({ storeId: { $in: [storeA._id, storeB._id] } }),
    Store.deleteMany({ _id: { $in: [storeA._id, storeB._id] } }),
    User.deleteMany({ _id: { $in: [printer._id, viewer._id] } }),
    UserStore.deleteMany({ userId: { $in: [printer._id, viewer._id] } }),
  ]);
  await mongoose.connection.close();
});

beforeEach(() => {
  currentUser = printer;
});

describe("POST /api/orders/labels", () => {
  it("returns a printable PDF for the caller's own orders", async () => {
    const order = await makeOrder(storeA._id);
    const res = await request("post", "/api/orders/labels", { orderIds: [order._id.toString()] });

    expect(res.status).toBe(200);
    expect(res.contentType).toContain("application/pdf");
    expect(res.body.slice(0, 5).toString()).toBe("%PDF-");
    expect(res.disposition).toContain("inline");
    // A delivery note carries the customer's address: no shared cache copy.
    expect(res.cacheControl).toContain("no-store");
  });

  it("serves it as a download when asked", async () => {
    const order = await makeOrder(storeA._id);
    const res = await request("post", "/api/orders/labels", {
      orderIds: [order._id.toString()],
      download: true,
    });
    expect(res.disposition).toContain("attachment");
  });

  it("refuses a caller whose role has no print_label permission", async () => {
    const order = await makeOrder(storeA._id);
    currentUser = viewer;

    const res = await request("post", "/api/orders/labels", { orderIds: [order._id.toString()] });
    expect(res.status).toBe(403);
  });

  it("cannot reach another store's order by putting its id in the request", async () => {
    const foreign = await makeOrder(storeB._id);
    const res = await request("post", "/api/orders/labels", { orderIds: [foreign._id.toString()] });

    expect(res.status).toBe(404);
    expect(await OrderLabel.countDocuments({ storeId: storeB._id })).toBe(0);
  });

  it("cannot switch store by sending another storeId in the body", async () => {
    const foreign = await makeOrder(storeB._id);
    const res = await request("post", "/api/orders/labels", {
      orderIds: [foreign._id.toString()],
      storeId: storeB._id.toString(),
    });

    // The store is resolved from the membership, not from the payload: with
    // no membership in store B the caller has no permissions there.
    expect(res.status).toBe(403);
  });

  it("rejects an empty selection", async () => {
    const res = await request("post", "/api/orders/labels", { orderIds: [] });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/orders/:id/label", () => {
  it("returns the single-order label", async () => {
    const order = await makeOrder(storeA._id);
    const res = await request("get", `/api/orders/${order._id}/label`);

    expect(res.status).toBe(200);
    expect(res.contentType).toContain("application/pdf");
  });

  it("returns 404 for a guessed id belonging to another store", async () => {
    const foreign = await makeOrder(storeB._id);
    const res = await request("get", `/api/orders/${foreign._id}/label`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for an id that is not an ObjectId", async () => {
    const res = await request("get", "/api/orders/not-an-id/label");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/orders/labels/manifest", () => {
  it("returns the manifest PDF for a multi-order selection", async () => {
    const first = await makeOrder(storeA._id);
    const second = await makeOrder(storeA._id);

    const res = await request("post", "/api/orders/labels/manifest", {
      orderIds: [first._id.toString(), second._id.toString()],
    });

    expect(res.status).toBe(200);
    expect(res.contentType).toContain("application/pdf");
  });
});

describe("Label status endpoints", () => {
  it("moves a label to printed only after it has been generated", async () => {
    const order = await makeOrder(storeA._id);
    const id = order._id.toString();

    const tooEarly = await request("post", "/api/orders/labels/printed", { orderIds: [id] });
    expect(tooEarly.status).toBe(409);

    await request("post", "/api/orders/labels", { orderIds: [id] });
    const printed = await request("post", "/api/orders/labels/printed", { orderIds: [id] });
    expect(printed.status).toBe(200);
    expect(printed.body.data[0].status).toBe("printed");

    const status = await request("get", `/api/orders/labels/status?orderIds=${id}`);
    expect(status.status).toBe(200);
    expect(status.body.data[0].status).toBe("printed");

    // The order's own fulfilment status is untouched by any of this.
    const reloaded = await Order.findOne({ _id: order._id, storeId: storeA._id }).lean();
    expect(reloaded.status).toBe("Pending");
  });

  it("does not leak another store's label status", async () => {
    const foreign = await makeOrder(storeB._id);
    const res = await request("get", `/api/orders/labels/status?orderIds=${foreign._id}`);

    expect(res.status).toBe(200);
    // Known-nothing answer: the default state, never the real row.
    expect(res.body.data[0].status).toBe("pending");
    expect(res.body.data[0].trackingNumber).toBeNull();
  });
});
