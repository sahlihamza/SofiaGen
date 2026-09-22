const CustomerGroup = require("../models/CustomerGroup");
const Customer = require("../models/Customer");

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const isSet = (value) => value !== undefined && value !== null && value !== "";

const WRITABLE_FIELDS = ["name", "description", "discount"];

const pickWritable = (data = {}) =>
  WRITABLE_FIELDS.reduce((acc, field) => {
    if (data[field] !== undefined) acc[field] = data[field];
    return acc;
  }, {});

// Group names are unique per boutique. The compound index backs this up, but
// checking here gives a usable message instead of a raw duplicate-key error.
const assertNameIsFree = async (name, storeId, excludeId) => {
  if (!name) return;

  const query = {
    name: name.trim(),
    storeId: storeId || null,
  };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await CustomerGroup.findOne(query);
  if (existing) {
    throw httpError(409, "Un groupe avec ce nom existe déjà dans cette boutique.");
  }
};

// How many live customers sit in each of the given groups.
const countCustomersByGroup = async (groupIds) => {
  const rows = await Customer.aggregate([
    { $match: { groupId: { $in: groupIds }, deletedAt: null } },
    { $group: { _id: "$groupId", count: { $sum: 1 } } },
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id.toString()] = row.count;
    return acc;
  }, {});
};

const createGroup = async (data = {}) => {
  const payload = pickWritable(data);
  if (data.storeId !== undefined) payload.storeId = data.storeId;

  await assertNameIsFree(payload.name, payload.storeId, null);

  const newGroup = new CustomerGroup(payload);
  return newGroup.save();
};

const createManyGroups = async (groups = []) => {
  const payloads = groups.map((group) => {
    const payload = pickWritable(group);
    if (group.storeId !== undefined) payload.storeId = group.storeId;
    return payload;
  });

  return CustomerGroup.insertMany(payloads);
};

const getAllGroups = async ({ name, storeId, page, limit } = {}) => {
  const queryObject = {};

  if (isSet(storeId)) queryObject.storeId = storeId;
  if (isSet(name)) queryObject.name = { $regex: `${name}`, $options: "i" };

  const pages = Number(page) || 1;
  const limits = Number(limit) || 0;
  const skip = (pages - 1) * limits;

  const totalDoc = await CustomerGroup.countDocuments(queryObject);
  const groups = await CustomerGroup.find(queryObject)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limits);

  // Attach the member count so a listing does not need one query per row.
  const counts = await countCustomersByGroup(groups.map((group) => group._id));
  const withCounts = groups.map((group) => ({
    ...group.toJSON(),
    customerCount: counts[group._id.toString()] || 0,
  }));

  return { groups: withCounts, totalDoc, limits, pages };
};

const getGroupById = async (id) => {
  return CustomerGroup.findById(id);
};

const updateGroup = async (id, data = {}) => {
  const group = await CustomerGroup.findById(id);
  if (!group) return null;

  const payload = pickWritable(data);

  if (payload.name !== undefined) {
    await assertNameIsFree(payload.name, group.storeId, group._id);
  }

  Object.assign(group, payload);

  return group.save();
};

// Members are detached rather than deleted: losing a group must never lose a
// customer.
const deleteGroup = async (id) => {
  const group = await CustomerGroup.findById(id);
  if (!group) return null;

  await Customer.updateMany({ groupId: group._id }, { $set: { groupId: null } });
  await CustomerGroup.deleteOne({ _id: group._id });

  return group;
};

const deleteManyGroups = async (ids = []) => {
  await Customer.updateMany({ groupId: { $in: ids } }, { $set: { groupId: null } });
  return CustomerGroup.deleteMany({ _id: { $in: ids } });
};

// Bulk membership change, used by the "assign to group" action on a selection.
const assignCustomersToGroup = async (groupId, customerIds = []) => {
  if (groupId) {
    const group = await CustomerGroup.findById(groupId);
    if (!group) {
      throw httpError(404, "Groupe introuvable.");
    }
  }

  return Customer.updateMany(
    { _id: { $in: customerIds }, deletedAt: null },
    { $set: { groupId: groupId || null } }
  );
};

module.exports = {
  createGroup,
  createManyGroups,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  deleteManyGroups,
  assignCustomersToGroup,
};
