const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const invoiceController = require("../controller/invoiceController");

/**
 * @swagger
 * /api/platform/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId, subscriptionId, planId, items]
 *             properties:
 *               storeId:
 *                 type: string
 *               subscriptionId:
 *                 type: string
 *               planId:
 *                 type: string
 *               items:
 *                 type: array
 *               discountPercent:
 *                 type: number
 *               taxRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Invoice created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post("/", isAuth, loadUser, resolveAuthorizationContext, invoiceController.createInvoice);

/**
 * @swagger
 * /api/platform/invoices:
 *   get:
 *     summary: Get all invoices with filters
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, paid, overdue, canceled]
 *     responses:
 *       200:
 *         description: Paginated invoices list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get("/", isAuth, loadUser, resolveAuthorizationContext, invoiceController.getInvoices);

router.get("/me", isAuth, loadUser, resolveAuthorizationContext, invoiceController.getInvoicesByStore);

router.get("/store/:storeId", isAuth, loadUser, resolveAuthorizationContext, invoiceController.getInvoicesByStore);

/**
 * @swagger
 * /api/platform/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/:id", isAuth, loadUser, resolveAuthorizationContext, invoiceController.getInvoiceById);

/**
 * @swagger
 * /api/platform/invoices/{id}:
 *   put:
 *     summary: Update invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put("/:id", isAuth, loadUser, resolveAuthorizationContext, invoiceController.updateInvoice);

/**
 * @swagger
 * /api/platform/invoices/{invoiceId}/link-payment:
 *   post:
 *     summary: Link payment to invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment linked to invoice
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post("/:invoiceId/link-payment", isAuth, loadUser, resolveAuthorizationContext, invoiceController.linkPaymentToInvoice);

router.get("/:id/pdf", isAuth, loadUser, resolveAuthorizationContext, invoiceController.generateInvoicePDF);

const InvoiceOps = require("../service/platformInvoiceOpsService");

const invoiceOpsError = (res, err) => {
  if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, code: err.code, message: err.message });
  if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, code: err.code, message: err.message });
  if (err.code === "CONFLICT") return res.status(409).json({ success: false, code: err.code, message: err.message });
  return res.status(500).json({ success: false, message: err.message });
};

router.post(
  "/:id/mark-paid",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Invoices", "update")),
  async (req, res) => {
    try {
      const invoice = await InvoiceOps.markPaid(req.params.id, {
        reason: req.body?.reason,
        paymentId: req.body?.paymentId,
        actorId: req.user?._id || null,
      });
      return res.status(200).json({ success: true, message: "Facture marquee payee", data: invoice });
    } catch (err) {
      return invoiceOpsError(res, err);
    }
  }
);

router.post(
  "/:id/void",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Invoices", "update")),
  async (req, res) => {
    try {
      const invoice = await InvoiceOps.voidInvoice(req.params.id, {
        reason: req.body?.reason,
        actorId: req.user?._id || null,
      });
      return res.status(200).json({ success: true, message: "Facture annulee", data: invoice });
    } catch (err) {
      return invoiceOpsError(res, err);
    }
  }
);

module.exports = router;
