const Shipment = require('../models/shipping/Shipment');
const ProofOfDelivery = require('../models/ProofOfDelivery');
const CodCollection = require('../models/CodCollection');
const Driver = require('../models/Driver');
const DriverService = require('./driverService');
const logger = require('../config/logger');
const { eventBus } = require('../lib/eventBus');

class InternalDeliveryService {
  /**
   * Record proof of delivery
   * Enables transition to "delivered" status
   */
  static async recordProofOfDelivery(shipmentId, podData) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    // Check if POD already exists
    const existingPod = await ProofOfDelivery.findOne({ shipmentId });
    if (existingPod) {
      throw new Error('ProofOfDelivery already exists for this shipment');
    }

    const { method, signatureUrl, photoUrl, otpCode, receivedByName, gpsLocation, driverId } = podData;

    const pod = await ProofOfDelivery.create({
      shipmentId,
      method,
      signatureUrl,
      photoUrl,
      otpCode,
      receivedByName,
      gpsLocation,
      driverId,
      storeId: shipment.storeId,
      deliveredAt: new Date(),
    });

    logger.info(`ProofOfDelivery recorded for shipment ${shipmentId}: ${method}`);

    return pod;
  }

  /**
   * Record delivery failure
   * Increments attempt counter, may auto-transition to "returned" after max attempts
   */
  static async recordDeliveryFailure(shipmentId, failureReason, driverId, maxAttempts = 3) {
    if (!failureReason || failureReason.trim() === '') {
      throw new Error('Delivery failure reason is required');
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    // Count previous failed delivery attempts
    const failedEvents = shipment.events?.filter(e => e.status === 'failed_delivery') || [];
    const attemptCount = failedEvents.length + 1;

    logger.warn(
      `Delivery failure for shipment ${shipmentId}: attempt ${attemptCount}/${maxAttempts}. Reason: ${failureReason}`
    );

    // Add failed delivery event
    shipment.events.push({
      status: 'failed_delivery',
      timestamp: new Date(),
      note: failureReason,
      source: 'manual',
      driverId,
      attemptNumber: attemptCount,
    });

    // Auto-transition to returned after max attempts
    if (attemptCount >= maxAttempts) {
      logger.info(`Shipment ${shipmentId} auto-transitioned to returned after ${maxAttempts} failed attempts`);

      shipment.status = 'returned';
      shipment.events.push({
        status: 'returned',
        timestamp: new Date(),
        note: `Auto-returned after ${maxAttempts} failed delivery attempts`,
        source: 'system',
      });

      // Emit notification event
      try {
        eventBus.emit('shipment.returned', {
          shipmentId: shipment._id,
          orderId: shipment.orderId,
          storeId: shipment.storeId,
          trackingNumber: shipment.trackingNumber,
          status: 'returned',
          metadata: {
            source: 'delivery_failure_max_attempts',
            attempts: attemptCount,
          },
        });
      } catch (err) {
        logger.warn(`Failed to emit returned event: ${err.message}`);
      }
    } else {
      // Still trying - emit failed_delivery notification
      try {
        eventBus.emit('shipment.failed_delivery', {
          shipmentId: shipment._id,
          orderId: shipment.orderId,
          storeId: shipment.storeId,
          trackingNumber: shipment.trackingNumber,
          status: 'failed_delivery',
          metadata: {
            source: 'delivery_attempt_failed',
            attemptNumber: attemptCount,
            remainingAttempts: maxAttempts - attemptCount,
          },
        });
      } catch (err) {
        logger.warn(`Failed to emit failed_delivery event: ${err.message}`);
      }
    }

    await shipment.save();

    // Update driver performance
    await DriverService.updatePerformanceMetrics(driverId, 'failed');

    return shipment;
  }

  /**
   * Update driver location during delivery
   */
  static async updateDriverLocation(driverId, latitude, longitude) {
    return DriverService.updateLocation(driverId, latitude, longitude);
  }

  /**
   * Create COD collection record
   */
  static async recordCodCollection(shipmentId, driverId, storeId, amountExpected) {
    const cod = await CodCollection.create({
      shipmentId,
      driverId,
      storeId,
      amountExpected,
      status: 'pending',
    });

    logger.info(`COD collection recorded: ${cod._id} for shipment ${shipmentId}`);
    return cod;
  }

  /**
   * Update COD collection with actual collected amount
   * Automatically flags discrepancies
   */
  static async recordCodPayment(codCollectionId, amountCollected) {
    const cod = await CodCollection.findById(codCollectionId);
    if (!cod) throw new Error('COD collection not found');

    cod.amountCollected = amountCollected;
    cod.discrepancy = amountCollected - cod.amountExpected;
    cod.collectedAt = new Date();

    // Auto-flag discrepancy if amounts don't match
    if (cod.discrepancy !== 0) {
      cod.status = 'discrepancy_flagged';
      logger.warn(
        `COD discrepancy detected: ${codCollectionId}. Expected: ${cod.amountExpected}, Collected: ${amountCollected}, Diff: ${cod.discrepancy}`
      );
    } else {
      cod.status = 'collected';
    }

    await cod.save();
    return cod;
  }

  /**
   * Get all pending COD collections for a driver
   */
  static async getPendingCodCollections(driverId, storeId) {
    return CodCollection.find({
      driverId,
      storeId,
      status: { $in: ['pending', 'collected'] },
    }).populate('shipmentId', 'trackingNumber');
  }
}

module.exports = InternalDeliveryService;
