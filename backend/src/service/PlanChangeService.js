const mongoose = require("mongoose");
const crypto = require("crypto");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanChangeRequest = require("../models/PlanChangeRequest");
const Invoice = require("../models/Invoice");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const UsageCounter = require("../models/UsageCounter");
const ProrationService = require("./ProrationService");
const PlanEligibilityService = require("./PlanEligibilityService");
const Provisioning = require("./SubscriptionProvisioningService");
const AuditService = require("./AuditService");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");

let transactionSupport = null;

const supportsTransactions = async () => {
  if (transactionSupport !== null) return transactionSupport;
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionSupport = Boolean(info.setName) || info.msg === "isdbgrid";
  } catch (err) {
    transactionSupport = false;
  }
  return transactionSupport;
};

const fail = (message, code, status = 409, step = null) => {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  err.step = step;
  return err;
};

const assertUsageFitsQuotas = async (storeId, planVersion) => {
  const quotaRefs = planVersion?.snapshot?.quotaRefs || [];
  if (quotaRefs.length === 0) return [];

  const counters = await UsageCounter.find({ storeId }).select("quotaTypeCode used").lean();
  const usedByCode = new Map();
  for (const c of counters) {
    usedByCode.set(String(c.quotaTypeCode).toLowerCase(), Math.max(usedByCode.get(c.quotaTypeCode) || 0, c.used || 0));
  }

  const violations = [];
  for (const ref of quotaRefs) {
    if (ref.isUnlimited) continue;
    const limit = Number(ref.limitValue);
    if (!Number.isFinite(limit)) continue;

    const code = String(ref.quotaTypeCode || "").toLowerCase();
    const used = usedByCode.get(code) || 0;
    if (used > limit) {
      violations.push({ quotaTypeCode: code, used, newLimit: limit });
    }
  }

  if (violations.length > 0) {
    const detail = violations
      .map((v) => `${v.quotaTypeCode} : ${v.used} utilisé(s) pour une limite de ${v.newLimit}`)
      .join(" ; ");
    const err = fail(
      `Downgrade impossible, l'usage actuel dépasse les quotas du plan cible  ${detail}`,
      "DOWNGRADE_USAGE_EXCEEDS_QUOTA",
      409,
      "usage_check"
    );
    err.violations = violations;
    throw err;
  }

  return violations;
};

const buildInvoiceNumber = () =>
  `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

const previewPlanChange = async ({ subscriptionId, newPlanId }) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw fail("Abonnement introuvable", "NOT_FOUND", 404, "load");

  const plan = await Plan.findOne({ _id: newPlanId, deletedAt: null });
  if (!plan) throw fail("Plan cible introuvable", "NOT_FOUND", 404, "load");
  if (!plan.currentVersionId) {
    throw fail(
      `Le plan "${plan.name}" n'a aucune version publié`,
      "PLAN_HAS_NO_PUBLISHED_VERSION",
      409,
      "load"
    );
  }

  const newPlanPrice = await Provisioning.resolveActivePrice({
    planId: plan._id,
    cycle: subscription.billingCycle,
    currency: subscription.currency,
  });
  if (!newPlanPrice) {
    throw fail(
      `Aucun tarif actif pour ${plan.name} en ${subscription.currency}/${subscription.billingCycle}`,
      "PLAN_PRICE_NOT_FOUND",
      409,
      "load"
    );
  }

  const proration = ProrationService.calculateProration({
    oldPrice: subscription.unitPrice ?? subscription.basePriceInCurrency ?? 0,
    newPrice: newPlanPrice.price,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
    changeDate: new Date(),
    oldCurrency: subscription.currency,
    newCurrency: newPlanPrice.currency,
  });

  return { subscription, plan, newPlanPrice, proration };
};

const changePlan = async ({
  subscriptionId,
  newPlanId,
  idempotencyKey,
  actorId = null,
  correlationId = null,
  skipEligibility = false,
} = {}) => {
  if (!idempotencyKey || String(idempotencyKey).trim().length < 8) {
    throw fail("idempotencyKey est obligatoire (8 caractères minimum)", "IDEMPOTENCY_KEY_REQUIRED", 400, "idempotency");
  }
  const key = String(idempotencyKey).trim();

  const existing = await PlanChangeRequest.findOne({ idempotencyKey: key });
  if (existing && existing.status === "completed") {
    return { request: existing, replayed: true, amountDue: existing.proration.amountDue };
  }
  if (existing && existing.status === "pending") {
    throw fail(
      "Un changement de plan avec cette clé est déjà en cours",
      "PLAN_CHANGE_IN_PROGRESS",
      409,
      "idempotency"
    );
  }

  const { subscription, plan, newPlanPrice, proration } = await previewPlanChange({
    subscriptionId,
    newPlanId,
  });

  if (String(subscription.planId) === String(plan._id)) {
    throw fail("L'abonnement est déjà sur ce plan", "PLAN_UNCHANGED", 409, "load");
  }

  const newPlanVersion = await PlanVersion.findById(plan.currentVersionId);
  if (!newPlanVersion) throw fail("PlanVersion cible introuvable", "NOT_FOUND", 404, "load");

  let request;
  try {
    request = await PlanChangeRequest.create({
      idempotencyKey: key,
      correlationId,
      storeId: subscription.storeId,
      subscriptionId: subscription._id,
      fromPlanId: subscription.planId,
      fromPlanVersionId: subscription.planVersionId,
      fromPlanPriceId: subscription.planPriceId,
      toPlanId: plan._id,
      toPlanVersionId: newPlanVersion._id,
      toPlanPriceId: newPlanPrice._id,
      direction: proration.direction,
      proration: {
        credit: proration.credit,
        newCharge: proration.newCharge,
        amountDue: proration.amountDue,
        usedDays: proration.usedDays,
        remainingDays: proration.remainingDays,
        totalDays: proration.totalDays,
        currency: proration.currency,
      },
      status: "pending",
      requestedBy: actorId,
    });
  } catch (err) {
    if (err.code === 11000) {
      const concurrent = await PlanChangeRequest.findOne({ idempotencyKey: key });
      if (concurrent?.status === "completed") {
        return { request: concurrent, replayed: true, amountDue: concurrent.proration.amountDue };
      }
      throw fail(
        "Un changement de plan avec cette clé est déjà en cours",
        "PLAN_CHANGE_IN_PROGRESS",
        409,
        "idempotency"
      );
    }
    throw err;
  }

  const markFailed = async (err, step) => {
    await PlanChangeRequest.updateOne(
      { _id: request._id },
      {
        $set: {
          status: "failed",
          failedStep: step || err.step || "unknown",
          failureReason: err.message,
          failureCode: err.code || null,
        },
      }
    ).catch(() => {});
  };

  const useTransaction = await supportsTransactions();
  const session = useTransaction ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  let invoice = null;

  try {
    if (!skipEligibility) {
      await PlanEligibilityService.assertEligible(subscription.storeId, plan._id, {
        context: "change_plan",
      });
    }

    await assertUsageFitsQuotas(subscription.storeId, newPlanVersion);

    if (proration.amountDue > 0) {
      const created = await Invoice.create(
        [
          {
            invoiceNumber: buildInvoiceNumber(),
            storeId: subscription.storeId,
            subscriptionId: subscription._id,
            planId: plan._id,
            items: [
              {
                description: `Prorata changement de plan vers ${plan.name} (${proration.remainingDays} jour(s))`,
                quantity: 1,
                unitPrice: proration.newCharge,
                total: proration.newCharge,
              },
            ],
            baseAmount: proration.newCharge,
            discounts: proration.credit > 0
              ? [
                  {
                    code: "PRORATION_CREDIT",
                    discountType: "flat",
                    discountAmount: proration.credit,
                    appliedAt: new Date(),
                  },
                ]
              : [],
            subtotal: proration.amountDue,
            taxRate: 0,
            tax: 0,
            total: proration.amountDue,
            currency: proration.currency || subscription.currency,
            status: "draft",
            issuedAt: new Date(),
            metadata: { planChangeRequestId: String(request._id), idempotencyKey: key },
          },
        ],
        session ? { session } : {}
      );
      invoice = created[0];
    }

    subscription.planId = plan._id;
    subscription.planVersionId = newPlanVersion._id;
    subscription.planPriceId = newPlanPrice._id;
    subscription.planVersion = newPlanVersion.version;
    subscription.currentPlanName = plan.name;
    subscription.unitPrice = newPlanPrice.price;
    subscription.finalPrice = newPlanPrice.price;
    subscription.basePriceInCurrency = newPlanPrice.price;
    subscription.updatedBy = actorId;
    await subscription.save(session ? { session } : {});

    await SubscriptionEvent.create(
      [
        {
          subscriptionId: subscription._id,
          storeId: subscription.storeId,
          planId: plan._id,
          type: "plan_changed",
          message: `Plan changé vers "${plan.name}" v${newPlanVersion.version}`,
          payload: {
            idempotencyKey: key,
            correlationId,
            fromPlanId: String(request.fromPlanId || ""),
            toPlanId: String(plan._id),
            amountDue: proration.amountDue,
            credit: proration.credit,
            invoiceId: invoice ? String(invoice._id) : null,
          },
          status: "info",
        },
      ],
      session ? { session } : {}
    );

    await PlanChangeRequest.updateOne(
      { _id: request._id },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          invoiceId: invoice ? invoice._id : null,
        },
      },
      session ? { session } : {}
    );

    if (session) await session.commitTransaction();
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.error(`PlanChangeService: abort echoue: ${abortErr.message}`);
      }
    } else if (invoice) {
      await Invoice.deleteOne({ _id: invoice._id }).catch(() => {});
    }
    await markFailed(err, err.step);
    throw err;
  } finally {
    if (session) session.endSession();
  }

  try {
    await AuditService.logAction({
      actorType: actorId ? "platform_admin" : "system",
      actorId,
      module: "Platform Billing",
      action: "subscription.plan_changed",
      summary: `Plan changé vers "${plan.name}" (dé: ${proration.amountDue} ${proration.currency})`,
      entityType: "subscription",
      entityId: subscription._id,
      storeId: subscription.storeId,
      status: "success",
      severity: "medium",
      oldValue: { planId: request.fromPlanId },
      newValue: { planId: plan._id, amountDue: proration.amountDue },
      metadata: { idempotencyKey: key, correlationId, invoiceId: invoice ? String(invoice._id) : null },
    });
  } catch (err) {
    logger.error(`PlanChangeService: audit echoue: ${err.message}`);
  }

  emitEvent("subscription.plan_changed", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: {
      toPlanId: String(plan._id),
      amountDue: proration.amountDue,
      invoiceId: invoice ? String(invoice._id) : null,
    },
  });

  const finalRequest = await PlanChangeRequest.findById(request._id);
  return { request: finalRequest, invoice, amountDue: proration.amountDue, replayed: false };
};

module.exports = {
  changePlan,
  previewPlanChange,
  assertUsageFitsQuotas,
  supportsTransactions,
};
