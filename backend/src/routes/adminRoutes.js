const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

// Admin routes are currently disabled in the controller layer.
// When the admin controller is restored, uncomment the following code
// and make sure the controller exports all referenced functions.

// const {
//   registerAdmin,
//   loginAdmin,
//   forgetPassword,
//   resetPassword,
//   addStaff,
//   getAllStaff,
//   getStaffById,
//   updateStaff,
//   deleteStaff,
//   updatedStatus,
// } = require("../controller/adminController");
// const { passwordVerificationLimit } = require("../lib/email-sender/sender");

// router.post("/register", registerAdmin);
// router.post("/login", loginAdmin);
// router.put("/forget-password", passwordVerificationLimit, forgetPassword);
// router.put("/reset-password", resetPassword);
// router.post("/add", addStaff);
// router.get("/", getAllStaff);
// router.post("/:id", getStaffById);
// router.put("/:id", updateStaff);
// router.put("/update-status/:id", updatedStatus);
// router.delete("/:id", deleteStaff);

module.exports = router;
