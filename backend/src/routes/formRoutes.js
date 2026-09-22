const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const { isAuth, loadUser, requirePermission, validateStoreAccess } = require("../middleware/auth");
const ctrl = require("../controller/formController");
const { honeypot, submitLimiter, captchaGuard } = require("../middleware/formSecurity");

const router = express.Router();

/**
 * Soumission publique (storefront).
 * Ordre des middlewares : rate-limit -> honeypot -> captcha -> upload -> submit
 */
router.post(
  "/:storeId/submit",
  submitLimiter,
  honeypot,
  captchaGuard,
  ctrl.upload.any(),
  ctrl.submitForm
);

/**
 * Gestion admin des soumissions (protég).
 */
router.get("/submissions", isAuth, loadUser, requirePermission(getCode("Forms", "view")), ctrl.listSubmissions);
router.get("/submissions/export", isAuth, loadUser, requirePermission(getCode("Forms", "export")), ctrl.exportSubmissions);
router.get("/submissions/:id", isAuth, loadUser, requirePermission(getCode("Forms", "view")), ctrl.getSubmission);
router.patch("/submissions/:id", isAuth, loadUser, requirePermission(getCode("Forms", "update")), ctrl.updateSubmissionStatus);
router.delete("/submissions/:id", isAuth, loadUser, requirePermission(getCode("Forms", "delete")), ctrl.deleteSubmission);

/**
 * Réglages formulaires par boutique (SMTP + intégrations + captcha).
 */
router.get("/settings/:storeId", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Forms", "view")), ctrl.getFormSettings);
router.put("/settings/:storeId", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Forms", "update")), ctrl.upsertFormSettings);

module.exports = router;
