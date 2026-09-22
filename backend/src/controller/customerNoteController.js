const CustomerNoteService = require("../service/CustomerNoteService");

const addNote = async (req, res) => {
  try {
    const note = await CustomerNoteService.createNote({
      ...req.body,
      // Prefer the authenticated staff member over anything the client sent.
      createdBy: req.user?._id || req.body.createdBy || null,
    });
    res.send({ data: note, message: "Note added successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getNotesByCustomer = async (req, res) => {
  try {
    const result = await CustomerNoteService.getNotesByCustomer(
      req.params.customerId,
      req.query
    );
    res.send(result);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await CustomerNoteService.getNoteById(req.params.id);

    if (!note) {
      return res.status(404).send({ message: "Note Not Found!" });
    }

    res.send(note);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const updateNote = async (req, res) => {
  try {
    const note = await CustomerNoteService.updateNote(req.params.id, req.body);

    if (!note) {
      return res.status(404).send({ message: "Note Not Found!" });
    }

    res.send({ data: note, message: "Note updated successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await CustomerNoteService.deleteNote(req.params.id);

    if (!note) {
      return res.status(404).send({ message: "Note Not Found!" });
    }

    res.send({ message: "Note Deleted Successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addNote,
  getNotesByCustomer,
  getNoteById,
  updateNote,
  deleteNote,
};
