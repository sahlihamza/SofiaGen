const ReturnRequestService = require("../service/ReturnRequestService");

const handleServiceError = (res, err) => {
  if (err.status) {
    return res.status(err.status).json({ success: false, message: err.message, code: err.code });
  }
  return res.status(500).json({ success: false, message: err.message });
};

// Admin  list/manage return requests for a store.
exports.listReturnRequests = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, page, limit } = req.query;
    const result = await ReturnRequestService.list({ storeId, status, page, limit });
    return res.json({ success: true, ...result });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

exports.getReturnRequest = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const returnRequest = await ReturnRequestService.getById(id, storeId);
    return res.json({ success: true, data: returnRequest });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// Admin-side creation (e.g. merchant files a return on the customer's
// behalf over the phone). Customer self-service creation is a separate,
// storefront-facing endpoint with its own auth (loadCustomerOptional).
exports.createReturnRequest = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { orderId, customerId, items } = req.body;
    const returnRequest = await ReturnRequestService.create({ storeId, orderId, customerId, items });
    return res.status(201).json({ success: true, data: returnRequest });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const makeTransitionHandler = (toStatus) => async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const { note, resolution, rejectionReason } = req.body;
    const returnRequest = await ReturnRequestService.transition(id, storeId, toStatus, {
      actorUserId: req.user?._id,
      note,
      resolution,
      rejectionReason,
    });
    return res.json({ success: true, data: returnRequest });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

exports.approveReturnRequest = makeTransitionHandler("approved");
exports.markAwaitingReturn = makeTransitionHandler("awaiting_return");
exports.markReceived = makeTransitionHandler("received");
exports.markRefunded = makeTransitionHandler("refunded");
exports.markExchanged = makeTransitionHandler("exchanged");
exports.rejectReturnRequest = makeTransitionHandler("rejected");

// Storefront  a logged-in customer requesting a return on their own order.
exports.createCustomerReturnRequest = async (req, res) => {
  try {
    const { storeId, orderId, items } = req.body;
    if (!req.customer?._id) {
      return res.status(401).json({ success: false, message: "Customer session required" });
    }
    const returnRequest = await ReturnRequestService.create({
      storeId,
      orderId,
      customerId: req.customer._id,
      items,
    });
    return res.status(201).json({ success: true, data: returnRequest });
  } catch (err) {
    return handleServiceError(res, err);
  }
};
