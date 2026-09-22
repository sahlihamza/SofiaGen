const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const GeneralSettings = require("../models/GeneralSettings");
const AuditService = require("../service/AuditService");
const { formatMoney } = require("../utils/formatMoney");
const orderStatusHistoryService = require("../service/orderStatusHistoryService");
const orderItemService = require("../service/orderItemService");
const orderNoteService = require("../service/orderNoteService");
const orderEditService = require("../service/orderEditService");

const ORDER_STATUSES = Order.schema.path("status").enumValues;

const buildOrderQuery = ({ storeId, status, customerName, day, startDate, endDate, method }) => {
  const queryObject = {};

  if (storeId) {
    queryObject.storeId = storeId;
  }

  if (!status) {
    queryObject.$or = [
      { status: { $regex: "Pending", $options: "i" } },
      { status: { $regex: "Processing", $options: "i" } },
      { status: { $regex: "Delivered", $options: "i" } },
      { status: { $regex: "Cancel", $options: "i" } },
    ];
  }
};

// An order placed before order_items existed only has its embedded `cart`, so
// the edit screen falls back to it  same fields, read off the shape the
// checkout writes.
const itemsFromCart = (order) =>
  (order.cart || []).map((line) => ({
    productId: line.productId || line.id || null,
    variationId: line.variationId || null,
    productName: line.title || "",
    sku: line.sku || "",
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.price) || 0,
    discount: 0,
    tax: 0,
    total: Number(line.itemTotal) || 0,
  }));

// Everything the order screen needs, in one response: the order, its lines, the
// status timeline and the back-office notes.
const buildOrderPayload = async (order) => {
  const [items, statusHistory, notes] = await Promise.all([
    orderItemService.getByOrderId(order._id),
    orderStatusHistoryService.getByOrderId(order._id),
    orderNoteService.getByOrderId(order._id),
  ]);

  return {
    ...order.toJSON(),
    items: items.length > 0 ? items.map((item) => item.toJSON()) : itemsFromCart(order),
    statusHistory,
    // Not `notes`: that field is already taken by the free-text note the
    // customer left at checkout, which the invoice prints.
    orderNotes: notes,
  };
};

// Columns the back-office order list can be sorted on, mapped to the document
// field behind them. Anything else falls back to "most recently touched".
const ORDER_SORT_FIELDS = {
  invoice: "invoice",
  date: "createdAt",
  total: "total",
};
const { emitEvent } = require("../lib/eventBus");

const getAllOrders = async (req, res) => {
  const {
    day,
    status,
    page,
    limit,
    method,
    endDate,
    // download,
    // sellFrom,
    startDate,
    customerName,
    sortBy,
    sortOrder,
  } = req.query;

  //  day count
  let date = new Date();
  const today = date.toString();
  date.setDate(date.getDate() - Number(day));
  const dateTime = date.toString();

  const beforeToday = new Date();
  beforeToday.setDate(beforeToday.getDate() - 1);
  // const before_today = beforeToday.toString();

  const startDateData = new Date(startDate);
  startDateData.setDate(startDateData.getDate());
  const start_date = startDateData.toString();

  const queryObject = {};

  // SO-08: storeId must come only from the authenticated context, never the
  // caller-supplied query string  req.query.storeId is not proof of access.
  const storeId = req.authContext?.storeId || req.currentStoreId;
  if (storeId) {
    queryObject.storeId = storeId;
  } else {
    return res.send({ orders: [], limits: Number(limit) || 0, pages: Number(page) || 1, totalDoc: 0, methodTotals: [] });
  }

  // No status filter means every order. It used to mean "one of the four the
  // model knew about", which silently hid an order the moment a fifth status
  // was added  and the order list is the one screen that must never lose one.

  if (customerName) {
    // One search box in the back-office: order number, customer name or email.
    queryObject.$or = [
      { "user_info.name": { $regex: `${customerName}`, $options: "i" } },
      { "user_info.email": { $regex: `${customerName}`, $options: "i" } },
      { invoice: { $regex: `${customerName}`, $options: "i" } },
    ];
  }

  if (day) {
    queryObject.createdAt = { $gte: dateTime, $lte: today };
  }

  if (status) {
    queryObject.status = { $regex: `${status}`, $options: "i" };
  }

  if (startDate && endDate) {
    queryObject.updatedAt = {
      $gt: start_date,
      $lt: endDate,
    };
  }
  if (method) {
    queryObject.paymentMethod = { $regex: `${method}`, $options: "i" };
  }

  const pages = Number(page) || 1;
  const limits = Number(limit);
  const skip = (pages - 1) * limits;

  const sortField = ORDER_SORT_FIELDS[sortBy] || "updatedAt";
  const sortStage = { [sortField]: sortOrder === "asc" ? 1 : -1 };
  // Orders share an invoice number only in legacy data, and equal totals are
  // common  a second key keeps paging stable when the first one ties.
  if (sortField !== "updatedAt") sortStage.updatedAt = -1;

  try {
    // total orders count
    const totalDoc = await Order.countDocuments(queryObject);
    const orders = await Order.find(queryObject)
      .select(
        "_id invoice orderNumber paymentMethod paymentStatus subTotal total user_info billing_info discount shippingCost status createdAt updatedAt"
      )
      .sort(sortStage)
      .skip(skip)
      .limit(limits);

    let methodTotals = [];
    if (startDate && endDate) {
      const filteredOrders = await Order.find(queryObject, {
        _id: 1,
        // subTotal: 1,
        total: 1,

        paymentMethod: 1,
        // createdAt: 1,
        updatedAt: 1,
      }).sort({ updatedAt: -1 });
      for (const order of filteredOrders) {
        const { paymentMethod, total } = order;
        const existPayment = methodTotals.find(
          (item) => item.method === paymentMethod
        );

        if (existPayment) {
          existPayment.total += total;
        } else {
          methodTotals.push({
            method: paymentMethod,
            total: total,
          });
        }
      }
    }

    res.send({
      orders,
      limits,
      pages,
      totalDoc,
      methodTotals,
      // orderOverview,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderCustomer = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id, storeId: req.currentStoreId }).sort({ _id: -1 });
    res.send(orders);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const createCheckoutOrder = async (req, res) => {
  try {
    const { sessionId, customerId, shippingAddress, paymentMethod = "cash" } = req.body;

    if (!sessionId) {
      return res.status(400).send({ message: "sessionId is required" });
    }

    const cart = await Cart.findOne({ sessionId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).send({ message: "Cart is empty" });
    }

    const subTotal = cart.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
    const shippingCost = 0;
    const discount = 0;
    const total = subTotal + shippingCost - discount;

    const orderPayload = {
      storeId: cart.storeId,
      user: customerId || req.user?._id || new mongoose.Types.ObjectId(),
      cart: cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
      })),
      user_info: {
        name: shippingAddress?.name || "",
        email: shippingAddress?.email || "",
        contact: shippingAddress?.contact || "",
        address: shippingAddress?.address || "",
        city: shippingAddress?.city || "",
        country: shippingAddress?.country || "",
        zipCode: shippingAddress?.zipCode || "",
      },
      subTotal,
      shippingCost,
      discount,
      total,
      paymentMethod,
      status: "Pending",
      cardInfo: {
        note: shippingAddress?.note || "",
      },
    };

    const order = await new Order(orderPayload).save();
    await Cart.deleteOne({ _id: cart._id });

    AuditService.logAction({
      actorType: "system",
      actorId: req.userId,
      module: "order",
      action: "create",
      summary: `Order ${order.orderNumber || order.invoice || order._id} created`,
      entityType: "order",
      entityId: order._id,
      storeId: order.storeId,
      newValue: { total: order.total, status: order.status, paymentMethod: order.paymentMethod },
      requestId: req.requestId,
    }).catch(() => {});

    emitEvent("order.created", {
      storeId: order.storeId,
      entityId: order._id,
      userId: order.user,
      metadata: { orderNumber: order.orderNumber || order.invoice || String(order._id), total: order.total },
      actionUrl: `/order/${order._id}`,
    });

    return res.status(201).send(order);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const storeId = req.authContext?.storeId || req.currentStoreId;
    const order = await Order.findOne(storeId ? { _id: req.params.id, storeId } : { _id: req.params.id });

    if (!order) {
      return res.status(404).send({ message: "Commande introuvable." });
    }

    res.send(await buildOrderPayload(order));
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * The two writes the order screen performs, on one route.
 *
 * A status change and a detail edit are independent  the screen has a button
 * for each  and a request carries one or the other. Sending `items` is what
 * asks for the lines and the amounts to be rewritten; sending `status` is what
 * moves the order along. Both may travel together, neither is required.
 */
const updateOrder = async (req, res) => {
  const { status: newStatus, items } = req.body;

  try {
    // SO-19: same missing check as getOrderById  see comment there.
    // Confirmed live: a store's own staff could set ANY other store's
    // order status (tested with a real cross-store "Cancel").
    const updateStoreId = req.authContext?.storeId || req.currentStoreId;
    const order = await Order.findOne(updateStoreId ? { _id: req.params.id, storeId: updateStoreId } : { _id: req.params.id });

    if (!order) {
      return res.status(404).send({ message: "Commande introuvable." });
    }

    if (newStatus !== undefined && !ORDER_STATUSES.includes(newStatus)) {
      return res.status(400).send({ message: "Statut de commande inconnu." });
    }

    // The lines and every amount they imply. Throws a 4xx-carrying error on
    // anything that would leave the order incoherent, before a single write.
    let editedItems = null;
    if (items !== undefined) {
      editedItems = orderEditService.applyEdit(order, req.body).items;
    }

    const statusChanged = newStatus !== undefined && newStatus !== order.status;

    if (editedItems) {
      if (newStatus !== undefined) order.status = newStatus;
      await order.save();
      await orderEditService.replaceItems(order._id, editedItems);
    } else if (statusChanged) {
      // Moving an order along stays a targeted write: it must not fail on a
      // legacy document that no longer satisfies the current schema.
      await Order.updateOne({ _id: order._id }, { $set: { status: newStatus } });
      order.status = newStatus;
    }
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status: newStatus } },
      { new: true }
    ).select("storeId status invoice");

    // Who moved the order, when and why. `isAuth` puts the id from the token on
    // the request (this route doesn't load the whole user). Only a real
    // transition is recorded  re-saving the details is not one.
    if (statusChanged) {
      await orderStatusHistoryService.record(order._id, newStatus, {
        comment: req.body.comment,
        changedBy: req.userId,
      });
    }

    // Drives both the order.updated notification (already configured in
    // NotificationEventHandler but never fired for status changes before)
    // and dashboard cache invalidation (SO-07)  nothing previously emitted
    // on a status change, so both were silently stale until the next
    // manual refresh/cache expiry.
    if (updated?.storeId) {
      const eventName = newStatus === "Cancel"
        ? "order.cancelled"
        : newStatus === "Delivered"
          ? "order.completed"
          : "order.updated";
      emitEvent(eventName, {
        storeId: updated.storeId,
        entityId: updated._id,
        metadata: { status: newStatus },
        actionUrl: `/order/${updated._id}`,
      });
    }

    res.status(200).send({
      message: "Order Updated Successfully!",
      order: await buildOrderPayload(order),
    });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const addOrderNote = async (req, res) => {
  try {
    const note = await orderNoteService.create(req.params.id, {
      note: req.body.note,
      type: req.body.type,
      createdBy: req.userId,
      storeId: req.authContext?.storeId || req.currentStoreId,
    });

    res.status(201).send({
      message: "Note ajouté avec succès !",
      note,
    });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const deleteOrder = (req, res) => {
  Order.deleteOne({ _id: req.params.id, storeId: req.currentStoreId }, (err) => {
    if (err) {
      res.status(500).send({
        message: err.message,
      });
    } else {
      res.status(200).send({
        message: "Order Deleted Successfully!",
      });
    }
  });
};

// get dashboard recent order
const getDashboardRecentOrder = async (req, res) => {
  try {

    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    // Every order, whatever its status  see getAllOrders.
    // SO-08: req.query.storeId is client-controlled and must never be
    // trusted directly  authContext.storeId is resolved from the
    // authenticated session (company header / JWT), never the caller's own
    // say-so. Omitting it must never silently mean "every store's orders".
    const queryObject = {};
    const storeId = req.authContext?.storeId || req.currentStoreId;
    if (storeId) {
      queryObject.storeId = storeId;
    } else {
      return res.send({ orders: [], page, limit, totalOrder: 0 });
    }

    const totalDoc = await Order.countDocuments(queryObject);

    // query for orders
    const orders = await Order.find(queryObject)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders: orders,
      page: page,
      limit: limit,
      totalOrder: totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get dashboard count
const getDashboardCount = async (req, res) => {
  try {
    // SO-08: never trust req.query.storeId directly.
    const storeId = req.authContext?.storeId || req.currentStoreId;
    if (!storeId) {
      return res.send({
        totalOrder: 0,
        totalPendingOrder: 0,
        totalProcessingOrder: 0,
        totalDeliveredOrder: 0,
      });
    }
    const matchStore = { storeId };

    const totalDoc = await Order.countDocuments(matchStore);

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          ...matchStore,
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total processing order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          ...matchStore,
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          ...matchStore,
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    res.send({
      totalOrder: totalDoc,
      totalPendingOrder: totalPendingOrder[0] || 0,
      totalProcessingOrder: totalProcessingOrder[0]?.count || 0,
      totalDeliveredOrder: totalDeliveredOrder[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardAmount = async (req, res) => {
  let week = new Date();
  week.setDate(week.getDate() - 10);

  const currentDate = new Date();
  currentDate.setDate(1); // Set the date to the first day of the current month
  currentDate.setHours(0, 0, 0, 0); // Set the time to midnight

  const lastMonthStartDate = new Date(currentDate); // Copy the current date
  lastMonthStartDate.setMonth(currentDate.getMonth() - 1); // Subtract one month

  let lastMonthEndDate = new Date(currentDate); // Copy the current date
  lastMonthEndDate.setDate(0); // Set the date to the last day of the previous month
  lastMonthEndDate.setHours(23, 59, 59, 999); // Set the time to the end of the day

  try {
    // SO-08: never trust req.query.storeId directly.
    const storeId = req.authContext?.storeId || req.currentStoreId;
    if (!storeId) {
      return res.send({
        totalAmount: 0,
        thisMonthlyOrderAmount: 0,
        lastMonthOrderAmount: 0,
        ordersData: [],
      });
    }
    const matchStore = { storeId };

    const storeSettings = await GeneralSettings.findOne({
      storeId,
    }).populate("currencyId");

    // total order amount
    const totalAmount = await Order.aggregate([
      { $match: matchStore },
      {
        $match: { ...matchStore },
      },
      {
        $group: {
          _id: null,
          tAmount: {
            $sum: "$total",
          },
        },
      },
    ]);
    const thisMonthOrderAmount = await Order.aggregate([
      {
        $match: { ...matchStore },
      },
      {
        $project: {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          total: 1,
          subTotal: 1,
          discount: 1,
          updatedAt: 1,
          createdAt: 1,
          status: 1,
        },
      },
      {
        $match: {
          ...matchStore,
          $or: [{ status: { $regex: "Delivered", $options: "i" } }],
          year: { $eq: new Date().getFullYear() },
          month: { $eq: new Date().getMonth() + 1 },
          // $expr: {
          //   $eq: [{ $month: "$updatedAt" }, { $month: new Date() }],
          // },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$updatedAt",
            },
          },
          total: {
            $sum: "$total",
          },
          subTotal: {
            $sum: "$subTotal",
          },

          discount: {
            $sum: "$discount",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    const lastMonthOrderAmount = await Order.aggregate([
      {
        $match: { ...matchStore },
      },
      {
        $project: {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          total: 1,
          subTotal: 1,
          discount: 1,
          updatedAt: 1,
          createdAt: 1,
          status: 1,
        },
      },
      {
        $match: {
          ...matchStore,
          $or: [{ status: { $regex: "Delivered", $options: "i" } }],
          updatedAt: { $gt: lastMonthStartDate, $lt: lastMonthEndDate },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$updatedAt",
            },
          },
          total: {
            $sum: "$total",
          },
          subTotal: {
            $sum: "$subTotal",
          },

          discount: {
            $sum: "$discount",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    // order list last 10 days
    const orderFilteringData = await Order.find(
      {
        ...matchStore,
        $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
        updatedAt: {
          $gte: week,
        },
      },

      {
        paymentMethod: 1,
        paymentDetails: 1,
        total: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    );

    res.send({
      totalAmount:
        totalAmount.length === 0
          ? 0
          : formatMoney(Number.parseFloat(totalAmount[0].tAmount), storeSettings?.currencyId),
      thisMonthlyOrderAmount: thisMonthOrderAmount[0]?.total,
      lastMonthOrderAmount: lastMonthOrderAmount[0]?.total,
      ordersData: orderFilteringData,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getBestSellerProductChart = async (req, res) => {
  try {
    // SO-08: never trust req.query.storeId directly.
    const storeId = req.authContext?.storeId || req.currentStoreId;
    if (!storeId) {
      return res.send({ totalDoc: 0, bestSellingProduct: [] });
    }
    const matchStore = { storeId };

    const totalDoc = await Order.countDocuments(matchStore);
    const bestSellingProduct = await Order.aggregate([
      { $match: matchStore },
      {
        $match: {
          ...matchStore,
        },
      },
      {
        $unwind: "$cart",
      },
      {
        $group: {
          _id: "$cart.title",

          count: {
            $sum: "$cart.quantity",
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: 4,
      },
    ]);

    res.send({
      totalDoc,
      bestSellingProduct,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardOrders = async (req, res) => {
  const { page, limit } = req.query;

  const pages = Number(page) || 1;
  const limits = Number(limit) || 8;
  const skip = (pages - 1) * limits;

  let week = new Date();
  week.setDate(week.getDate() - 10);

  const start = new Date().toDateString();

  // (startDate = '12:00'),
  //   (endDate = '23:59'),

  try {
    // SO-08: never trust req.query.storeId directly.
    const storeId = req.authContext?.storeId || req.currentStoreId;
    if (!storeId) {
      return res.send({
        orders: [],
        totalDoc: 0,
        totalAmount: 0,
        todayOrder: [],
        totalAmountOfThisMonth: 0,
        totalPendingOrder: 0,
        totalProcessingOrder: 0,
      });
    }
    const matchStore = { storeId };

    const totalDoc = await Order.countDocuments(matchStore);
    const storeSettings = await GeneralSettings.findOne({
      storeId,
    }).populate("currencyId");

    const orders = await Order.find(matchStore)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    const totalAmount = await Order.aggregate([
      { $match: matchStore },
      {
        $group: {
          _id: null,
          tAmount: { $sum: "$total" },
        },
      },
    ]);

    const todayOrder = await Order.find({ ...matchStore, createdAt: { $gte: start } });

    const totalAmountOfThisMonth = await Order.aggregate([
      { $match: matchStore },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 1 },
    ]);

    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          ...matchStore,
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          ...matchStore,
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          ...matchStore,
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const weeklySaleReport = await Order.find({
      ...matchStore,
      $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
      createdAt: {
        $gte: week,
      },
    });

    res.send({
      totalOrder: totalDoc,
      totalAmount:
        totalAmount.length === 0
          ? 0
          : formatMoney(Number.parseFloat(totalAmount[0].tAmount), storeSettings?.currencyId),
      todayOrder: todayOrder,
      totalAmountOfThisMonth:
        totalAmountOfThisMonth.length === 0
          ? 0
          : formatMoney(Number.parseFloat(totalAmountOfThisMonth[0].total), storeSettings?.currencyId),
      totalPendingOrder:
        totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0],
      totalProcessingOrder:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      totalDeliveredOrder:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,
      orders,
      weeklySaleReport,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrderCustomer,
  updateOrder,
  addOrderNote,
  deleteOrder,
  getBestSellerProductChart,
  getDashboardOrders,
  getDashboardRecentOrder,
  getDashboardCount,
  getDashboardAmount,
  createCheckoutOrder,
};






