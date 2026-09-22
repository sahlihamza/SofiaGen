const bcrypt = require("bcryptjs");
const Customer = require("../models/Customer");
const { emitEvent } = require("../lib/eventBus");
const CustomerAddress = require("../models/CustomerAddress");
const CustomerGroup = require("../models/CustomerGroup");
const CustomerNote = require("../models/CustomerNote");
const CustomerSession = require("../models/CustomerSession");

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const toBool = (value) => value === true || value === "true";

const isSet = (value) => value !== undefined && value !== null && value !== "";

// Fields a client is allowed to write. Anything else in the payload is ignored
// so a request can never set deletedAt or forge another store's customer.
const WRITABLE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "avatar",
  "status",
  "role",
  "language",
  "currency",
  "emailVerified",
  "phoneVerified",
  "marketingConsent",
  "newsletter",
  "groupId",
];

const pickWritable = (data = {}) =>
  WRITABLE_FIELDS.reduce((acc, field) => {
    if (data[field] !== undefined) acc[field] = data[field];
    return acc;
  }, {});

// Email is unique per store. The compound index backs this up, but checking
// here gives a usable message instead of a raw duplicate-key error.
const assertEmailIsFree = async (email, storeId, excludeId) => {
  if (!email) return;

  const query = {
    email: email.toLowerCase().trim(),
    storeId: storeId || null,
  };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await Customer.findOne(query);
  if (existing) {
    throw httpError(409, "Un client avec cet email existe déjà dans cette boutique.");
  }
};

// Refuse a groupId that points at nothing, so the reference can never dangle.
const assertGroupExists = async (groupId) => {
  if (!groupId) return;

  const group = await CustomerGroup.findById(groupId);
  if (!group) {
    throw httpError(404, "Groupe client introuvable.");
  }
};

const createCustomer = async (data) => {
  const payload = pickWritable(data);

  if (data.storeId !== undefined) payload.storeId = data.storeId;
  await assertEmailIsFree(payload.email, payload.storeId, null);
  await assertGroupExists(payload.groupId);

  if (data.password) {
    payload.password = bcrypt.hashSync(data.password);
  }

  const newCustomer = new Customer(payload);
  await newCustomer.save();

  if (newCustomer.storeId) {
    emitEvent("customer.created", {
      storeId: newCustomer.storeId,
      entityId: newCustomer._id,
      metadata: { customerName: newCustomer.name || newCustomer.email },
      actionUrl: `/customer/${newCustomer._id}`,
    });
  }

  return newCustomer;
};

const createManyCustomers = async (customers = []) => {
  const payloads = customers.map((customer) => {
    const payload = pickWritable(customer);
    if (customer.storeId !== undefined) payload.storeId = customer.storeId;
    if (customer.password) payload.password = bcrypt.hashSync(customer.password);
    return payload;
  });

  return Customer.insertMany(payloads);
};

// Story 6 (recherche) + Story 7 (filtres) + pagination.
const getAllCustomers = async ({
  search,
  name,
  email,
  phone,
  status,
  groupId,
  storeId,
  emailVerified,
  phoneVerified,
  newsletter,
  startDate,
  endDate,
  includeDeleted,
  page,
  limit,
} = {}) => {
  const queryObject = {};

  // Soft-deleted customers stay out of the list unless explicitly asked for.
  if (!toBool(includeDeleted)) {
    queryObject.deletedAt = null;
  }

  if (isSet(storeId)) queryObject.storeId = storeId;

  // Free-text search across name, email and phone at once.
  if (isSet(search)) {
    const regex = { $regex: `${search}`, $options: "i" };
    queryObject.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  if (isSet(name)) {
    const regex = { $regex: `${name}`, $options: "i" };
    queryObject.$and = [{ $or: [{ firstName: regex }, { lastName: regex }] }];
  }
  if (isSet(email)) queryObject.email = { $regex: `${email}`, $options: "i" };
  if (isSet(phone)) queryObject.phone = { $regex: `${phone}`, $options: "i" };
  if (isSet(status)) queryObject.status = status;
  if (isSet(groupId)) queryObject.groupId = groupId;
  if (isSet(emailVerified)) queryObject.emailVerified = toBool(emailVerified);
  if (isSet(phoneVerified)) queryObject.phoneVerified = toBool(phoneVerified);
  if (isSet(newsletter)) queryObject.newsletter = toBool(newsletter);

  if (isSet(startDate) || isSet(endDate)) {
    queryObject.createdAt = {};
    if (isSet(startDate)) queryObject.createdAt.$gte = new Date(startDate);
    if (isSet(endDate)) queryObject.createdAt.$lte = new Date(endDate);
  }

  const pages = Number(page) || 1;
  const limits = Number(limit) || 0;
  const skip = (pages - 1) * limits;

  const totalDoc = await Customer.countDocuments(queryObject);
  const customers = await Customer.find(queryObject)
    .populate("groupId", "name discount")
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limits);

  return { customers, totalDoc, limits, pages };
};

const getCustomerById = async (id) => {
  return Customer.findOne({ _id: id, deletedAt: null })
    .populate("groupId", "name description discount")
    .populate("addresses");
};

const updateCustomer = async (id, data = {}) => {
  const customer = await Customer.findOne({ _id: id, deletedAt: null });
  if (!customer) return null;

  const payload = pickWritable(data);

  if (payload.email !== undefined) {
    await assertEmailIsFree(payload.email, customer.storeId, customer._id);
  }
  if (payload.groupId !== undefined) {
    await assertGroupExists(payload.groupId);
  }

  Object.assign(customer, payload);

  if (data.password) {
    customer.password = bcrypt.hashSync(data.password);
  }

  const saved = await customer.save();

  if (saved.storeId) {
    emitEvent("customer.updated", {
      storeId: saved.storeId,
      entityId: saved._id,
      metadata: { customerName: saved.name || saved.email },
      actionUrl: `/customer/${saved._id}`,
    });
  }

  return saved;
};

// Story 1  suppression logique.
const softDeleteCustomer = async (id) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );

  // A deleted customer must not stay signed in anywhere.
  if (customer) {
    await CustomerSession.deleteMany({ customerId: customer._id });
  }

  return customer;
};

const softDeleteManyCustomers = async (ids = []) => {
  const result = await Customer.updateMany(
    { _id: { $in: ids }, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );

  await CustomerSession.deleteMany({ customerId: { $in: ids } });

  return result;
};

const restoreCustomer = async (id) => {
  return Customer.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true }
  );
};

const blockCustomer = async (id) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { status: "blocked" } },
    { new: true }
  );

  // Blocking is pointless if the customer keeps a live session: force logout.
  if (customer) {
    await CustomerSession.deleteMany({ customerId: customer._id });
  }

  return customer;
};

const unblockCustomer = async (id) => {
  return Customer.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { status: "active" } },
    { new: true }
  );
};

// Irreversible: only for maintenance scripts / GDPR erasure. Takes the
// customer's addresses down with it so no orphan rows are left behind.
const destroyCustomer = async (id) => {
  await CustomerAddress.deleteMany({ customerId: id });
  await CustomerNote.deleteMany({ customerId: id });
  await CustomerSession.deleteMany({ customerId: id });
  return Customer.deleteOne({ _id: id });
};

module.exports = {
  createCustomer,
  createManyCustomers,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
  softDeleteManyCustomers,
  restoreCustomer,
  blockCustomer,
  unblockCustomer,
  destroyCustomer,
};
