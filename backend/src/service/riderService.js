const Rider = require("../models/Rider");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const { normalizeImagePath } = require("../utils/normalizeImagePath");

class RiderService {
  async riderExists(filter) {
    const rider = await Rider.findOne(filter);
    return !!rider;
  }

  async getAllRiders({ search, status, availability, page, limit, storeId } = {}) {
    const queryObject = { storeId };

    if (search) {
      queryObject.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      queryObject.status = status;
    }

    if (availability) {
      queryObject.availability = availability;
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;

    const totalDoc = await Rider.countDocuments(queryObject);
    const riders = await Rider.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    return { riders, totalDoc, limits, pages };
  }

  async getRiderById(id, storeId) {
    const query = { _id: id };
    if (storeId) query.storeId = storeId;
    return await Rider.findOne(query);
  }

  async addRider(data) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const rider = new Rider({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber,
      image: normalizeImagePath(data.image),
      status: "Active",
      storeId: data.storeId,
    });

    return await rider.save();
  }

  async updateRider(id, data) {
    const updates = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber,
    };

    if (data.image !== undefined) {
      updates.image = normalizeImagePath(data.image);
    }

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(data.password, salt);
    }

    return await Rider.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  async deleteRider(id) {
    return await Rider.findByIdAndDelete(id);
  }

  async toggleRiderStatus(id) {
    const rider = await Rider.findById(id);
    if (!rider) {
      return null;
    }
    rider.status = rider.status === "Active" ? "Inactive" : "Active";
    return await rider.save();
  }

  async getRiderOrders({ riderId, search, page, limit } = {}) {
    const queryObject = { rider: riderId };

    if (search) {
      const orConditions = [
        { "user_info.name": { $regex: search, $options: "i" } },
        { trackingId: { $regex: search, $options: "i" } },
      ];
      const numericSearch = Number(search);
      if (!Number.isNaN(numericSearch)) {
        orConditions.push({ invoice: numericSearch });
      }
      queryObject.$or = orConditions;
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 10;
    const skip = (pages - 1) * limits;

    const totalDoc = await Order.countDocuments(queryObject);
    const orders = await Order.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    return { orders, totalDoc, limits, pages };
  }

  async getStats() {
    const total = await Rider.countDocuments({});
    const active = await Rider.countDocuments({ status: "Active" });
    const onDelivery = await Rider.countDocuments({ availability: " La Livraison" });
    const available = await Rider.countDocuments({ availability: "Disponible" });

    return { total, active, available, onDelivery };
  }
}

module.exports = new RiderService();