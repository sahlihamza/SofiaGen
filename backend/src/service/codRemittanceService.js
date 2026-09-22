const CodCollection = require('../models/CodCollection');
const Driver = require('../models/Driver');
const DriverService = require('./driverService');
const auditLogService = require('./auditLogService');
const logger = require('../config/logger');

/**
 * CodRemittance model - groups COD collections by period and driver
 * (Will create the model if needed in schema updates)
 */
const mongoose = require('mongoose');
const codRemittanceSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    collections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodCollection',
      },
    ],
    totalExpected: Number,
    totalCollected: Number,
    discrepancy: Number,
    status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'remitted'],
      default: 'pending',
    },
    remittedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

const CodRemittance = mongoose.model('CodRemittance', codRemittanceSchema);

class CodRemittanceService {
  /**
   * Create remittance batch for driver on period
   */
  static async createRemittanceBatch(driverId, storeId, periodStart, periodEnd) {
    // Find all COD collections for driver in period
    const collections = await CodCollection.find({
      driverId,
      storeId,
      status: { $ne: 'remitted' },
      createdAt: { $gte: periodStart, $lte: periodEnd },
    });

    if (collections.length === 0) {
      throw new Error('No COD collections found for period');
    }

    // Calculate totals
    const totalExpected = collections.reduce((sum, c) => sum + c.amountExpected, 0);
    const totalCollected = collections
      .filter(c => c.amountCollected !== null)
      .reduce((sum, c) => sum + c.amountCollected, 0);

    const discrepancy = totalCollected - totalExpected;

    // Create remittance batch
    const remittance = await CodRemittance.create({
      driverId,
      storeId,
      periodStart,
      periodEnd,
      collections: collections.map(c => c._id),
      totalExpected,
      totalCollected,
      discrepancy,
      status: 'pending',
    });

    // Update COD collection references
    await CodCollection.updateMany(
      { _id: { $in: collections.map(c => c._id) } },
      { remittanceBatchId: remittance._id }
    );

    logger.info(`COD remittance batch created: ${remittance._id} for driver ${driverId}`);

    return remittance;
  }

  /**
   * Submit remittance for verification
   */
  static async submitRemittance(remittanceId, storeId) {
    const remittance = await CodRemittance.findById(remittanceId);
    if (!remittance) throw new Error('Remittance not found');

    remittance.status = 'submitted';
    await remittance.save();

    await auditLogService.log({
      storeId,
      action: 'cod_remittance_submitted',
      entityType: 'CodRemittance',
      entityId: remittanceId,
      summary: `COD remittance submitted: ${remittance.totalCollected}/${remittance.totalExpected}`,
      metadata: {
        remittanceId,
        driver: remittance.driverId,
        totalCollected: remittance.totalCollected,
        totalExpected: remittance.totalExpected,
        discrepancy: remittance.discrepancy,
      },
      actor: null,
    });

    return remittance;
  }

  /**
   * Verify and approve remittance
   */
  static async verifyRemittance(remittanceId, storeId, approvedAmount) {
    const remittance = await CodRemittance.findById(remittanceId)
      .populate('collections');

    if (!remittance) throw new Error('Remittance not found');

    remittance.status = 'verified';
    remittance.totalCollected = approvedAmount;
    remittance.discrepancy = approvedAmount - remittance.totalExpected;

    await remittance.save();

    await auditLogService.log({
      storeId,
      action: 'cod_remittance_verified',
      entityType: 'CodRemittance',
      entityId: remittanceId,
      summary: `COD remittance verified: ${approvedAmount} (discrepancy: ${remittance.discrepancy})`,
      metadata: {
        remittanceId,
        approvedAmount,
        discrepancy: remittance.discrepancy,
      },
      actor: null,
    });

    return remittance;
  }

  /**
   * Mark remittance as remitted (funds transferred to store)
   */
  static async markRemitted(remittanceId, storeId) {
    const remittance = await CodRemittance.findById(remittanceId);
    if (!remittance) throw new Error('Remittance not found');

    remittance.status = 'remitted';
    remittance.remittedAt = new Date();
    await remittance.save();

    // Update all collections to remitted
    await CodCollection.updateMany(
      { _id: { $in: remittance.collections } },
      { status: 'remitted', remittedAt: new Date() }
    );

    logger.info(`COD remittance ${remittanceId} marked as remitted`);

    await auditLogService.log({
      storeId,
      action: 'cod_remittance_remitted',
      entityType: 'CodRemittance',
      entityId: remittanceId,
      summary: `COD remittance remitted: ${remittance.totalCollected}`,
      metadata: {
        remittanceId,
        totalRemitted: remittance.totalCollected,
      },
      actor: null,
    });

    return remittance;
  }

  /**
   * Get remittances for store
   */
  static async getRemittances(storeId, filters = {}) {
    const query = { storeId };

    if (filters.status) query.status = filters.status;
    if (filters.driverId) query.driverId = filters.driverId;
    if (filters.periodStart) query.periodStart = { $gte: filters.periodStart };

    return CodRemittance.find(query)
      .populate('driverId', 'userId phone')
      .populate('collections')
      .sort({ createdAt: -1 });
  }
}

module.exports = CodRemittanceService;
