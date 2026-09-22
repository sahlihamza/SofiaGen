import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import Title from "@/components/form/others/Title";
import TrialRuleServices from "@/services/TrialRuleServices";
import TrialFactorServices from "@/services/TrialFactorServices";
import PlanServices from "@/services/PlanServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";

const LOGIC_OPERATORS = ["AND", "OR", "NOT"];
const STATUSES = ["draft", "active", "inactive", "archived"];
const APPLIES_TO = ["all", "new_stores", "existing_stores", "specific_plans", "specific_stores"];
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

import PromptModal from "@/components/modal/PromptModal";
import { Button } from "@sofia/ui";

const TrialRuleBuilderDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [pendingPromptAction, setPendingPromptAction] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    appliesTo: "new_stores",
    planIds: [],
    priority: 100,
    status: "draft",
    rootGroup: newGroup("OR"),
    actions: [{ actionType: "end_trial", label: "", config: {} }],
  });

  const { data: factorsData } = useQuery({
    queryKey: ["trial-factors"],
    queryFn: () => TrialFactorServices.getAllTrialFactors({ sort: "category" }),
  });
  const factors = factorsData?.data || [];

const { data: plansData } = useQuery({
    queryKey: ["plans-list"],
    queryFn: () => PlanServices.getAllPlans({ limit: 100, sort: "-createdAt" }),
  });
  const plans = plansData?.data || [];

  const { data: actionTypesData } = useQuery({
    queryKey: ["trial-action-types"],
    queryFn: () => TrialRuleServices.getTrialActionTypes(),
  });
  const actionTypes = actionTypesData?.data || [];

  const [testResult, setTestResult] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);

  useEffect(() => {
    if (id) {
      TrialRuleServices.getTrialRuleById(id).then((res) => {
        const r = res.data;
        const conditions = r.conditions || [];
        const actions = r.actions || [];

        let rootGroup;
        if (r.rootGroup && r.rootGroup.logicOperator) {
          // Convert stored tree: group.children groups + conditionIds
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
            logicOperator: "OR",
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
          appliesTo: r.appliesTo || "new_stores",
          planIds: (r.planIds || []).map((p) => (p?._id ? p._id : p)),
          priority: r.priority ?? 100,
          status: r.status || "draft",
          rootGroup,
          actions:
            actions.length > 0
              ? actions.map((a) => ({
                  actionType: a.actionType,
                  label: a.label || "",
                  config: a.config || {},
                }))
              : [{ actionType: "end_trial", label: "", config: {} }],
        });
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------------- Group helpers ---------------- */

  const updateCondition = (group, condIdx, field, value, depth = 0) => {
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

  /* ---------------- Actions ---------------- */

  const addAction = () => {
    setFormData((prev) => ({
      ...prev,
      actions: [...prev.actions, { actionType: "notify", label: "", config: {} }],
    }));
  };

  const changeAction = (idx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    }));
  };

  const removeAction = (idx) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== idx),
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
      appliesTo: formData.appliesTo,
      planIds: formData.planIds || [],
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
      actions: formData.actions.map((a) => ({
        actionType: a.actionType,
        label: a.label,
        config: a.config || {},
      })),
    };
  };

  /* ---------------- Submit / Test / Preview ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = buildPayload();
      if (!payload.name) {
        errorMessage("Rule name is required");
        return;
      }
      if (id) {
        await TrialRuleServices.updateTrialRule(id, payload);
        successMessage("Trial rule updated successfully");
      } else {
        await TrialRuleServices.createTrialRule(payload);
        successMessage("Trial rule created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["trial-rules"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save trial rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    try {
      setTestResult(null);
      const payload = buildPayload();
      if (!payload.conditions.length) {
        errorMessage("Add at least one condition before testing");
        return;
      }
      setPromptConfig({ title: "Enter a Store ID to test against:", message: "", placeholder: "", defaultValue: "" });
      setPendingPromptAction(async (value) => {
        if (!value) return;
        try {
          const res = await TrialRuleServices.previewTrialRule({
            storeId: value,
            rootGroup: payload.rootGroup,
            conditions: payload.conditions,
            actions: payload.actions,
          });
          setTestResult(res.data);
          successMessage(res.data.matched ? "Rule MATCHED for this store" : "Rule did NOT match for this store");
        } catch (err) {
          errorMessage(err?.response?.data?.message || "Test failed");
        }
      });
      setIsPromptOpen(true);
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Test failed");
    }
  };

  /* ---------------- Render ---------------- */

  const inputCls =
    "block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  const renderCondition = (group, condIdx, cond) => {
    const isTime = factors.find((f) => String(f._id) === String(cond.factorId))?.category === "time";
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
        {isTime ? (
          <select
            value={cond.value}
            onChange={(e) => changeCondition(group.id, condIdx, "value", e.target.value)}
            className={`${inputCls} min-w-[110px]`}
          >
            <option value="">Value</option>
            {[3, 7, 14, 21, 30, 45, 60, 90].map((n) => (
              <option key={n} value={n}>{n}</option>
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
        style={{ marginLeft: depth * 20, borderLeft: "4px solid #818CF8" }}
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
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditTrialRule") || "Edit Trial Rule" : t("BuildTrialRule") || "Build Trial Rule"}
          description={t("TrialRuleBuilderDescription") || "No-code builder: define trial end conditions with AND/OR/NOT and actions"}
        />
      </div>

      <Scrollbars className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit} className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("RuleName") || "Rule Name"}</label>
              <div className="col-span-8 sm:col-span-4">
                <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} className={inputCls} placeholder="e.g. Standard Trial" />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Description")}</label>
              <div className="col-span-8 sm:col-span-4">
                <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} className={inputCls} rows={2} />
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

            {/* Rule builder tree â€” visual */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{t("RuleBuilder") || "Condition Tree (visual)"}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">AND / OR / NOT â€¢ Nested groups</span>
              </div>
              {renderGroup(formData.rootGroup, 0)}
            </div>

            {/* Actions */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{t("ActionsWhenMatched") || "Actions when matched"}</span>
                <Button type="button" onClick={addAction} className="px-2 py-1 text-xs bg-purple-600 text-white rounded">
                  + Action
                </Button>
              </div>
              {formData.actions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <select
                    value={action.actionType}
                    onChange={(e) => changeAction(idx, "actionType", e.target.value)}
                    className={`${inputCls} min-w-[150px]`}
                  >
                    {(actionTypes.length > 0 ? actionTypes : []).map((at) => (
                      <option key={at.code} value={at.code}>{at.label}</option>
                    ))}
                    {actionTypes.length === 0 && (
                      <>
                        <option value="end_trial">End Trial</option>
                        <option value="suspend_store">Suspend Store</option>
                        <option value="read_only">Read Only</option>
                        <option value="create_invoice">Create Invoice</option>
                        <option value="notify">Notify</option>
                        <option value="webhook">Webhook</option>
                        <option value="grace_period">Grace Period</option>
                        <option value="downgrade">Downgrade</option>
                        <option value="archive">Archive</option>
                        <option value="custom_action">Custom Action</option>
                      </>
                    )}
                  </select>
                  <input
                    type="text"
                    value={action.label}
                    onChange={(e) => changeAction(idx, "label", e.target.value)}
                    className={inputCls}
                    placeholder="Label"
                  />
                  {action.actionType === "grace_period" && (
                    <input
                      type="number"
                      min="0"
                      value={action.config?.graceDays || ""}
                      onChange={(e) =>
                        changeAction(idx, "config", { ...action.config, graceDays: Number(e.target.value) })
                      }
                      className={`${inputCls} min-w-[90px]`}
                      placeholder="Days"
                    />
                  )}
                  {action.actionType === "webhook" && (
                    <input
                      type="text"
                      value={action.config?.webhookUrl || ""}
                      onChange={(e) => changeAction(idx, "config", { ...action.config, webhookUrl: e.target.value })}
                      className={inputCls}
                      placeholder="https://..."
                    />
                  )}
                  <Button type="button" onClick={() => removeAction(idx)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">
                    âœ•
                  </Button>
                </div>
              ))}
            </div>

            {/* Test/Preview result */}
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

export default TrialRuleBuilderDrawer;
