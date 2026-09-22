const CustomerNote = require("../models/CustomerNote");
const Customer = require("../models/Customer");
// Required so populate("createdBy") can resolve the User model.
require("../models/User");

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const AUTHOR_FIELDS = "name email image";

const loadLiveCustomer = async (customerId) => {
  const customer = await Customer.findOne({ _id: customerId, deletedAt: null });
  if (!customer) {
    throw httpError(404, "Client introuvable.");
  }
  return customer;
};

const createNote = async (data = {}) => {
  if (!data.customerId) {
    throw httpError(400, "customerId est obligatoire.");
  }
  if (!data.note || !data.note.toString().trim()) {
    throw httpError(400, "La note ne peut pas être vide.");
  }

  const customer = await loadLiveCustomer(data.customerId);

  const note = new CustomerNote({
    customerId: customer._id,
    // The note always lives in the same boutique as its customer.
    storeId: customer.storeId,
    note: data.note,
    createdBy: data.createdBy || null,
  });

  await note.save();

  // Mongoose 5: populating a document needs execPopulate(), not just await.
  return note.populate("createdBy", AUTHOR_FIELDS).execPopulate();
};

// The customer's full history, newest first.
const getNotesByCustomer = async (customerId, { page, limit } = {}) => {
  const queryObject = { customerId };

  const pages = Number(page) || 1;
  const limits = Number(limit) || 0;
  const skip = (pages - 1) * limits;

  const totalDoc = await CustomerNote.countDocuments(queryObject);
  const notes = await CustomerNote.find(queryObject)
    .populate("createdBy", AUTHOR_FIELDS)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limits);

  return { notes, totalDoc, limits, pages };
};

const getNoteById = async (id) => {
  return CustomerNote.findById(id).populate("createdBy", AUTHOR_FIELDS);
};

const updateNote = async (id, data = {}) => {
  const note = await CustomerNote.findById(id);
  if (!note) return null;

  if (data.note !== undefined) {
    if (!data.note.toString().trim()) {
      throw httpError(400, "La note ne peut pas être vide.");
    }
    note.note = data.note;
  }

  await note.save();

  return note.populate("createdBy", AUTHOR_FIELDS).execPopulate();
};

const deleteNote = async (id) => {
  const note = await CustomerNote.findById(id);
  if (!note) return null;

  await CustomerNote.deleteOne({ _id: note._id });

  return note;
};

// Called when a customer is permanently erased.
const deleteNotesByCustomer = async (customerId) => {
  return CustomerNote.deleteMany({ customerId });
};

module.exports = {
  createNote,
  getNotesByCustomer,
  getNoteById,
  updateNote,
  deleteNote,
  deleteNotesByCustomer,
};
