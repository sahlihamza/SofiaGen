import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient } from "@tanstack/react-query";

import Title from "@/components/form/others/Title";
import PlanEligibilityServices from "@/services/PlanEligibilityServices";
import PlanServices from "@/services/PlanServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";
import { Button } from "@sofia/ui";

const LOGIC_OPERATORS = ["AND", "OR", "NOT"];
const STATUSES = ["draft", "active", "inactive", "archived"];
const APPLIES_TO = ["all", "new_stores", "existing_stores", "specific_stores"];
const APPROVAL_RULES = ["sales_manager", "finance", "admin", "any"];
const OPERATOR_LABELS = {
  equals: "=",
  notEquals: "!=",
  greaterThan: ">",
  lessThan: "<",
  greaterThanOrEqual: "â‰¥",
  lessThanOrEqual: "â‰¤",
  between: "between",
  in: "in",
  notIn: "not in",
};

let uid = 1;
const generateId = () => `n${Date.now()}_${uid++}`;

const newCondition = () => ({
  clientId: generateId(),
  factorId: "",
  factorCode: "",
  operator: "greaterThanOrEqual",
  value: "",
  negate: false,
});

const newGroup = (logic = "AND") => ({
  id: generateId(),
  logicOperator: logic,
  childrenGroups: [],
  conditions: [newCondition()],
});

const PlanEligibilityDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    planId: "",
    appliesTo: "new_stores",
    storeIds: [],
    priority: 100,
    status: "draft",
    rootGroup: newGroup("AND"),
    requiresCommercialApproval: false,
    commercialApprovalRule: "any",
    allowedApproverRoles: [],
  });

  const [factors, setFactors] = useState([]);
  const [plans, setPlans] = useState([]);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    PlanEligibilityServices.getFactors()
      .then((res) => setFactors(res.data || []))
      .catch(() => {});
    PlanServices.getAllPlans({ limit: 100, sort: "-createdAt" })
      .then((res) => setPlans(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      PlanEligibilityServices.getRuleById(id)
        .then((res) => {
          const r = res.data;
          const conditions = r.conditions || [];

          let rootGroup;
          if (r.rootGroup && r.rootGroup.logicOperator) {
            rootGroup = {
              id: r.rootGroup.id || generateId(),
              logicOperator: r.rootGroup.logicOperator || "AND",
              childrenGroups: (r.rootGroup.children || []).map((child) =>
                child && child.logicOperator
                  ? { ...child, childrenGroups: child.children || [], conditions: child.conditionIds || [] }
                  : newGroup("AND")
              ),
              conditions: (r.rootGroup.conditionIds || []).map((condId) => {
                const c = conditions.find((cc) => String(cc._id) === String(condId));
                return c || newCondition();
              }),
            };
          } else {
            rootGroup = {
              id: generateId(),
              logicOperator: "AND",
              childrenGroups: [],
              conditions:
                conditions.length > 0
                  ? conditions.map((c) => ({
                      clientId: c._id || generateId(),
                      factorId: c.factorId?._id || c.factorId,
                      factorCode: c.factorCode,
                      operator: c.operator,
                      value: c.value,
                      negate: c.negate,
                    }))
                  : [newCondition()],
            };
          }

          setFormData({
            name: r.name || "",
            description: r.description || "",
            planId: r.planId?._id || r.planId || "",
            appliesTo: r.appliesTo || "new_stores",
            storeIds: (r.storeIds || []).map((s) => (s?._id ? s._id : s)),
            priority: r.priority ?? 100,
            status: r.status || "draft",
            rootGroup,
            requiresCommercialApproval: Boolean(r.requiresCommercialApproval),
            commercialApprovalRule: r.commercialApprovalRule || "any",
            allowedApproverRoles: r.allowedApproverRoles || [],
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------------- Group helpers ---------------- */

  const updateCondition = (group, condIdx, field, value) => {
    const newConditions = group.conditions.map((c, i) => (i === condIdx ? { ...c, [field]: value } : c));
    return { ...group, conditions: newConditions };
  };

  const updateGroupRecursive = (group, groupId, updater) => {
    if (group.id === groupId) return updater(group);
    return {
      ...group,
      childrenGroups: group.childrenGroups.map((g) => updateGroupRecursive(g, groupId, updater)),
    };
  };

  const addConditionToGroup = (groupId) => {
    setFormData((prev) => ({
      ...prev,
      rootGroup: updateGroupRecursive(prev.rootGroup, groupId, (g) => ({
        ...g,
        conditions: [...g.conditions, newCondition()],
      })),
    }));
  };

  const removeConditionFromGroup = (groupId, condIdx) => {
    setFormData((prev) => ({
      ...prev,
      rootGroup: updateGroupRecursive(prev.rootGroup, groupId, (g) => ({
        ...g,
        conditions: g.conditions.filter((_, i) => i !== condIdx),
      })),
    }));
  };

  const changeCondition = (groupId, condIdx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rootGroup: updateGroupRecursive(prev.rootGroup, groupId, (g) => updateCondition(g, condIdx, field, value)),
    }));
  };

  const changeGroupLogic = (groupId, logic) => {
    setFormData((prev) => ({
      ...prev,
      rootGroup: updateGroupRecursive(prev.rootGroup, groupId, (g) => ({ ...g, logicOperator: logic })),
    }));
  };

  const addSubGroup = (groupId) => {
    setFormData((prev) => ({
      ...prev,
      rootGroup: updateGroupRecursive(prev.rootGroup, groupId, (g) => ({
        ...g,
        childrenGroups: [...g.childrenGroups, newGroup("AND")],
      })),
    }));
  };

  const removeSubGroup = (groupId, childIdx) => {
    setFormData((prev) => ({
      ...prev,
      rootGroup: updateGroupRecursive(prev.rootGroup, groupId, (g) => ({
        ...g,
        childrenGroups: g.childrenGroups.filter((_, i) => i !== childIdx),
      })),
    }));
  };

  /* ---------------- Build payload ---------------- */

  const flattenConditions = (group, acc = []) => {
    for (const c of group.conditions || []) {
      if (c.factorId || c.factorCode) acc.push(c);
    }
    for (const child of group.childrenGroups || []) {
      flattenConditions(child, acc);
    }
    return acc;
  };

  const buildRootGroupPayload = (group) => ({
    id: group.id,
    logicOperator: group.logicOperator,
    children: (group.childrenGroups || []).map(buildRootGroupPayload),
  });

  const buildPayload = () => {
    const flatConditions = flattenConditions(formData.rootGroup);
    return {
      name: formData.name,
      description: formData.description,
      planId: formData.planId,
      appliesTo: formData.appliesTo,
      storeIds: formData.storeIds || [],
      priority: Number(formData.priority || 100),
      status: formData.status,
      rootGroup: buildRootGroupPayload(formData.rootGroup),
      conditions: flatConditions.map((c) => ({
        groupId: null,
        factorId: c.factorId || null,
        factorCode: c.factorCode || "",
        operator: c.operator,
        value: c.value,
        negate: Boolean(c.negate),
      })),
      requiresCommercialApproval: Boolean(formData.requiresCommercialApproval),
      commercialApprovalRule: formData.commercialApprovalRule,
      allowedApproverRoles: formData.allowedApproverRoles || [],
    };
  };

  /* ---------------- Submit / Test ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = buildPayload();
      if (!payload.name) {
        errorMessage("Rule name is required");
        return;
      }
      if (!payload.planId) {
        errorMessage("Please select a plan");
        return;
      }
      if (id) {
        await PlanEligibilityServices.updateRule(id, payload);
        successMessage("Eligibility rule updated successfully");
      } else {
        await PlanEligibilityServices.createRule(payload);
        successMessage("Eligibility rule created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["plan-eligibility"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save eligibility rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    try {
      const payload = buildPayload();
      if (!payload.conditions.length) {
        errorMessage("Add at least one condition before testing");
        return;
      }
      const storeId = "";
      if (!storeId) return;
const res = await PlanEligibilityServices.testRule({
        storeId,
        planId: payload.planId,
        rootGroup: payload.rootGroup,
        conditions: payload.conditions,
      });
      const data = res.data || {};
      setTestResult({
        matched: data.eligible !== undefined ? data.eligible : Boolean(data.matched),
        evaluatedConditions: data.evaluatedConditions || data.matchedRules || [],
      });
      if (data.eligible !== undefined) {
        successMessage(data.eligible ? "Store is ELIGIBLE for this plan" : "Store is NOT eligible for this plan");
      } else {
        successMessage(data.matched ? "Rule MATCHED for this store" : "Rule did NOT match for this store");
      }
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Test failed");
    }
  };

  /* ---------------- Render ---------------- */

  const inputCls =
    "block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  const renderCondition = (group, condIdx, cond) => {
    const factor = factors.find((f) => String(f._id) === String(cond.factorId));
    const isChoice = ["equals", "in", "notIn"].includes(cond.operator);
    return (
      <div key={cond.clientId} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded p-2 border border-dashed border-gray-300 dark:border-gray-600">
        <Button
          type="button"
          onClick={() => removeConditionFromGroup(group.id, condIdx)}
          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          title={t("Remove") || "Remove"}
        >
          âœ•
        </Button>
        {cond.negate && <span className="text-xs font-bold text-orange-500">NOT</span>}
        <select
          value={cond.factorId}
          onChange={(e) => {
            const f = factors.find((fact) => String(fact._id) === String(e.target.value));
            changeCondition(group.id, condIdx, "factorId", e.target.value);
            changeCondition(group.id, condIdx, "factorCode", f?.code || "");
          }}
          className={`${inputCls} min-w-[130px]`}
        >
          <option value="">{t("SelectFactor") || "Select factor..."}</option>
          {factors.map((f) => (
            <option key={f._id} value={f._id}>{f.name}</option>
          ))}
        </select>
        <select
          value={cond.operator}
          onChange={(e) => changeCondition(group.id, condIdx, "operator", e.target.value)}
          className={`${inputCls} min-w-[100px]`}
        >
          {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
            <option key={op} value={op}>{label}</option>
          ))}
        </select>
        {isChoice && factor?.choices?.length ? (
          <select
            value={cond.value}
            onChange={(e) => changeCondition(group.id, condIdx, "value", e.target.value)}
            className={`${inputCls} min-w-[110px]`}
          >
            <option value="">Value</option>
            {factor.choices.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={cond.value}
            onChange={(e) => changeCondition(group.id, condIdx, "value", e.target.value)}
            className={`${inputCls} min-w-[90px]`}
            placeholder="Value"
          />
        )}
        <Button
          type="button"
          onClick={() => changeCondition(group.id, condIdx, "negate", !cond.negate)}
          className={`px-2 py-1 text-xs rounded border ${cond.negate ? "bg-orange-500 text-white" : "bg-white text-gray-600 border-gray-300"}`}
          title={t("ToggleNegate") || "Toggle NOT"}
        >
          NOT
        </Button>
      </div>
    );
  };

  const renderGroup = (group, depth = 0) => {
    return (
      <div
        key={group.id}
        className="border rounded-lg p-3 mb-3"
        style={{ marginLeft: depth * 20, borderLeft: "4px solid #34D399" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Group</span>
            <select
              value={group.logicOperator}
              onChange={(e) => changeGroupLogic(group.id, e.target.value)}
              className="px-2 py-1 text-xs font-bold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              {LOGIC_OPERATORS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <Button
              type="button"
              onClick={() => addConditionToGroup(group.id)}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
            >
              + Condition
            </Button>
            <Button
              type="button"
              onClick={() => addSubGroup(group.id)}
              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
            >
              + Sub-group
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {(group.conditions || []).map((cond, i) => renderCondition(group, i, cond))}
        </div>

        {(group.childrenGroups || []).map((child, idx) => (
          <div key={child.id}>
            {renderGroup(child, depth + 1)}
            <Button
              type="button"
              onClick={() => removeSubGroup(group.id, idx)}
              className="ml-2 text-xs text-red-500 hover:underline"
            >
              Remove sub-group
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditEligibilityRule") || "Edit Eligibility Rule" : t("BuildEligibilityRule") || "Build Eligibility Rule"}
          description={t("EligibilityBuilderDescription") || "No-code builder: define which stores can subscribe/upgrade to a plan with AND/OR/NOT conditions"}
        />
      </div>

      <Scrollbars className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit} className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("RuleName") || "Rule Name"}</label>
              <div className="col-span-8 sm:col-span-4">
                <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} className={inputCls} placeholder="e.g. Enterprise eligibility" />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Description")}</label>
              <div className="col-span-8 sm:col-span-4">
                <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} className={inputCls} rows={2} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Plan")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select value={formData.planId} onChange={(e) => handleChange("planId", e.target.value)} className={inputCls}>
                  <option value="">{t("SelectPlan") || "Select a plan..."}</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("AppliesTo")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select value={formData.appliesTo} onChange={(e) => handleChange("appliesTo", e.target.value)} className={inputCls}>
                  {APPLIES_TO.map((a) => (
                    <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Priority")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input type="number" min="0" value={formData.priority} onChange={(e) => handleChange("priority", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Status")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select value={formData.status} onChange={(e) => handleChange("status", e.target.value)} className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Commercial approval */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("CommercialApproval") || "Require commercial approval"}</label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="checkbox"
                  checked={formData.requiresCommercialApproval}
                  onChange={(e) => handleChange("requiresCommercialApproval", e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </div>
            </div>

            {formData.requiresCommercialApproval && (
              <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("ApprovalRule") || "Approval rule"}</label>
                <div className="col-span-8 sm:col-span-4">
                  <select value={formData.commercialApprovalRule} onChange={(e) => handleChange("commercialApprovalRule", e.target.value)} className={inputCls}>
                    {APPROVAL_RULES.map((a) => (
                      <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Rule builder tree â€” visual */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{t("RuleBuilder") || "Condition Tree (visual)"}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">AND / OR / NOT â€¢ Nested groups</span>
              </div>
              {renderGroup(formData.rootGroup, 0)}
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`border rounded-lg p-4 ${testResult.matched ? "bg-green-50 dark:bg-green-900/20 border-green-300" : "bg-orange-50 dark:bg-orange-900/20 border-orange-300"}`}>
                <p className="font-semibold">
                  {testResult.matched ? "âœ“ Rule MATCHED" : "âœ• Rule did NOT match"}
                </p>
                {(testResult.evaluatedConditions || []).length > 0 && (
                  <ul className="mt-2 text-xs space-y-1">
                    {testResult.evaluatedConditions.map((ec, i) => (
                      <li key={i}>
                        <span className="font-mono">{ec.factorCode || ec.condition?.factorCode}</span> {ec.operator || ec.condition?.operator}{" "}
                        <span className="font-mono">{JSON.stringify(ec.expected)}</span> â†’ actual{" "}
                        <span className="font-mono">{ec.actual}</span>{" "}
                        <strong>{ec.result ? "TRUE" : "FALSE"}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button
              type="button"
              onClick={handleTest}
              className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-md hover:bg-indigo-100"
            >
              {t("TestRule") || "Test Rule"}
            </Button>
            <Button
              type="button"
              onClick={toggleDrawer}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {t("Cancel") || "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? t("Saving") || "Saving..." : id ? t("Update") || "Update" : t("SaveRule") || "Save Rule"}
            </Button>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default PlanEligibilityDrawer;
