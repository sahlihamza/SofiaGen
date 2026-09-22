const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addGroup,
  addAllGroups,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  deleteManyGroups,
  assignCustomersToGroup,
} = require("../controller/customerGroupController");

// add group
router.post("/add", addGroup);

// add all groups
router.post("/add/all", addAllGroups);

// delete many groups
router.patch("/delete/many", deleteManyGroups);

// get all groups
router.get("/", getAllGroups);

// add group (REST style)
router.post("/", addGroup);

// get group by id
router.get("/:id", getGroupById);

// update group
router.put("/:id", updateGroup);

// assign a selection of customers to the group
router.patch("/:id/customers", assignCustomersToGroup);

// delete group
router.delete("/:id", deleteGroup);

module.exports = router;
