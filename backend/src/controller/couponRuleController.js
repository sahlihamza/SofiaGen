const couponRuleService = require("../service/couponRuleService");
const { resolveStoreId } = require("../utils/requestContext");

const notFound = (res) => res.status(404).json({ success: false, message: "Coupon introuvable" });

const handleError = (res, error) => {
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Identifiant invalide" });
  }
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
    return res.status(422).json({ success: false, message: "Donnés invalides", errors });
  }
  return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
};

const getCouponRules = async (req, res) => {
  try {
    const groups = await couponRuleService.getRulesByCouponId(req.params.id, resolveStoreId(req));
    if (groups === null) return notFound(res);
    return res.status(200).json({ success: true, data: groups });
  } catch (error) {
    return handleError(res, error);
  }
};

const addRuleCondition = async (req, res) => {
  try {
    const rule = await couponRuleService.createRule(req.params.id, resolveStoreId(req), req.body);
    if (!rule) return notFound(res);
    return res.status(201).json({ success: true, message: "Condition ajouté avec succès", data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateRuleCondition = async (req, res) => {
  try {
    const rule = await couponRuleService.updateRule(req.params.id, resolveStoreId(req), req.params.ruleId, req.body);
    if (!rule) return notFound(res);
    return res.status(200).json({ success: true, message: "Condition mise  jour avec succès", data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteRuleCondition = async (req, res) => {
  try {
    const rule = await couponRuleService.deleteRule(req.params.id, resolveStoreId(req), req.params.ruleId);
    if (!rule) return notFound(res);
    return res.status(200).json({ success: true, message: "Condition supprimée avec succès" });
  } catch (error) {
    return handleError(res, error);
  }
};

const addRuleGroup = async (req, res) => {
  try {
    const group = await couponRuleService.createRuleGroup(req.params.id, resolveStoreId(req), req.body);
    if (!group) return notFound(res);
    return res.status(201).json({ success: true, message: "Groupe de règles ajouté avec succès", data: group });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateRuleGroup = async (req, res) => {
  try {
    const group = await couponRuleService.updateRuleGroup(req.params.id, resolveStoreId(req), req.params.groupId, req.body);
    if (!group) return notFound(res);
    return res
      .status(200)
      .json({ success: true, message: "Groupe de règles mis à jour avec succès", data: group });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteRuleGroup = async (req, res) => {
  try {
    const group = await couponRuleService.deleteRuleGroup(req.params.id, resolveStoreId(req), req.params.groupId);
    if (!group) return notFound(res);
    return res.status(200).json({ success: true, message: "Groupe de règles supprimé avec succès" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getCouponRules,
  addRuleCondition,
  updateRuleCondition,
  deleteRuleCondition,
  addRuleGroup,
  updateRuleGroup,
  deleteRuleGroup,
};

