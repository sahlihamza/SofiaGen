const Customer = require("../models/Customer");
const CustomerAddress = require("../models/CustomerAddress");
const CustomerNote = require("../models/CustomerNote");
const CustomerSession = require("../models/CustomerSession");
const Order = require("../models/Order");
const GdprRequest = require("../models/GdprRequest");
const auditLogService = require("./auditLogService");
const { anonymizeCustomerDoc, anonymizeOrderDoc } = require("../utils/dataRetention");

const notFound = (message) => {
  const error = new Error(message);
  error.name = "CustomerNotFound";
  return error;
};

const resolveCustomer = async (storeId, { customerId, customerEmail }) => {
  const storeScope = { $or: [{ storeId }, { storeId: null }, { storeId: { $exists: false } }] };

  let query;
  if (customerId) {
    query = { _id: customerId, ...storeScope };
  } else if (customerEmail) {
    query = {
      email: String(customerEmail).trim().toLowerCase(),
      ...storeScope,
    };
  } else {
    const error = new Error("customerId ou customerEmail requis");
    error.name = "ValidationError";
    error.errors = {};
    throw error;
  }

  const customer = await Customer.findOne(query);
  if (!customer) {
    throw notFound("Client introuvable pour cette boutique");
  }
  return customer;
};

class GdprService {
  async exportCustomerData(storeId, identifiers, actor) {
    const customer = await resolveCustomer(storeId, identifiers);

    const [addresses, notes, orders] = await Promise.all([
      CustomerAddress.find({ customerId: customer._id }).lean(),
      CustomerNote.find({ customerId: customer._id }).lean(),
      Order.find({ user: customer._id }).lean(),
    ]);

    const exportPayload = {
      customer: customer.toObject({ virtuals: true }),
      addresses,
      notes,
      orders,
      exportedAt: new Date().toISOString(),
    };

    await GdprRequest.create({
      storeId,
      customerId: customer._id,
      customerEmailSnapshot: customer.email,
      type: "export",
      status: "completed",
      resultSummary: {
        addressesCount: addresses.length,
        notesCount: notes.length,
        ordersCount: orders.length,
      },
      requestedBy: actor?._id || null,
    });

    await auditLogService.log({
      storeId,
      action: "data_exported",
      entityType: "Customer",
      entityId: String(customer._id),
      summary: `Export des donnés de ${customer.email}`,
      metadata: { addressesCount: addresses.length, notesCount: notes.length, ordersCount: orders.length },
      actor,
    });

    return exportPayload;
  }

  async deleteCustomerData(storeId, identifiers, actor) {
    const customer = await resolveCustomer(storeId, identifiers);
    const customerEmailSnapshot = customer.email;
    const customerIdSnapshot = customer._id;

    const orders = await Order.find({ user: customer._id, anonymizedAt: null });
    for (const order of orders) {
      anonymizeOrderDoc(order);
      await order.save({ validateBeforeSave: false });
    }

    const [{ deletedCount: addressesDeleted }, { deletedCount: notesDeleted }, { deletedCount: sessionsDeleted }] =
      await Promise.all([
        CustomerAddress.deleteMany({ customerId: customer._id }),
        CustomerNote.deleteMany({ customerId: customer._id }),
        CustomerSession.deleteMany({ customerId: customer._id }),
      ]);

    await Customer.deleteOne({ _id: customer._id });

    await GdprRequest.create({
      storeId,
      customerId: null,
      customerEmailSnapshot,
      type: "delete",
      status: "completed",
      resultSummary: {
        ordersAnonymized: orders.length,
        addressesDeleted,
        notesDeleted,
        sessionsDeleted,
      },
      requestedBy: actor?._id || null,
    });

    await auditLogService.log({
      storeId,
      action: "data_deleted",
      entityType: "Customer",
      entityId: String(customerIdSnapshot),
      summary: `Effacement des donnés de ${customerEmailSnapshot}`,
      metadata: { ordersAnonymized: orders.length, addressesDeleted, notesDeleted, sessionsDeleted },
      actor,
    });

    return {
      ordersAnonymized: orders.length,
      addressesDeleted,
      notesDeleted,
      sessionsDeleted,
    };
  }

  async anonymizeCustomerData(storeId, identifiers, actor) {
    const customer = await resolveCustomer(storeId, identifiers);

    const [{ deletedCount: addressesDeleted }] = await Promise.all([
      CustomerAddress.deleteMany({ customerId: customer._id }),
    ]);

    anonymizeCustomerDoc(customer);
    await customer.save({ validateBeforeSave: false });

    const orders = await Order.find({ user: customer._id, anonymizedAt: null });
    for (const order of orders) {
      anonymizeOrderDoc(order);
      await order.save({ validateBeforeSave: false });
    }

    await GdprRequest.create({
      storeId,
      customerId: customer._id,
      customerEmailSnapshot: customer.email,
      type: "anonymize",
      status: "completed",
      resultSummary: {
        addressesDeleted,
        ordersAnonymized: orders.length,
      },
      requestedBy: actor?._id || null,
    });

    await auditLogService.log({
      storeId,
      action: "data_anonymized",
      entityType: "Customer",
      entityId: String(customer._id),
      summary: `Anonymisation des donnés de ${customer.email}`,
      metadata: { addressesDeleted, ordersAnonymized: orders.length },
      actor,
    });

    return { addressesDeleted, ordersAnonymized: orders.length };
  }

  async listRequests(storeId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      GdprRequest.find({ storeId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("requestedBy", "name email")
        .lean(),
      GdprRequest.countDocuments({ storeId }),
    ]);

    return { requests, total, page: Number(page), limit: Number(limit) };
  }
}

module.exports = new GdprService();
