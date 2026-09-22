const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, requirePermission } = require("../middleware/auth");
const testimonialController = require("../controller/testimonialController");

router.get("/", testimonialController.getTestimonials);
router.get("/featured/:storeId", testimonialController.getFeaturedTestimonials);
router.get("/random/:storeId", testimonialController.getRandomTestimonials);
router.get("/stats/:storeId", testimonialController.getTestimonialStats);
router.post("/ai/generate", isAuth, loadUser, requirePermission(getCode("Testimonials", "create")), testimonialController.generateTestimonialAI);
router.get("/:id", testimonialController.getTestimonialById);
router.post("/", isAuth, loadUser, requirePermission(getCode("Testimonials", "create")), testimonialController.createTestimonial);
router.put("/:id", isAuth, loadUser, requirePermission(getCode("Testimonials", "update")), testimonialController.updateTestimonial);
router.delete("/:id", isAuth, loadUser, requirePermission(getCode("Testimonials", "delete")), testimonialController.deleteTestimonial);
router.patch("/:id/status", isAuth, loadUser, requirePermission(getCode("Testimonials", "approve")), testimonialController.patchTestimonialStatus);
router.post("/bulk/delete", isAuth, loadUser, requirePermission(getCode("Testimonials", "delete")), testimonialController.bulkDelete);
router.post("/bulk/status", isAuth, loadUser, requirePermission(getCode("Testimonials", "approve")), testimonialController.bulkStatus);

module.exports = router;
