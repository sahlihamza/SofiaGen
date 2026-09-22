const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const express = require("express");

const User = require("../models/User");
const Store = require("../models/Store");
const Role = require("../models/Role");
const UserStore = require("../models/UserStore");
const Permission = require("../models/Permission");

const unique = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const created = { users: [], stores: [], roles: [], userStores: [] };

let storeA;
let storeB;
let userA;
let storeRole;
let app;

const SUBMODULES = [
  { name: "tax", mount: "/api/settings/tax", routes: "../routes/taxSettingsRoutes", get: "", put: "/options", method: "put" },
  { name: "shipping", mount: "/api/settings/shipping", routes: "../routes/shippingSettingsRoutes", get: "", put: "", method: "put" },
  { name: "product", mount: "/api/settings/products", routes: "../routes/productSettingsRoutes", get: "", put: "", method: "put" },
  { name: "point-of-sale", mount: "/api/settings/point-of-sale", routes: "../routes/pointOfSaleSettingsRoutes", get: "", put: "", method: "put" },
  { name: "payments", mount: "/api/settings/payments", routes: "../routes/paymentSettingsRoutes", get: "", put: "", method: "put" },
  { name: "accounts-privacy", mount: "/api/settings/accounts-privacy", routes: "../routes/accountsPrivacyRoutes", get: "", put: "", method: "put" },
  { name: "website-visibility", mount: "/api/settings/website-visibility", routes: "../routes/websiteVisibilityRoutes", get: "", put: "", method: "put" },
  { name: "emails", mount: "/api/settings/emails", routes: "../routes/emailSettingsRoutes", get: "", put: "", method: "put" },
  { name: "general", mount: "/api/settings/general", routes: "../routes/generalSettingsRoutes", get: "", put: "", method: "put", deniedStatuses: [401, 403] },
];

const injectUser = (req, res, next) => {
  req.user = userA;
  req.userId = userA._id;
  next();
};

const request = (method, url) =>
  new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const { port } = server.address();
      try {
        const res = await fetch(`http://127.0.0.1:${port}${url}`, {
          method: method.toUpperCase(),
          headers: { "Content-Type": "application/json" },
          body: method.toLowerCase() === "get" ? undefined : JSON.stringify({}),
        });
        let body = null;
        try {
          body = await res.json();
        } catch (e) {
          body = null;
        }
        server.close(() => resolve({ status: res.status, body }));
      } catch (err) {
        server.close(() => resolve({ status: 0, body: { error: err.message } }));
      }
    });
  });

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const settingsPerms = await Permission.find({ module: "Settings" });
  const visibilityPerms = await Permission.find({ module: "Website Visibility" });

  storeRole = await Role.create({
    name: unique("store-role"),
    slug: unique("store-role").toLowerCase(),
    scope: "store",
    permissions: [...settingsPerms, ...visibilityPerms].map((p) => p._id),
  });
  created.roles.push(storeRole._id);

  storeA = await Store.create({ name: unique("store-a") });
  storeB = await Store.create({ name: unique("store-b") });
  created.stores.push(storeA._id, storeB._id);

  userA = await User.create({
    name: "User A",
    email: `${unique("user-a")}@test.com`,
    password: "hashed-placeholder-password",
    status: "Active",
    role: [storeRole._id],
    isSuperAdmin: false,
  });
  created.users.push(userA._id);

  const membership = await UserStore.create({
    userId: userA._id,
    storeId: storeA._id,
    roleId: storeRole._id,
    status: "active",
  });
  created.userStores.push(membership._id);

  userA = await User.findById(userA._id).populate({
    path: "role",
    populate: { path: "permissions" },
  });

  app = express();
  app.use(express.json());
  app.use(injectUser);
  for (const mod of SUBMODULES) {
    app.use(mod.mount, require(mod.routes));
  }
});

test.after(async () => {
  await Promise.all([
    UserStore.deleteMany({ _id: { $in: created.userStores } }),
    User.deleteMany({ _id: { $in: created.users } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
    Role.deleteMany({ _id: { $in: created.roles } }),
  ]);
  await mongoose.connection.close();
});

for (const mod of SUBMODULES) {
  const denied = mod.deniedStatuses || [403];
  const label = denied.join("/");

  test(`${mod.name}: GET sur un storeId etranger renvoie ${label}`, async () => {
    const res = await request("get", `${mod.mount}/${storeB._id}${mod.get}`);
    assert.ok(
      denied.includes(res.status),
      `attendu ${label}, recu ${res.status} (${JSON.stringify(res.body)})`
    );
  });

  test(`${mod.name}: ${mod.method.toUpperCase()} sur un storeId etranger renvoie ${label}`, async () => {
    const res = await request(mod.method, `${mod.mount}/${storeB._id}${mod.put}`);
    assert.ok(
      denied.includes(res.status),
      `attendu ${label}, recu ${res.status} (${JSON.stringify(res.body)})`
    );
  });

  test(`${mod.name}: GET sur son propre store n'est pas bloque par l'isolation`, async () => {
    const res = await request("get", `${mod.mount}/${storeA._id}${mod.get}`);
    assert.notEqual(res.status, 403, `le store d'origine ne doit pas renvoyer 403 (${JSON.stringify(res.body)})`);
  });
}
