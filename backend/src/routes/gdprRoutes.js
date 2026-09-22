const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  exportCustomerData,
  deleteCustomerData,
  anonymizeCustomerData,
  listRequests,
} = require("../controller/gdprController");

router.post("/:storeId/export", exportCustomerData);
router.post("/:storeId/delete", deleteCustomerData);
router.post("/:storeId/anonymize", anonymizeCustomerData);
router.get("/:storeId/requests", listRequests);

module.exports = router;
