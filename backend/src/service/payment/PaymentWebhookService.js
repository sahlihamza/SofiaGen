const PaymentWebhook = require('../../models/payment/PaymentWebhook');
const PaymentLog = require('../../models/payment/PaymentLog');
const WebhookLogService = require('../WebhookLogService');

class PaymentWebhookService {
  async create(data) {
    const webhook = new PaymentWebhook(data);
    await webhook.save();

    // LOG-3: mirror into the generic, cross-provider WebhookLog so the
    // Super Admin's unified webhook view includes payment events too.
    WebhookLogService.record({
      provider: "payment",
      event: webhook.event,
      status: webhook.status === "processed" ? "success" : webhook.status,
      attempts: (webhook.retryCount || 0) + 1,
      sourceRef: webhook._id,
      sourceModel: "PaymentWebhook",
      metadata: { providerId: webhook.providerId },
    }).catch(() => {});

    return webhook;
  }

  async getById(id) {
    return PaymentWebhook.findById(id)
      .populate('providerId', 'code name')
      .populate('transactionId', 'transactionId amount currency status');
  }

  async getAll(filters = {}) {
    const query = {};
    if (filters.providerId) query.providerId = filters.providerId;
    if (filters.status) query.status = filters.status;
    if (filters.event) query.event = new RegExp(filters.event, 'i');
    if (filters.transactionId) query.transactionId = filters.transactionId;

    const skip = ((filters.page || 1) - 1) * (filters.limit || 20);
    const total = await PaymentWebhook.countDocuments(query);
    const data = await PaymentWebhook.find(query)
      .populate('providerId', 'code name')
      .populate('transactionId', 'transactionId amount currency status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(filters.limit || 20, 10));

    return {
      data,
      pagination: {
        total,
        page: parseInt(filters.page || 1, 10),
        limit: parseInt(filters.limit || 20, 10),
        pages: Math.ceil(total / (filters.limit || 20)),
      },
    };
  }

  async markProcessed(id, response = {}) {
    const webhook = await PaymentWebhook.findById(id);
    if (!webhook) throw new Error('Webhook not found');

    webhook.status = 'processed';
    webhook.response = response;
    webhook.processedAt = new Date();
    await webhook.save();

    await PaymentLog.log({
      module: 'webhooks',
      action: 'mark_processed',
      message: `Webhook marked as processed: ${webhook._id}`,
      details: { webhookId: webhook._id, event: webhook.event, providerId: webhook.providerId },
      providerId: webhook.providerId,
      transactionId: webhook.transactionId,
    });

    return webhook;
  }

  async markFailed(id, errorMessage) {
    const webhook = await PaymentWebhook.findById(id);
    if (!webhook) throw new Error('Webhook not found');

    webhook.status = 'failed';
    webhook.errorMessage = errorMessage;
    await webhook.save();

    await PaymentLog.log({
      module: 'webhooks',
      action: 'mark_failed',
      message: `Webhook marked as failed: ${webhook._id}`,
      details: { webhookId: webhook._id, event: webhook.event, errorMessage },
      providerId: webhook.providerId,
      transactionId: webhook.transactionId,
      level: 'error',
    });

    return webhook;
  }

  async retry(id) {
    const webhook = await PaymentWebhook.findById(id);
    if (!webhook) throw new Error('Webhook not found');

    webhook.retryCount = (webhook.retryCount || 0) + 1;
    webhook.status = 'retrying';
    webhook.nextRetryAt = new Date(Date.now() + 60 * 1000);
    await webhook.save();

    await PaymentLog.log({
      module: 'webhooks',
      action: 'retry',
      message: `Webhook retry scheduled: ${webhook._id}`,
      details: { webhookId: webhook._id, event: webhook.event, retryCount: webhook.retryCount },
      providerId: webhook.providerId,
      transactionId: webhook.transactionId,
      level: 'warn',
    });

    return webhook;
  }

  async getWebhooksByProvider(providerId) {
    return PaymentWebhook.find({ providerId }).sort({ createdAt: -1 }).lean();
  }

  async getWebhooksByTransaction(transactionId) {
    return PaymentWebhook.find({ transactionId }).sort({ createdAt: -1 }).lean();
  }

  async getWebhookLogs(filters = {}) {
    return this.getAll(filters);
  }
}

const paymentWebhookService = new PaymentWebhookService();

// LOG-3: plug this source into the generic cross-provider retry dispatcher 
// see WebhookLogService.retry(). Any future webhook source registers its own
// handler the same way; the controller/route never needs to know about it.
WebhookLogService.registerRetryHandler("PaymentWebhook", (sourceRef) => paymentWebhookService.retry(sourceRef));

module.exports = paymentWebhookService;
