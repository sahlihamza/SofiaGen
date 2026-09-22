const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, rateLimiter } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");
const { register, login, googleLogin, refreshToken, logout, forgotPassword, resetPassword, getProfile } = require("../controller/userController");

const authAttemptLimiter = createRateLimiter({ max: 20, windowMinutes: 15, keyBy: "ip" });

router.post("/register", authAttemptLimiter, register);
router.post("/login", authAttemptLimiter, login);
router.post("/google-login", googleLogin);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", rateLimiter(5, 15), forgotPassword);
router.post("/reset-password/:token", authAttemptLimiter, resetPassword);
router.get("/me", isAuth, loadUser, resolveAuthorizationContext, getProfile);

module.exports = router;
