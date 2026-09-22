require("dotenv").config();
const stripe = require("stripe");
const Razorpay = require("razorpay");
const MailChecker = require("mailchecker");
// const stripe = require("stripe")(`${process.env.STRIPE_KEY}` || null); /// use hardcoded key if env not work

const mongoose = require("mongoose");

const Order = require("../models/Order");
const Setting = require("../models/Setting");
const { sendEmail } = require("../lib/email-sender/sender");
const { formatAmountForStripe } = require("../lib/stripe/stripe");
const { handleCreateInvoice } = require("../lib/email-sender/create");
const { handleProductQuantity } = require("../lib/stock-controller/others");
const customerInvoiceEmailBody = require("../lib/email-sender/templates/order-to-customer");
const { getDefaultSetting } = require("./settingController");
const couponValidationService = require("../service/couponValidationService");
const couponCalculationService = require("../service/couponCalculationService");
const couponUsageService = require("../service/couponUsageService");
const customerOrderService = require("../service/customerOrderService");
const SoftLimitService = require("../service/SoftLimitService");
const StoreUsageService = require("../service/StoreUsageService");

const addOrder = async (req, res) => {
  try {
    const { couponCode, couponCartItems, ...orderBody } = req.body;

    const orderStoreId = req.currentStoreId;

    let couponId;
    let discountAmount;

    if (orderStoreId) {
      const quotaCheck = await SoftLimitService.checkQuotaAvailable(orderStoreId, "orders", 1);
      if (!quotaCheck.allowed) {
        return res.status(409).json({
          message: `Quota de commandes atteint pour cette boutique (${quotaCheck.used}/${quotaCheck.limit})`,
          code: "QUOTA_EXCEEDED",
        });
      }
    }

    // SFG-73 Phase 6: entirely opt-in  omit couponCode and this behaves
    // exactly like before. `order.cart`'s shape is legacy/storefront-specific
    // and doesn't carry the productId/categoryId/brandId/tagIds the coupon
    // engine's restriction checks need, so the caller sends `couponCartItems`
    // in the engine's canonical shape alongside the order payload. Without
    // it, amount/date/usage-limit/rule-based restrictions still work but
    // product/category/brand/tag restrictions can't be evaluated.
    if (couponCode) {
      const context = {
        storeId: orderStoreId,
        customerId: req.customer._id,
        isGuest: false,
        cartItems: couponCartItems || [],
        cartSubtotal: orderBody.subTotal,
      };

      const validation = await couponValidationService.validateCoupon(couponCode, context);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message, code: validation.code });
      }

      const discount = await couponCalculationService.calculateDiscount(
        validation.coupon,
        context.cartItems,
        context.cartSubtotal
      );
      couponId = validation.coupon._id;
      discountAmount = discount.discount;
    }

    const newOrder = new Order({
      ...orderBody,
      user: req.customer._id,
      storeId: orderStoreId,
      ...(couponId ? { couponId, discountAmount } : {}),
    });
    const order = await newOrder.save();

    if (couponId) {
      await couponUsageService.recordUsage(couponId, req.customer._id, order._id, discountAmount);
    }

    if (orderStoreId) {
      // Non-fatal: usage tracking must never roll back a successful order.
      StoreUsageService.incrementUsage(orderStoreId, "orders", 1).catch(() => {});
    }

    res.status(201).send(order);
    handleProductQuantity(order.cart);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

//create payment intent for stripe
const createPaymentIntent = async (req, res) => {
  const { total: amount, cardInfo: payment_intent, email } = req.body;
  // Validate the amount that was passed from the client.
  if (!(amount >= process.env.MIN_AMOUNT && amount <= process.env.MAX_AMOUNT)) {
    return res.status(500).json({ message: "Invalid amount." });
  }
  const storeSetting = await Setting.findOne({ name: "storeSetting" });
  const stripeSecret =
    storeSetting?.setting?.stripe_secret ||
    getDefaultSetting("storeSetting")?.stripe_secret;
  const stripeInstance = stripe(stripeSecret);
  if (payment_intent.id) {
    try {
      const current_intent = await stripeInstance.paymentIntents.retrieve(
        payment_intent.id
      );
      // If PaymentIntent has been created, just update the amount.
      if (current_intent) {
        const updated_intent = await stripeInstance.paymentIntents.update(
          payment_intent.id,
          {
            amount: formatAmountForStripe(amount, "usd"),
          }
        );
        return res.send(updated_intent);
      }
    } catch (err) {

      if (err.code !== "resource_missing") {
        const errorMessage =
          err instanceof Error ? err.message : "Internal server error";
        return res.status(500).send({ message: errorMessage });
      }
    }
  }
  try {
    // Create PaymentIntent from body params.
    const params = {
      amount: formatAmountForStripe(amount, "usd"),
      currency: "usd",
      description: process.env.STRIPE_PAYMENT_DESCRIPTION || "",
      automatic_payment_methods: {
        enabled: true,
      },
    };
    const payment_intent = await stripeInstance.paymentIntents.create(params);

    res.send(payment_intent);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).send({ message: errorMessage });
  }
};

const createOrderByRazorPay = async (req, res) => {
  try {
    const storeSetting = await Setting.findOne({ name: "storeSetting" });
    const setting = storeSetting?.setting || getDefaultSetting("storeSetting");

    const instance = new Razorpay({
      key_id: setting?.razorpay_id,
      key_secret: setting?.razorpay_secret,
    });

    const options = {
      amount: req.body.amount * 100,
      currency: "INR",
    };
    const order = await instance.orders.create(options);

    if (!order)
      return res.status(500).send({
        message: "Error occurred when creating order!",
      });
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const addRazorpayOrder = async (req, res) => {
  try {
    const storeId = req.currentStoreId;
    const newOrder = new Order({
      ...req.body,
      user: req.customer._id,
    });
    const order = await newOrder.save();
    res.status(201).send(order);
    handleProductQuantity(order.cart);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get all orders user
const getOrderCustomer = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const totalDoc = await Order.countDocuments({ user: req.customer._id });

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
          user: mongoose.Types.ObjectId(req.customer._id),
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

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
          user: mongoose.Types.ObjectId(req.customer._id),
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

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          user: mongoose.Types.ObjectId(req.customer._id),
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

    // today order amount

    // query for orders
    const orders = await Order.find({ user: req.customer._id })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders,
      limits,
      pages,
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      processing:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      delivered:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,

      totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
// Le détail d'une commande du client connecté : lignes, historique de statuts,
// paiement et droits d'action. Une commande qui n'est pas la sienne répond 404
// comme une commande inexistante, pour ne pas trahir qu'elle existe.
const getOrderById = async (req, res) => {
  try {
    const detail = await customerOrderService.getOrderDetail(req.params.id, req.customer);

    if (!detail) {
      return res.status(404).send({ message: "Commande introuvable." });
    }

    return res.send(detail);
  } catch (err) {
    return res.status(500).send({
      message: err.message,
    });
  }
};

const handleCustomerOrderError = (res, err) => {
  if (err instanceof customerOrderService.CustomerOrderError) {
    return res.status(err.status).send({ code: err.code, message: err.message });
  }

  return res.status(500).send({ message: err.message });
};

// Annulation  l'initiative du client, tant que la boutique n'a pas honoré la
// commande. Renvoie le détail  jour, que le front affiche directement.
const cancelOrder = async (req, res) => {
  try {
    const detail = await customerOrderService.cancelOrder(req.params.id, req.customer);

    if (!detail) {
      return res.status(404).send({ message: "Commande introuvable." });
    }

    return res.send(detail);
  } catch (err) {
    return handleCustomerOrderError(res, err);
  }
};

// Remet les articles de la commande dans le panier et répond avec le panier
// recalculé, plus la liste de ce qui n'a pas pu être repris.
const reorder = async (req, res) => {
  try {
    const result = await customerOrderService.reorder(req.params.id, req.customer);

    if (!result) {
      return res.status(404).send({ message: "Commande introuvable." });
    }

    return res.send(result);
  } catch (err) {
    return handleCustomerOrderError(res, err);
  }
};

const sendEmailInvoiceToCustomer = async (req, res) => {
  try {
    const user = req.body.user_info;
    // Validate email using MailChecker
    // Validate email using MailChecker
    if (!MailChecker.isValid(user?.email)) {
      // Return a response indicating invalid email instead of using process.exit
      return res.status(400).send({
        message:
          "Invalid or disposable email address. Please provide a valid email.",
      });
    }
    const pdf = await handleCreateInvoice(req.body, `${req.body.invoice}.pdf`);

    const option = {
      date: req.body.date,
      invoice: req.body.invoice,
      status: req.body.status,
      method: req.body.paymentMethod,
      subTotal: req.body.subTotal,
      total: req.body.total,
      discount: req.body.discount,
      shipping: req.body.shippingCost,
      currency: req.body.company_info.currency,
      company_name: req.body.company_info.company,
      company_address: req.body.company_info.address,
      company_phone: req.body.company_info.phone,
      company_email: req.body.company_info.email,
      company_website: req.body.company_info.website,
      vat_number: req.body?.company_info?.vat_number,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      address: user?.address,
      cart: req.body.cart,
    };

    const body = {
      from: req.body.company_info?.from_email || "sales@sofiagen.com",
      to: user.email,
      subject: `Your Order - ${req.body.invoice} at ${req.body.company_info.company}`,
      html: customerInvoiceEmailBody(option),
      attachments: [
        {
          filename: `${req.body.invoice}.pdf`,
          content: pdf,
        },
      ],
    };
    const message = `Invoice successfully sent to the customer ${user.name}`;
    sendEmail(body, res, message);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addOrder,
  getOrderById,
  getOrderCustomer,
  cancelOrder,
  reorder,
  createPaymentIntent,
  createOrderByRazorPay,
  addRazorpayOrder,
  sendEmailInvoiceToCustomer,
};
