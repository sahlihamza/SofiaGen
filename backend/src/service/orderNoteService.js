const OrderNote = require("../models/OrderNote");
const Order = require("../models/Order");
// Required so populate("createdBy") can resolve the User model.
require("../models/User");

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const AUTHOR_FIELDS = "name email image";

const NOTE_TYPES = OrderNote.schema.path("type").enumValues;

const create = async (orderId, { note, type, createdBy, storeId } = {}) => {
  if (!note || !note.toString().trim()) {
    throw httpError(400, "La note ne peut pas être vide.");
  }
  if (type && !NOTE_TYPES.includes(type)) {
    throw httpError(400, "Type de note invalide.");
  }

  // An order note without its order is unreachable, so the order is checked
  // before anything is written.
  // SO-19: this used to check only that the order existed, not that it
  // belonged to the caller's own store  a staff member of one store could
  // attach notes to another store's order.
  const exists = await Order.exists(storeId ? { _id: orderId, storeId } : { _id: orderId });
  if (!exists) {
    throw httpError(404, "Commande introuvable.");
  }

  const created = new OrderNote({
    orderId,
    note,
    type: type || "private",
    createdBy: createdBy || null,
  });

  await created.save();

  // Mongoose 5: populating a document needs execPopulate(), not just await.
  return created.populate("createdBy", AUTHOR_FIELDS).execPopulate();
};

// The notes of one order, newest first  the order the history table shows.
const getByOrderId = (orderId) =>
  OrderNote.find({ orderId })
    .populate("createdBy", AUTHOR_FIELDS)
    .sort({ createdAt: -1, _id: -1 });

module.exports = { create, getByOrderId, NOTE_TYPES };
