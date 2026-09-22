require("dotenv").config();
const mongoose = require("mongoose");

// Re-throw with a full stack that includes app frames, so we can see the caller.
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const req = {
    query: {}, params: {}, body: {}, headers: { company: "6a881730ce8f8720a8abd67d" },
    currentStoreId: "6a881730ce8f8720a8abd67d",
    user: { _id: "6a897ce94179b849dc47b40b", isSuperAdmin: true, currentStoreId: null, storeIds: [], role: [] },
    get(h) { return this.headers[h.toLowerCase()]; },
  };
  const mkRes = (label) => ({
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(b) { console.log(label, "->", this.statusCode, JSON.stringify(b).slice(0, 160)); return this; },
    send(b) { console.log(label, "->", this.statusCode, JSON.stringify(b).slice(0, 160)); return this; },
  });

  for (const [label, mod, fn] of [
    ["products", "./src/controller/productController", "getAllProducts"],
    ["orders",   "./src/controller/orderController",   "getAllOrders"],
  ]) {
    try {
      const c = require(mod);
      if (typeof c[fn] !== "function") { console.log(label, "no fn", fn, "-> keys:", Object.keys(c).slice(0,25).join(",")); continue; }
      await c[fn](req, mkRes(label));
    } catch (e) { console.log(label, "THREW:", e.message.split("\n")[0]); }
  }
  process.exit(0);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
