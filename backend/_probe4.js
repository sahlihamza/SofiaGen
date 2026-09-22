require("dotenv").config();
const mongoose = require("mongoose");

const run = (name, mw, req, res) => new Promise((resolve) => {
  let done = false;
  const settle = (how, info) => { if (!done) { done = true; resolve({ how, info }); } };
  res._finish = (b) => settle("sent", b);
  Promise.resolve(mw(req, res, (err) => settle(err ? "error" : "next", err && err.message)))
    .catch((e) => settle("threw", e.message));
});

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const { isAuth, loadUser } = require("./src/middleware/auth");
  const resolveAuthorizationContext = require("./src/middleware/resolveAuthorizationContext");
  const token = require("fs").readFileSync("_token.txt", "utf8").trim();
  const STORE = "6a881730ce8f8720a8abd67d";

  const req = {
    headers: { authorization: `Bearer ${token}`, company: STORE },
    baseUrl: "/api/products/", path: "/", originalUrl: "/api/products/", method: "GET",
    query: {}, params: {}, body: {},
    get(h) { return this.headers[String(h).toLowerCase()]; },
  };
  const res = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this._finish?.(b); return this; },
    send(b) { this.body = b; this._finish?.(b); return this; },
  };

  for (const [n, mw] of [["isAuth", isAuth], ["loadUser", loadUser], ["resolveAuthCtx", resolveAuthorizationContext]]) {
    const r = await run(n, mw, req, res);
    console.log(`${n.padEnd(15)} ${r.how}${r.info ? " " + JSON.stringify(r.info).slice(0,120) : ""}`);
    console.log(`   req.currentStoreId=${req.currentStoreId}  req.user=${!!req.user}  authContext.storeId=${req.authContext ? req.authContext.storeId : "(no authContext)"}  query.storeId=${req.query.storeId}`);
    if (r.how === "sent") break;
  }
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
