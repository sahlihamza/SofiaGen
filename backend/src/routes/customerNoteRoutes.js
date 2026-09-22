const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addNote,
  getNotesByCustomer,
  getNoteById,
  updateNote,
  deleteNote,
} = require("../controller/customerNoteController");

// add note
router.post("/add", addNote);

// add note (REST style)
router.post("/", addNote);

// full history of a customer, newest first
router.get("/customer/:customerId", getNotesByCustomer);

// get note by id
router.get("/:id", getNoteById);

// update note
router.put("/:id", updateNote);

// delete note
router.delete("/:id", deleteNote);

module.exports = router;
