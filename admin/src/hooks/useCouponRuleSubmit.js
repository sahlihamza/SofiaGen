import { useContext, useEffect, useState } from "react";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import CouponServices from "@/services/CouponServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const FIELD_OPTIONS = [
  "cartTotal",
  "customerGroup",
  "productCategory",
  "productBrand",
  "productId",
  "customerFirstOrder",
  "customerBirthday",
  "customerRegistrationDate",
  "country",
];

const OPERATOR_OPTIONS = ["equals", "notEquals", "greaterThan", "lessThan", "contains", "between"];

const newLocalId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random()}`;

const newCondition = () => ({
  localId: newLocalId(),
  _id: null,
  field: "cartTotal",
  operator: "greaterThan",
  value: "",
});

const newGroup = () => ({
  localId: newLocalId(),
  _id: null,
  logicOperator: "AND",
  conditions: [newCondition()],
});

// Server condition docs store `value` as a plain scalar/array; the "between"
// operator needs two inputs in the UI, so it's split into valueMin/valueMax
// locally and re-joined into an array on save.
const toLocalCondition = (rule) => ({
  localId: newLocalId(),
  _id: rule._id,
  field: rule.field,
  operator: rule.operator,
  value: rule.operator === "between" ? "" : rule.value,
  valueMin: rule.operator === "between" ? rule.value?.[0] ?? "" : "",
  valueMax: rule.operator === "between" ? rule.value?.[1] ?? "" : "",
});

const useCouponRuleSubmit = (id, isActive) => {
  const { isDrawerOpen, setIsUpdate } = useContext(SidebarContext);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) {
      setGroups([]);
      return;
    }
    if (!id || !isActive) return;

    (async () => {
      try {
        setIsLoading(true);
        const res = await CouponServices.getCouponRules(id);
        const serverGroups = res?.data || [];
        setGroups(
          serverGroups.length
            ? serverGroups.map((g) => ({
                localId: newLocalId(),
                _id: g._id,
                logicOperator: g.logicOperator,
                conditions: (g.conditionIds || []).map(toLocalCondition),
              }))
            : [newGroup()]
        );
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isDrawerOpen, isActive]);

  const addGroup = () => setGroups((prev) => [...prev, newGroup()]);

  const removeGroup = (groupLocalId) =>
    setGroups((prev) => prev.filter((g) => g.localId !== groupLocalId));

  const setGroupLogicOperator = (groupLocalId, logicOperator) =>
    setGroups((prev) => prev.map((g) => (g.localId === groupLocalId ? { ...g, logicOperator } : g)));

  const addCondition = (groupLocalId) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.localId === groupLocalId ? { ...g, conditions: [...g.conditions, newCondition()] } : g
      )
    );

  const removeCondition = (groupLocalId, conditionLocalId) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.localId === groupLocalId
          ? { ...g, conditions: g.conditions.filter((c) => c.localId !== conditionLocalId) }
          : g
      )
    );

  const setConditionField = (groupLocalId, conditionLocalId, field, value) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.localId === groupLocalId
          ? {
              ...g,
              conditions: g.conditions.map((c) =>
                c.localId === conditionLocalId ? { ...c, [field]: value } : c
              ),
            }
          : g
      )
    );

  const handleSave = async () => {
    if (!id) return;
    try {
      setIsSubmitting(true);

      for (const group of groups) {
        const conditionIds = [];

        for (const condition of group.conditions) {
          const payload = {
            field: condition.field,
            operator: condition.operator,
            value:
              condition.operator === "between"
                ? [condition.valueMin, condition.valueMax]
                : condition.value,
          };

          if (condition._id) {
            const res = await CouponServices.updateRuleCondition(id, condition._id, payload);
            conditionIds.push(res.data._id);
          } else {
            const res = await CouponServices.addRuleCondition(id, payload);
            conditionIds.push(res.data._id);
          }
        }

        if (group._id) {
          await CouponServices.updateRuleGroup(id, group._id, {
            logicOperator: group.logicOperator,
            conditionIds,
          });
        } else {
          await CouponServices.addRuleGroup(id, {
            logicOperator: group.logicOperator,
            conditionIds,
          });
        }
      }

      notifySuccess("Régles enregistrées avec succès");
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!group._id) {
      removeGroup(group.localId);
      return;
    }
    try {
      await CouponServices.deleteRuleGroup(id, group._id);
      removeGroup(group.localId);
      notifySuccess("Groupe supprimé avec succès");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleDeleteCondition = async (group, condition) => {
    if (!condition._id) {
      removeCondition(group.localId, condition.localId);
      return;
    }
    try {
      await CouponServices.deleteRuleCondition(id, condition._id);
      removeCondition(group.localId, condition.localId);
      notifySuccess("Condition supprimée avec succès");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  return {
    groups,
    isLoading,
    isSubmitting,
    addGroup,
    removeGroup: handleDeleteGroup,
    setGroupLogicOperator,
    addCondition,
    removeCondition: handleDeleteCondition,
    setConditionField,
    handleSave,
    FIELD_OPTIONS,
    OPERATOR_OPTIONS,
  };
};

export default useCouponRuleSubmit;
