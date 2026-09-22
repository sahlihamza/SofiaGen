const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { getCountries, getCountryById } = require("../controller/countryController");

router.get("/", getCountries);
router.get("/:id", getCountryById);

module.exports = router;
