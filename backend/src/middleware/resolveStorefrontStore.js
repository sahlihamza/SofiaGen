const Store = require("../models/Store");
const { isUsableStoreStatus } = require("./auth");

// SO-19: the public storefront had no domain-based resolution at all 
// getCurrentStore (storefrontController.js) picked whichever Store had
// isSelected:true, a single flag shared by the entire platform. On a real
// multi-tenant deployment that means every visitor, on every domain, saw
// the same one store  and flipping that flag (an admin "preview" action,
// a bug) would swap what the WHOLE PLATFORM's storefront serves.
// Store.domain/subdomain already exist on the model; nothing ever read
// them from an incoming request. This middleware is that missing read:
// custom domain match first, then <sub>.STOREFRONT_BASE_DOMAIN, and only
// when neither resolves (local dev on a bare hostname, or the base domain
// env var isn't set) does it fall back to the legacy singleton  so an
// unconfigured dev environment keeps working exactly as before.
const stripPort = (host) => String(host || "").split(":")[0].toLowerCase();

const resolveStorefrontStore = async (req, res, next) => {
  try {
    const host = stripPort(req.hostname || req.get("host"));
    let store = null;

    if (host) {
      store = await Store.findOne({ domain: host });

      if (!store) {
        const baseDomain = String(process.env.STOREFRONT_BASE_DOMAIN || "").toLowerCase();
        if (baseDomain && host.endsWith(`.${baseDomain}`)) {
          const subdomain = host.slice(0, -(baseDomain.length + 1));
          if (subdomain) {
            store = await Store.findOne({ subdomain });
          }
        }
      }
    }

    if (!store) {
      // Legacy fallback  single-store dev/test setups with no domain
      // configured at all. Never used once a store has a real domain.
      store =
        (await Store.findOne({ isSelected: true })) ||
        (await Store.findOne({ isActive: true }));
    }

    if (!store || !isUsableStoreStatus(store.status)) {
      return res.status(404).json({ success: false, message: "Aucune boutique active pour ce domaine" });
    }

    req.storefrontStore = store;
    req.currentStoreId = String(store._id);
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = resolveStorefrontStore;
