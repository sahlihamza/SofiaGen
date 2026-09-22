const Discount = require("../models/Discount");
const mongoose = require("mongoose");

const getDiscounts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", active = "", couponId = "" } = req.query;
    const skip = (page - 1) * limit;
    const query = {};
    if (search) query.code = { $regex: search, $options: "i" };
    if (active !== "") query.active = active === "true";
    if (couponId) query.couponId = couponId;

    const total = await Discount.countDocuments(query);
    const discounts = await Discount.find(query)
      .populate("couponId", "code title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: discounts,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDiscountByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const discount = await Discount.findOne({ code: code.toUpperCase() }).populate("couponId", "code title");
    if (!discount) {
      return res.status(404).json({ success: false, message: "Discount not found" });
    }
    res.status(200).json({ success: true, data: discount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createDiscount = async (req, res) => {
  try {
    const body = req.body;
    body.code = body.code ? body.code.toUpperCase() : undefined;
    const discount = await Discount.create(body);
    res.status(201).json({ success: true, data: discount });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid discount id" });
    }
    const discount = await Discount.findByIdAndUpdate(id, req.body, { new: true });
    if (!discount) {
      return res.status(404).json({ success: false, message: "Discount not found" });
    }
    res.status(200).json({ success: true, data: discount });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid discount id" });
    }
    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) {
      return res.status(404).json({ success: false, message: "Discount not found" });
    }
    res.status(200).json({ success: true, message: "Discount deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const applyDiscount = async (req, res) => {
  try {
    const { code, amount } = req.body;
    const discount = await Discount.findOne({ code: code.toUpperCase(), active: true });
    if (!discount) {
      return res.status(404).json({ success: false, message: "Discount not found or inactive" });
    }
    const now = new Date();
    if (discount.validFrom > now || discount.validUntil < now) {
      return res.status(400).json({ success: false, message: "Discount is not valid at this time" });
    }
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return res.status(400).json({ success: false, message: "Discount usage limit reached" });
    }
    let discountAmount = discount.discountAmount;
    if (discount.discountType === "percentage") {
      discountAmount = (amount * discount.discountAmount) / 100;
      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
      }
    }
    discount.usedCount += 1;
    await discount.save();

    res.status(200).json({
      success: true,
      discount: {
        code: discount.code,
        discountType: discount.discountType,
        discountAmount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDiscounts,
  getDiscountByCode,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  applyDiscount,
};
