const Coupon = require("../models/Coupon");
const CouponConditionRule = require("../models/CouponConditionRule");
const CouponRuleGroup = require("../models/CouponRuleGroup");

// Maps a rule's `field` to where its runtime value lives on the evaluation
// context passed to evaluateRules(). Keeping this table in one place is what
// lets evaluateRules() stay generic across all fields.
const FIELD_CONTEXT_KEY = {
  cartTotal: "cartTotal",
  customerGroup: "customerGroup",
  productCategory: "productCategories",
  productBrand: "productBrands",
  productId: "productIds",
  customerFirstOrder: "customerFirstOrder",
  customerBirthday: "customerBirthday",
  customerRegistrationDate: "customerRegistrationDate",
  country: "country",
};

// Fields whose values are arrays on the context (cart contents), evaluated
// with the "contains" operator instead of direct comparison.
const ARRAY_FIELDS = new Set(["productCategory", "productBrand", "productId"]);

// Fields compared as dates rather than numbers/strings.
const DATE_FIELDS = new Set(["customerBirthday", "customerRegistrationDate"]);

const toComparable = (value, field) => {
  if (DATE_FIELDS.has(field)) return new Date(value).getTime();
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
};

// "Birthday" conditions only ever care about day/month, never the year.
const isSameMonthDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const includesValue = (actualArray, expected) => {
  const haystack = (Array.isArray(actualArray) ? actualArray : []).map(String);
  const needles = Array.isArray(expected) ? expected : [expected];
  return needles.some((needle) => haystack.includes(String(needle)));
};

class CouponRuleService {
  // Verifies the coupon exists, isn't soft-deleted, and belongs to the
  // active store before any rule read/write touches it  mirrors the
  // ownership check used for Phase 2 restrictions.
  async getOwnedCoupon(couponId, storeId) {
    return await Coupon.findOne({ _id: couponId, storeId, deletedAt: null });
  }

  async getRulesByCouponId(couponId, storeId) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    return await CouponRuleGroup.find({ couponId }).populate("conditionIds").sort({ createdAt: 1 });
  }

  async createRule(couponId, storeId, data) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    return await CouponConditionRule.create({
      couponId,
      field: data.field,
      operator: data.operator,
      value: data.value,
      order: data.order ?? 0,
    });
  }

  async updateRule(couponId, storeId, ruleId, data) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    const updates = {};
    for (const field of ["field", "operator", "value", "order"]) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    return await CouponConditionRule.findOneAndUpdate(
      { _id: ruleId, couponId },
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  async deleteRule(couponId, storeId, ruleId) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    const rule = await CouponConditionRule.findOneAndDelete({ _id: ruleId, couponId });
    if (rule) {
      // Drop the now-dangling reference from any group that used it.
      await CouponRuleGroup.updateMany({ couponId }, { $pull: { conditionIds: ruleId } });
    }
    return rule;
  }

  async createRuleGroup(couponId, storeId, data) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    return await CouponRuleGroup.create({
      couponId,
      logicOperator: data.logicOperator === "OR" ? "OR" : "AND",
      conditionIds: data.conditionIds || [],
    });
  }

  async updateRuleGroup(couponId, storeId, groupId, data) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    const updates = {};
    if (data.logicOperator !== undefined) {
      updates.logicOperator = data.logicOperator === "OR" ? "OR" : "AND";
    }
    if (data.conditionIds !== undefined) updates.conditionIds = data.conditionIds;

    return await CouponRuleGroup.findOneAndUpdate(
      { _id: groupId, couponId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("conditionIds");
  }

  async deleteRuleGroup(couponId, storeId, groupId) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    return await CouponRuleGroup.findOneAndDelete({ _id: groupId, couponId });
  }

  // Evaluates a single condition against the runtime context.
  evaluateCondition(condition, context) {
    const contextKey = FIELD_CONTEXT_KEY[condition.field];
    const actual = context ? context[contextKey] : undefined;
    const { operator, value: expected, field } = condition;

    if (ARRAY_FIELDS.has(field)) {
      // The only operator that makes sense for "is one of the cart's
      // categories/brands/products" is membership, regardless of what was
      // configured  treat notEquals/equals defensively as contains/!contains.
      const isMember = includesValue(actual, expected);
      return operator === "notEquals" ? !isMember : isMember;
    }

    if (field === "customerFirstOrder") {
      const actualBool = Boolean(actual);
      const expectedBool = expected === true || expected === "true";
      return operator === "notEquals" ? actualBool !== expectedBool : actualBool === expectedBool;
    }

    if (field === "customerBirthday") {
      if (actual === undefined || actual === null || expected === undefined) return false;
      const same = isSameMonthDay(actual, expected);
      return operator === "notEquals" ? !same : same;
    }

    if (actual === undefined || actual === null) return false;

    switch (operator) {
      case "equals":
        return String(actual) === String(expected);
      case "notEquals":
        return String(actual) !== String(expected);
      case "contains":
        return includesValue(Array.isArray(actual) ? actual : [actual], expected);
      case "greaterThan":
        return toComparable(actual, field) > toComparable(expected, field);
      case "lessThan":
        return toComparable(actual, field) < toComparable(expected, field);
      case "between": {
        const [min, max] = Array.isArray(expected) ? expected : [];
        const comparable = toComparable(actual, field);
        return comparable >= toComparable(min, field) && comparable <= toComparable(max, field);
      }
      default:
        return false;
    }
  }

  // A group passes when its conditions combine to true under its
  // logicOperator. An empty group (no conditions) is vacuously true so it
  // never blocks a coupon by accident.
  evaluateGroup(group, context) {
    const conditions = group.conditionIds || [];
    if (conditions.length === 0) return true;

    const results = conditions.map((condition) => this.evaluateCondition(condition, context));
    return group.logicOperator === "OR" ? results.some(Boolean) : results.every(Boolean);
  }

  /**
   * Central rule-engine entry point, reused as-is by Phase 5 (coupon
   * validation at checkout).
   *
   * A coupon is applicable when *every* one of its rule groups passes
   * (groups combine with an implicit AND across groups; AND/OR only applies
   * *within* a group, per Story 6). A coupon with no rule groups configured
   * has no rule-based restriction and is always applicable.
   *
   * @param {string} couponId
   * @param {object} context - runtime values to evaluate against, e.g.
   *   { cartTotal, customerGroup, productCategories, productBrands,
   *     productIds, customerFirstOrder, customerBirthday,
   *     customerRegistrationDate, country }
   * @returns {Promise<boolean>}
   */
  async evaluateRules(couponId, context = {}) {
    const groups = await CouponRuleGroup.find({ couponId }).populate("conditionIds");
    if (groups.length === 0) return true;

    return groups.every((group) => this.evaluateGroup(group, context));
  }
}

module.exports = new CouponRuleService();
