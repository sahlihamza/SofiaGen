const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

// Storefront tokens are minted by signInToken (config/jwt.js) and carry both
// `_id` and `id` for the customer.
const decodeCustomerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  try {
    return jwt.verify(authHeader.split(" ")[1], accessSecret);
  } catch (error) {
    return null;
  }
};

// Checkout has to serve guests too, so a missing or stale token is not an
// error here: it just means `req.customer` stays null and the flow continues
// as a guest. Endpoints that cannot work without an account check
// `req.customer` themselves (see requireCustomer below).
const loadCustomerOptional = async (req, res, next) => {
  try {
    const decoded = decodeCustomerToken(req);
    const customerId = decoded?.id || decoded?._id;

    req.customer = customerId
      ? await Customer.findOne({ _id: customerId, deletedAt: null })
      : null;

    // A blocked account must not be able to keep ordering.
    if (req.customer && req.customer.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Ce compte client est bloqué.",
      });
    }

    return next();
  } catch (error) {
    // An unreadable token should never take the whole checkout down  fall
    // back to the guest path.
    req.customer = null;
    return next();
  }
};

const requireCustomer = (req, res, next) => {
  if (!req.customer) {
    return res.status(401).json({
      success: false,
      message: "Vous devez être connecté pour effectuer cette action.",
    });
  }
  return next();
};

module.exports = { loadCustomerOptional, requireCustomer };
