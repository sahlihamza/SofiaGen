const Notification = require("../models/Notification");

const buildFilters = (req) => {
  const filters = { recipientId: req.customer._id, recipientModel: "Customer" };
  const { status, type } = req.query;
  if (status && status !== "all") {
    filters.status = status;
  } else {
    filters.status = { $ne: "archived" };
  }
  if (type) filters.type = type;
  return filters;
};

const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filters = buildFilters(req);

    const [notifications, totalDoc, unreadCount] = await Promise.all([
      Notification.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filters),
      Notification.countDocuments({
        recipientId: req.customer._id,
        recipientModel: "Customer",
        status: "unread",
      }),
    ]);

    res.json({ success: true, notifications, totalDoc, unreadCount, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipientId: req.customer._id,
      recipientModel: "Customer",
      status: "unread",
    });
    res.json({ success: true, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const loadOwnedNotification = async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    res.status(404).json({ success: false, message: "Notification introuvable" });
    return null;
  }
  const isOwner =
    notification.recipientModel === "Customer" &&
    String(notification.recipientId) === String(req.customer._id);
  if (!isOwner) {
    res.status(403).json({ success: false, message: "Accès refusé  cette notification" });
    return null;
  }
  return notification;
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await loadOwnedNotification(req, res);
    if (!notification) return;

    notification.status = "read";
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.customer._id, recipientModel: "Customer", status: "unread" },
      { $set: { status: "read", readAt: new Date() } }
    );
    res.json({ success: true, message: "Toutes les notifications ont t marqués comme lues" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteMyNotification = async (req, res) => {
  try {
    const notification = await loadOwnedNotification(req, res);
    if (!notification) return;

    await notification.deleteOne();

    res.json({ success: true, message: "Notification supprimée" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteMyNotification,
};
