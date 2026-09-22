const Driver = require('../models/Driver');
const User = require('../models/User');
const auditLogService = require('./auditLogService');
const logger = require('../config/logger');

class DriverService {
  /**
   * Create a new driver
   */
  static async createDriver(driverData) {
    const { userId, storeId, platformScope, phone, vehicleType, vehiclePlate, zones } = driverData;

    // Verify user exists and has driver type
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const driver = await Driver.create({
      userId,
      storeId: platformScope ? null : storeId,
      platformScope,
      phone,
      vehicleType,
      vehiclePlate,
      zones,
      status: 'offline',
    });

    logger.info(`Driver created: ${driver._id} for user ${userId}`);

    return driver;
  }

  /**
   * Get driver by ID
   */
  static async getDriver(driverId) {
    const driver = await Driver.findById(driverId)
      .populate('userId', 'name email phone')
      .populate('storeId', 'name')
      .populate('zones', 'name');

    if (!driver) throw new Error('Driver not found');
    return driver;
  }

  /**
   * Get drivers for store
   */
  static async getDriversByStore(storeId) {
    return Driver.find({ storeId })
      .populate('userId', 'name email phone')
      .populate('zones', 'name');
  }

  /**
   * Get available drivers in zones (for assignment)
   */
  static async getAvailableDriversForZones(zones, storeId) {
    return Driver.find({
      storeId,
      status: 'available',
      zones: { $in: zones },
    }).populate('userId', 'name phone');
  }

  /**
   * Change driver availability status
   */
  static async changeAvailability(driverId, newStatus, storeId) {
    if (!['available', 'busy', 'offline'].includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { status: newStatus },
      { new: true }
    );

    if (!driver) throw new Error('Driver not found');

    // Audit log
    await auditLogService.log({
      storeId,
      action: 'driver_status_changed',
      entityType: 'Driver',
      entityId: driverId,
      summary: `Driver ${driver.userId} status changed to ${newStatus}`,
      metadata: {
        driverId,
        oldStatus: driver.status,
        newStatus,
      },
      actor: null,
    });

    return driver;
  }

  /**
   * Suspend driver
   */
  static async suspendDriver(driverId, reason, storeId) {
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        status: 'suspended',
        suspensionReason: reason,
        suspendedAt: new Date(),
      },
      { new: true }
    );

    if (!driver) throw new Error('Driver not found');

    // Audit log
    await auditLogService.log({
      storeId,
      action: 'driver_suspended',
      entityType: 'Driver',
      entityId: driverId,
      summary: `Driver ${driver.userId} suspended: ${reason}`,
      metadata: {
        driverId,
        reason,
      },
      actor: null,
    });

    return driver;
  }

  /**
   * Update driver performance metrics
   */
  static async updatePerformanceMetrics(driverId, deliveryOutcome) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error('Driver not found');

    driver.totalDeliveries += 1;

    if (deliveryOutcome === 'success') {
      driver.successfulDeliveries += 1;
    } else if (deliveryOutcome === 'failed') {
      driver.failedDeliveries += 1;
    }

    // Calculate score: (successful / total) * 100
    if (driver.totalDeliveries > 0) {
      driver.performanceScore = Math.round((driver.successfulDeliveries / driver.totalDeliveries) * 100);
    }

    await driver.save();
    return driver;
  }

  /**
   * Update driver location
   */
  static async updateLocation(driverId, latitude, longitude) {
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
          lastUpdatedAt: new Date(),
        },
      },
      { new: true }
    );

    return driver;
  }

  /**
   * Update driver document
   */
  static async uploadDocument(driverId, documentType, url, expiresAt) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error('Driver not found');

    // Remove existing document of this type
    driver.documents = driver.documents.filter(d => d.type !== documentType);

    // Add new document
    driver.documents.push({
      type: documentType,
      url,
      expiresAt,
    });

    await driver.save();
    return driver;
  }

  /**
   * Verify document
   */
  static async verifyDocument(driverId, documentType) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error('Driver not found');

    const doc = driver.documents.find(d => d.type === documentType);
    if (!doc) throw new Error('Document not found');

    doc.verifiedAt = new Date();
    await driver.save();

    return driver;
  }
}

module.exports = DriverService;
