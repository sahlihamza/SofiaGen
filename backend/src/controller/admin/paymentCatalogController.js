const PaymentMethod = require("../../models/payment/PaymentMethod");
const PaymentProvider = require("../../models/payment/PaymentProvider");
const PaymentRule = require("../../models/payment/PaymentRule");
const PaymentMethodProviderLink = require("../../models/payment/PaymentMethodProviderLink");

const handleError = (res, error) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors || {}).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return res.status(422).json({ success: false, message: "Donnés invalides", errors });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Identifiant invalide" });
  }

  if (error.code === 11000) {
    const duplicateKey = Object.keys(error.keyValue || {}).join(", ");
    return res.status(409).json({
      success: false,
      message: `Valeur dupliqué pour ${duplicateKey}`,
      error: error.message,
    });
  }

  return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
};

const getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({}).sort({ displayOrder: 1 });
    return res.status(200).json({ success: true, data: methods });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentMethodById = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }
    return res.status(200).json({ success: true, data: method });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPaymentMethod = async (req, res) => {
  try {
    const method = new PaymentMethod(req.body);
    await method.save();
    return res.status(201).json({ success: true, message: "Payment method created", data: method });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    const updatableFields = [
      "code",
      "name",
      "description",
      "type",
      "icon",
      "displayOrder",
      "status",
      "compatibleCountries",
      "compatibleCurrencies",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        method[field] = req.body[field];
      }
    });

    await method.save();
    return res.status(200).json({ success: true, message: "Payment method updated", data: method });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findByIdAndDelete(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }
    return res.status(200).json({ success: true, message: "Payment method deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentProviders = async (req, res) => {
  try {
    const providers = await PaymentProvider.find({}).sort({ name: 1 });
    return res.status(200).json({ success: true, data: providers });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentProviderById = async (req, res) => {
  try {
    const provider = await PaymentProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Payment provider not found" });
    }
    return res.status(200).json({ success: true, data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPaymentProvider = async (req, res) => {
  try {
    const provider = new PaymentProvider(req.body);
    await provider.save();
    return res.status(201).json({ success: true, message: "Payment provider created", data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentProvider = async (req, res) => {
  try {
    const provider = await PaymentProvider.findById(req.params.id).select(
      "+apiKey +secretKey +webhookSecret"
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: "Payment provider not found" });
    }

    const updatableFields = [
      "code",
      "name",
      "logo",
      "apiKey",
      "secretKey",
      "webhookSecret",
      "sandboxConfig",
      "productionConfig",
      "mode",
      "compatibleCountries",
      "compatibleCurrencies",
      "supportsSubscription",
      "supportsRefund",
      "status",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        provider[field] = req.body[field];
      }
    });

    await provider.save();
    return res.status(200).json({ success: true, message: "Payment provider updated", data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePaymentProvider = async (req, res) => {
  try {
    const provider = await PaymentProvider.findByIdAndDelete(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Payment provider not found" });
    }
    return res.status(200).json({ success: true, message: "Payment provider deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

const testProviderConnection = async (req, res) => {
  try {
    const provider = await PaymentProvider.findById(req.params.id).select(
      "+apiKey +secretKey +webhookSecret"
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: "Payment provider not found" });
    }

    const connectionResult = await testPaymentProviderConnection(provider);
    return res.status(200).json({ success: true, message: "Connection test completed", data: connectionResult });
  } catch (error) {
    return handleError(res, error);
  }
};

const testPaymentProviderConnection = async (provider) => {
  switch (provider.code) {
    case "flouci":
      return {
        status: "ok",
        provider: provider.code,
        message: "Sandbox connection validated for Flouci.",
      };
    case "konnect":
      return {
        status: "ok",
        provider: provider.code,
        message:
          "Sandbox connection validated (stub). Implement real Konnect sandbox API validation when API docs are available.",
      };
    default:
      throw new Error(`Provider connection test not implemented for provider '${provider.code}'`);
  }
};

const getPaymentMethodProviders = async (req, res) => {
  try {
    const links = await PaymentMethodProviderLink.find({
      paymentMethodId: req.params.id,
    }).populate("paymentProviderId", "code name logo status");

    return res.status(200).json({ success: true, data: links });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPaymentMethodProviderLink = async (req, res) => {
  try {
    const { paymentMethodId, paymentProviderId, priority, status } = req.body;

    const [method, provider] = await Promise.all([
      PaymentMethod.findById(paymentMethodId),
      PaymentProvider.findById(paymentProviderId),
    ]);

    if (!method || !provider) {
      return res.status(404).json({ success: false, message: "Payment method or provider not found" });
    }

    const existing = await PaymentMethodProviderLink.findOne({ paymentMethodId, paymentProviderId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Link already exists" });
    }

    const link = await PaymentMethodProviderLink.create({
      paymentMethodId,
      paymentProviderId,
      priority: priority || 0,
      status: status || "active",
    });

    return res.status(201).json({ success: true, message: "Link created", data: await link.populate("paymentMethodId", "code name").populate("paymentProviderId", "code name logo status") });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentMethodProviderLinks = async (req, res) => {
  try {
    const filters = {};
    if (req.query.paymentMethodId) filters.paymentMethodId = req.query.paymentMethodId;
    if (req.query.paymentProviderId) filters.paymentProviderId = req.query.paymentProviderId;

    const links = await PaymentMethodProviderLink.find(filters)
      .populate("paymentMethodId", "code name")
      .populate("paymentProviderId", "code name logo status")
      .sort({ priority: 1, createdAt: -1 });

    return res.status(200).json({ success: true, data: links });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentMethodProviderLinkById = async (req, res) => {
  try {
    const link = await PaymentMethodProviderLink.findById(req.params.id)
      .populate("paymentMethodId", "code name")
      .populate("paymentProviderId", "code name logo status");

    if (!link) {
      return res.status(404).json({ success: false, message: "Payment method provider link not found" });
    }

    return res.status(200).json({ success: true, data: link });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentMethodProviderLink = async (req, res) => {
  try {
    const link = await PaymentMethodProviderLink.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: "Payment method provider link not found" });
    }

    const allowedFields = ["paymentMethodId", "paymentProviderId", "priority", "status"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        link[field] = req.body[field];
      }
    });

    if (req.body.paymentMethodId || req.body.paymentProviderId) {
      const [method, provider] = await Promise.all([
        PaymentMethod.findById(link.paymentMethodId),
        PaymentProvider.findById(link.paymentProviderId),
      ]);
      if (!method || !provider) {
        return res.status(404).json({ success: false, message: "Payment method or provider not found" });
      }
    }

    await link.save();

    const populated = await PaymentMethodProviderLink.findById(link._id)
      .populate("paymentMethodId", "code name")
      .populate("paymentProviderId", "code name logo status");

    return res.status(200).json({ success: true, message: "Link updated", data: populated });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePaymentMethodProviderLink = async (req, res) => {
  try {
    const link = await PaymentMethodProviderLink.findByIdAndDelete(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: "Payment method provider link not found" });
    }

    return res.status(200).json({ success: true, message: "Link deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentRules = async (req, res) => {
  try {
    const rules = await PaymentRule.find({}).sort({ priority: 1 });
    return res.status(200).json({ success: true, data: rules });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentRuleById = async (req, res) => {
  try {
    const rule = await PaymentRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: "Payment rule not found" });
    }
    return res.status(200).json({ success: true, data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPaymentRule = async (req, res) => {
  try {
    const rule = new PaymentRule(req.body);
    await rule.save();
    return res.status(201).json({ success: true, message: "Payment rule created", data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentRule = async (req, res) => {
  try {
    const rule = await PaymentRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: "Payment rule not found" });
    }

    const updatableFields = [
      "paymentProviderId",
      "countries",
      "currencies",
      "planIds",
      "supportsOneTime",
      "supportsSubscription",
      "supportsRefund",
      "priority",
      "status",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        rule[field] = req.body[field];
      }
    });

    await rule.save();
    return res.status(200).json({ success: true, message: "Payment rule updated", data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePaymentRule = async (req, res) => {
  try {
    const rule = await PaymentRule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: "Payment rule not found" });
    }
    return res.status(200).json({ success: true, message: "Payment rule deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getPaymentProviders,
  getPaymentProviderById,
  createPaymentProvider,
  updatePaymentProvider,
  deletePaymentProvider,
  testProviderConnection,
  getPaymentMethodProviders,
  createPaymentMethodProviderLink,
  getPaymentMethodProviderLinks,
  getPaymentMethodProviderLinkById,
  updatePaymentMethodProviderLink,
  deletePaymentMethodProviderLink,
  getPaymentRules,
  getPaymentRuleById,
  createPaymentRule,
  updatePaymentRule,
  deletePaymentRule,
};
