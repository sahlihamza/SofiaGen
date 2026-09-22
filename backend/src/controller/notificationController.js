const Notification = require("../models/Notification");
const NotificationLog = require("../models/NotificationLog");

const buildListFilters = (req) => {
  const filters = { recipientId: req.user._id };

  // Personal notifications aren't scoped to the currently active company/store
  //  a user should see all notifications addressed to them regardless of
  // which store tab they're on. `req.query.storeId` gets silently populated
  // by the isAuth middleware from the "company" header for store-scoped
  // resources, so the explicit UI filter uses a distinct param name here to
  // avoid picking up that auto-injected value.
  const { status, category, type, priority, filterStoreId, dateFrom, dateTo } = req.query;

  if (status && status !== "all") {
    filters.status = status;
  } else {
    filters.status = { $ne: "archived" };
  }
  if (category) filters.category = category;
  if (type) filters.type = type;
  if (priority) filters.priority = priority;
  if (filterStoreId) filters.storeId = filterStoreId;
  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filters.createdAt.$lte = new Date(dateTo);
  }

  return filters;
};

const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filters = buildListFilters(req);

    const [notifications, totalDoc, unreadCount] = await Promise.all([
      Notification.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filters),
      Notification.countDocuments({ recipientId: req.user._id, status: "unread" }),
    ]);

    res.json({ success: true, notifications, totalDoc, unreadCount, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
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
  const isOwner = String(notification.recipientId) === String(req.user._id);
  if (!isOwner) {
    res.status(403).json({ success: false, message: "Accès refusé  cette notification" });
    return null;
  }
  return notification;
};

const getNotificationDetail = async (req, res) => {
  try {
    const notification = await loadOwnedNotification(req, res);
    if (!notification) return;
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await loadOwnedNotification(req, res);
    if (!notification) return;

    notification.status = "read";
    notification.readAt = new Date();
    await notification.save();

    await NotificationLog.create({
      action: "notification.read",
      notificationId: notification._id,
      actorId: req.user._id,
      storeId: notification.storeId,
    }).catch(() => {});

    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const filters = { recipientId: req.user._id, status: "unread" };
    if (req.query.storeId) filters.storeId = req.query.storeId;

    await Notification.updateMany(filters, { $set: { status: "read", readAt: new Date() } });

    res.json({ success: true, message: "Toutes les notifications ont t marqués comme lues" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const archiveNotification = async (req, res) => {
  try {
    const notification = await loadOwnedNotification(req, res);
    if (!notification) return;

    notification.status = "archived";
    await notification.save();

    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteMyNotification = async (req, res) => {
  try {
    const notification = await loadOwnedNotification(req, res);
    if (!notification) return;

    await notification.deleteOne();

    await NotificationLog.create({
      action: "notification.deleted",
      notificationId: notification._id,
      actorId: req.user._id,
      storeId: notification.storeId,
    }).catch(() => {});

    res.json({ success: true, message: "Notification supprimée" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlatformNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.storeId) filters.storeId = req.query.storeId;
    if (req.query.type) filters.type = req.query.type;
    if (req.query.priority) filters.priority = req.query.priority;

    const [notifications, totalDoc] = await Promise.all([
      Notification.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filters),
    ]);

    res.json({ success: true, notifications, totalDoc, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addNotification = async (req, res) => {
  try {
    if (req.body.productId) {
      const isAdded = await Notification.findOne({
        productId: req.body.productId,
      });
      if (isAdded) {
        return res.end();
      } else {
        const newNotification = new Notification(req.body);
        await newNotification.save();
        res.status(200).send({
          message: "Notification save successfully!",
        });
      }
    } else {
      const newNotification = new Notification(req.body);
      await newNotification.save();
      res.status(200).send({
        message: "Notification save successfully!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllNotification = async (req, res) => {
  try {
    const { page } = req.query;

    const pages = page;
    const limits = 5;
    const skip = (pages - 1) * limits;
    // Notifications with a customerId target the storefront customer (review
    // approved, store replied)  the staff inbox must never show those.
    const staffOnly = { customerId: null };
    const totalDoc = await Notification.countDocuments(staffOnly);
    const totalUnreadDoc = await Notification.countDocuments({
      ...staffOnly,
      status: "unread",
    });
    const notifications = await Notification.find({
      ...staffOnly,
      status: { $in: ["read", "unread"] },
    })
      .sort({
        _id: -1,
      })
      .skip(skip)
      .limit(limits);

    res.send({ totalDoc, totalUnreadDoc, notifications });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStatusNotification = async (req, res) => {
  try {
    const newStatus = req.body.status;

    await Notification.findByIdAndUpdate(
      { _id: req.params.id },
      {
        $set: {
          status: newStatus,
        },
      }
    );
    const totalDoc = await Notification.countDocuments({ status: "unread" });

    res.send({
      totalDoc,
      message: `Notification Read!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateManyStatusNotification = async (req, res) => {
  try {
    await Notification.updateMany(
      { _id: { $in: req.body.ids } },
      {
        $set: {
          status: req.body.status,
        },
      },
      {
        multi: true,
      }
    );

    res.send({
      message: "Notification update successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteNotificationById = async (req, res) => {
  try {
    Notification.deleteOne({ _id: req.params.id }, (err) => {
      if (err) {
        res.status(500).send({
          message: err.message,
        });
      } else {
        res.send({
          message: "Notification deleted successfully!",
        });
      }
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteNotificationByProductId = async (req, res) => {
  try {
    Notification.deleteOne({ productId: req.params.id }, (err) => {
      if (err) {
        res.status(500).send({
          message: err.message,
        });
      } else {
        res.send({
          message: "Notification deleted successfully!",
        });
      }
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyNotification = async (req, res) => {
  try {
    await Notification.deleteMany({ _id: req.body.ids });

    res.send({
      message: `Notification Delete Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getAllNotification,
  addNotification,
  updateStatusNotification,
  deleteNotificationById,
  deleteNotificationByProductId,
  updateManyStatusNotification,
  deleteManyNotification,
  getMyNotifications,
  getUnreadCount,
  getNotificationDetail,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  deleteMyNotification,
  getPlatformNotifications,
};
