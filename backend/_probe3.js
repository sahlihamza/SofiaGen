require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");

const run = (mw, req, res) => new Promise((resolve, reject) => {
  let done = false;
  const next = (err) => { if (done) return; done = true; err ? reject(err) : resolve("next"); };
  const finish = () => { if (!done) { done = true; resolve("sent"); } };
  res._finish = finish;
  Promise.resolve(mw(req, res, next)).catch(reject);
});

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  for (const f of fs.readdirSync("./src/models")) { if (f.endsWith(".js")) { try { require("./src/models/"+f); } catch(e){} } }
  const { isAuth, loadUser } = require("./src/middleware/auth");
  const resolveAuthorizationContext = require("./src/middleware/resolveAuthorizationContext");
  const token = require("fs").readFileSync("_token.txt", "utf8").trim();
  const STORE = "6a881730ce8f8720a8abd67d";

  const scenarios = [
    ["WITH company header", { authorization: `Bearer ${token}`, company: STORE }],
    ["WITHOUT company header", { authorization: `Bearer ${token}` }],
  ];

  const targets = [
    ["products", "/api/products/", "./src/controller/productController", "getAllProducts"],
    ["orders",   "/api/orders/",   "./src/controller/orderController",   "getAllOrders"],
    ["dash v1",  "/api/dashboard/store-owner", "./src/controller/storeOwnerDashboardController", "getStoreOwnerDashboard"],
  ];

  for (const [label, headers] of scenarios) {
    console.log("\n===", label, "===");
    for (const [name, baseUrl, mod, fn] of targets) {
      const req = {
        headers, baseUrl, path: "/", originalUrl: baseUrl, method: "GET",
        query: {}, params: {}, body: {},
        get(h) { return this.headers[String(h).toLowerCase()]; },
      };
      let code = 200;
      const res = {
        status(c) { code = c; return this; },
        json(b) { this.body = b; res._finish?.(); return this; },
        send(b) { this.body = b; res._finish?.(); return this; },
      };
      try {
        await run(isAuth, req, res);
        await run(loadUser, req, res);
        await run(resolveAuthorizationContext, req, res);
        code = 200;
        const c = require(mod);
        await c[fn](req, res);
        const b = res.body;
        const msg = b && b.message ? String(b.message).split("\n")[0] : "";
        console.log(`  ${name.padEnd(9)} authCtx.storeId=${String(req.authContext?.storeId).slice(0,24).padEnd(24)} -> ${code} ${msg || "OK"}`);
      } catch (e) {
        console.log(`  ${name.padEnd(9)} THREW: ${e.message.split("\n")[0]}`);
      }
    }
  }
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
