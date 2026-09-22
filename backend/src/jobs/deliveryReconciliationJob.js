const Shipment = require('../models/shipping/Shipment');
const auditLogService = require('../service/auditLogService');
const ShipmentService = require('../service/ShipmentService');
const logger = require('../config/logger');
const JobLogService = require('../service/JobLogService');

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // once an hour
const STALE_SHIPMENT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Delivery Reconciliation Job - Detects and resolves shipment anomalies
 *
 * Checks:
 * 1. Stale shipments (no status update for X days, not in terminal state)
 * 2. Failed deliveries without follow-up (no events since failed_delivery)
 * 3. Divergence between local status and provider (if provider supports tracking)
 */

const detectStaleShipments = async () => {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_SHIPMENT_THRESHOLD_MS);

  const staleShipments = await Shipment.find({
    status: { $nin: ['delivered', 'cancelled', 'returned'] },
    updatedAt: { $lt: staleThreshold },
  });

  const results = [];

  for (const shipment of staleShipments) {
    const lastEvent = shipment.events?.[shipment.events.length - 1];
    const daysSinceUpdate = Math.floor((now - shipment.updatedAt) / (1000 * 60 * 60 * 24));

    logger.warn(`Stale shipment detected: ${shipment._id}, status: ${shipment.status}, days since update: ${daysSinceUpdate}`);

    // Log audit entry
    await auditLogService.log({
      storeId: shipment.storeId,
      action: 'shipment_stale_detected',
      entityType: 'Shipment',
      entityId: shipment._id,
      summary: `Shipment ${shipment.trackingNumber} stale for ${daysSinceUpdate} days, status: ${shipment.status}`,
      metadata: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        currentStatus: shipment.status,
        lastUpdateDate: shipment.updatedAt,
        daysSinceUpdate,
      },
      actor: null,
    });

    // Add system event (idempotence: only add if not already present)
    const alreadyMarked = shipment.events?.some(e => e.source === 'system' && e.status === 'stale_detected');
    if (!alreadyMarked) {
      shipment.events.push({
        status: 'stale_detected',
        timestamp: now,
        note: `Shipment stale for ${daysSinceUpdate} days`,
        source: 'system',
      });
      await shipment.save();
    }

    results.push({
      shipmentId: shipment._id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      daysSinceUpdate,
      issue: 'stale',
    });
  }

  return results;
};

/**
 * Detect failed deliveries without follow-up
 * Checks for shipments in failed_delivery status with no subsequent events
 */
const detectFailedDeliveriesWithoutFollowUp = async () => {
  const results = [];

  const failedShipments = await Shipment.find({
    status: 'failed_delivery',
  });

  for (const shipment of failedShipments) {
    const failedEvent = shipment.events?.find(e => e.status === 'failed_delivery');
    const subsequentEvents = shipment.events?.filter(
      e => new Date(e.timestamp) > new Date(failedEvent.timestamp)
    ) || [];

    if (subsequentEvents.length === 0 && failedEvent) {
      const daysSinceFailed = Math.floor(
        (new Date() - new Date(failedEvent.timestamp)) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceFailed > 3) {
        logger.warn(`Failed delivery without follow-up: ${shipment._id}, days: ${daysSinceFailed}`);

        // Log audit
        await auditLogService.log({
          storeId: shipment.storeId,
          action: 'shipment_failed_no_followup',
          entityType: 'Shipment',
          entityId: shipment._id,
          summary: `Shipment ${shipment.trackingNumber} failed delivery, no follow-up for ${daysSinceFailed} days`,
          metadata: {
            shipmentId: shipment._id,
            trackingNumber: shipment.trackingNumber,
            daysSinceFailed,
            failedAt: failedEvent.timestamp,
          },
          actor: null,
        });

        results.push({
          shipmentId: shipment._id,
          trackingNumber: shipment.trackingNumber,
          issue: 'failed_no_followup',
          daysSinceFailed,
        });
      }
    }
  }

  return results;
};

/**
 * Attempt to reconcile with provider
 * For testing: LocalCourierAdapter (webhooks only, no tracking API)
 * For production: Aramex would have tracking API (not testable without credentials)
 */
const attemptProviderReconciliation = async () => {
  const results = [];

  // Note: Full reconciliation with provider API requires:
  // 1. Valid provider credentials
  // 2. Real adapter implementation of trackShipment()
  // Currently implemented for: webhooks (main source of truth)
  // Future: Can call adapter.trackShipment() if credentials available

  logger.info('Provider reconciliation: skipped (requires valid carrier credentials)');

  return results;
};

/**
 * Run reconciliation for all shipments
 */
const runDeliveryReconciliation = async () => {
  logger.info('Starting delivery reconciliation job...');

  const results = {
    staleShipments: [],
    failedNoFollowup: [],
    providerReconciliations: [],
    totalIssuesDetected: 0,
  };

  try {
    results.staleShipments = await detectStaleShipments();
    results.failedNoFollowup = await detectFailedDeliveriesWithoutFollowUp();
    results.providerReconciliations = await attemptProviderReconciliation();

    results.totalIssuesDetected =
      results.staleShipments.length +
      results.failedNoFollowup.length +
      results.providerReconciliations.length;

    logger.info(
      `Delivery reconciliation completed: ${results.totalIssuesDetected} issues detected ` +
      `(${results.staleShipments.length} stale, ` +
      `${results.failedNoFollowup.length} failed_no_followup, ` +
      `${results.providerReconciliations.length} provider_divergence)`
    );
  } catch (err) {
    logger.error(`Delivery reconciliation failed: ${err.message}`);
    throw err;
  }

  return results;
};

/**
 * Start the reconciliation job
 */
const startDeliveryReconciliationJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_DELIVERY_RECONCILIATION_JOB !== 'true') {
    logger.info(
      'deliveryReconciliationJob: disabled (set ENABLE_DELIVERY_RECONCILIATION_JOB=true in .env to enable).'
    );
    return null;
  }

  const runSafely = () => {
    JobLogService.runJob('deliveryReconciliationJob', runDeliveryReconciliation).catch((err) =>
      logger.error('deliveryReconciliationJob failed:', err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  runDeliveryReconciliation,
  startDeliveryReconciliationJob,
  detectStaleShipments,
  detectFailedDeliveriesWithoutFollowUp,
  attemptProviderReconciliation,
  STALE_SHIPMENT_THRESHOLD_MS,
  DEFAULT_INTERVAL_MS,
};
