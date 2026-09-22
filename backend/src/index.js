require("dotenv").config();
const { connectDB, waitForMongo } = require("./config/db");
const logger = require("./config/logger");
const app = require("./app");
const { startCouponExpiryJob } = require("./jobs/couponExpiryJob");
const { startDataRetentionJob } = require("./jobs/dataRetentionJob");
const { startNotificationDeliveryJob } = require("./jobs/notificationDeliveryJob");
const { startSubscriptionExpiryJob } = require("./jobs/subscriptionExpiryJob");
const { startBillingReconciliationJob } = require("./jobs/billingReconciliationJob");
const { startSlaEscalationJob } = require("./jobs/slaEscalationJob");
const { startStorePurgeJob } = require("./service/storePurgeService");
const { registerHandlers } = require("./service/NotificationEventHandler");
const { registerSecurityLogHandlers } = require("./service/SecurityLogEventHandler");
const { registerDashboardCacheHandlers } = require("./service/DashboardCacheEventHandler");
const { startLogRetentionJob } = require("./jobs/logRetentionJob");
const { startStockReservationExpiryJob } = require("./jobs/stockReservationExpiryJob");
const { startStockDivergenceJob } = require("./jobs/stockDivergenceJob");
const { startEmailQueueWorker } = require("./jobs/emailQueueWorker");
// Required for its side effect: registers the "PaymentWebhook" retry handler
// with WebhookLogService (see LOG-3) so /platform/logs/webhooks/:id/retry
// works even if no payment webhook route has been hit yet this boot.
require("./service/payment/PaymentWebhookService");
require("./service/FacebookCatalogHooks").register();
const { setServer } = require("./lib/socket");
const roleService = require("./service/RoleService");
const seedPermissions = require("./script/seedPermissions");
const { seedPlatformRoles } = require("./script/seedSuperAdmin");
const RoleTemplateService = require("./service/RoleTemplateService");
const seedAiQuotas = require("./seeders/seedAiQuotas");
const { verifyOnBoot } = require("./service/email/EmailTransportFactory");
const migrateSmtpPasswords = require("./script/migrateSmtpPasswords");

const start = async () => {
  await waitForMongo();

  RoleTemplateService.seedDefaultTemplates()
    .then(() => logger.info("Role templates seeded"))
    .catch((err) => logger.error("Role template seeding failed:", err.message));

  try {
    await seedPermissions();
  } catch (err) {
    logger.error("startup: seedPermissions failed:", err.message);
  }

  try {
    await seedPlatformRoles();
  } catch (err) {
    logger.error("startup: seedPlatformRoles failed:", err.message);
  }

  try {
    await migrateSmtpPasswords();
  } catch (err) {
    logger.error("startup: migrateSmtpPasswords failed:", err.message);
  }

  // Idempotent  only inserts the three AI QuotaType rows if they are missing
  // (see aiQuotaService.js). The original seedUsageQuotas would have wiped
  // every other quota; this one is safe to run alongside it.
  seedAiQuotas()
    .then((rows) => logger.info(`AI QuotaTypes ensured (${rows} row(s) upserted)`))
    .catch((err) => logger.error("seedAiQuotas failed:", err.message));

  roleService
    .syncFullAccessRoles()
    .then(({ matched, permissionCount }) =>
      logger.info(
        `Super Admin roles synced: ${matched} role(s) -> ${permissionCount} permissions`
      )
    )
    .catch((err) => logger.error("syncFullAccessRoles failed:", err.message));

  startCouponExpiryJob();
  startDataRetentionJob();
  startNotificationDeliveryJob();
  startSubscriptionExpiryJob();
  startBillingReconciliationJob();
  startSlaEscalationJob();
  startStorePurgeJob();
  startLogRetentionJob();
  startStockReservationExpiryJob();
  startStockDivergenceJob();
  startEmailQueueWorker();
  registerHandlers();
  registerSecurityLogHandlers();
  registerDashboardCacheHandlers();

  // Mailer readiness is checked once here, not on every send (see MAIL-01) 
  // a slow/unreachable SMTP server must never add a round-trip to sending a
  // single email. Non-fatal: a broken platform SMTP shouldn't stop the app
  // from starting, only get logged.
  verifyOnBoot().catch((err) => logger.error("Mailer boot verification failed:", err.message));

  const PORT = process.env.PORT || 5000;
  const MAX_HEADER_SIZE = parseInt(process.env.MAX_HEADER_SIZE, 10) || 131072;

  const server = require("http").createServer({ maxHeaderSize: MAX_HEADER_SIZE }, app);
  try {
    setServer(server);
    logger.info("socket.io initialized");
  } catch (err) {
    logger.warn("socket.io failed to initialize:", err.message);
  }

  server.listen(PORT, () =>
    logger.info(`server running on port ${PORT} with maxHeaderSize=${MAX_HEADER_SIZE}`)
  );
};

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    message: reason?.message || String(reason),
    stack: reason?.stack,
  });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", {
    message: err?.message,
    stack: err?.stack,
  });
  process.exit(1);
});
