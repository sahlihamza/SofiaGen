import { Input, Select } from "@windmill/react-ui";
import { FiTrash2 } from "react-icons/fi";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useTranslation } from "react-i18next";
import { IconButton } from "@sofia/ui";

//internal import
import DrawerButton from "@/components/form/button/DrawerButton";
import useCouponRuleSubmit from "@/hooks/useCouponRuleSubmit";
import { Button } from "@sofia/ui";

const DATE_FIELDS = new Set(["customerBirthday", "customerRegistrationDate"]);
const BOOLEAN_FIELDS = new Set(["customerFirstOrder"]);

const CouponRulesForm = ({ id, isActive }) => {
  const { t } = useTranslation();
  const {
    groups,
    isLoading,
    isSubmitting,
    addGroup,
    removeGroup,
    setGroupLogicOperator,
    addCondition,
    removeCondition,
    setConditionField,
    handleSave,
    FIELD_OPTIONS,
    OPERATOR_OPTIONS,
  } = useCouponRuleSubmit(id, isActive);

  if (isLoading) {
    return <div className="px-6 pt-8 text-sm text-gray-400">{t("Processing")}</div>;
  }

  const renderValueInput = (group, condition) => {
    const inputType = DATE_FIELDS.has(condition.field) ? "date" : "text";

    if (BOOLEAN_FIELDS.has(condition.field)) {
      return (
        <Select
          value={String(condition.value)}
          onChange={(e) =>
            setConditionField(group.localId, condition.localId, "value", e.target.value === "true")
          }
        >
          <option value="true">{t("Yes")}</option>
          <option value="false">{t("No")}</option>
        </Select>
      );
    }

    if (condition.operator === "between") {
      return (
        <div className="flex gap-2">
          <Input
            type={inputType === "date" ? "date" : "number"}
            value={condition.valueMin}
            placeholder={t("CouponRuleMinValue")}
            onChange={(e) => setConditionField(group.localId, condition.localId, "valueMin", e.target.value)}
          />
          <Input
            type={inputType === "date" ? "date" : "number"}
            value={condition.valueMax}
            placeholder={t("CouponRuleMaxValue")}
            onChange={(e) => setConditionField(group.localId, condition.localId, "valueMax", e.target.value)}
          />
        </div>
      );
    }

    return (
      <Input
        type={inputType}
        value={condition.value}
        placeholder={t("CouponRuleValuePlaceholder")}
        onChange={(e) => setConditionField(group.localId, condition.localId, "value", e.target.value)}
      />
    );
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
      <form onSubmit={onSubmit}>
        <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <p className="text-sm text-gray-400 mb-6">{t("CouponRulesHelpText")}</p>

        {groups.map((group, groupIndex) => (
          <div
            key={group.localId}
            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {t("CouponRuleGroupLabel")} {groupIndex + 1}
                </span>
                <Select
                  className="w-auto"
                  value={group.logicOperator}
                  onChange={(e) => setGroupLogicOperator(group.localId, e.target.value)}
                >
                  <option value="AND">{t("CouponRuleAnd")}</option>
                  <option value="OR">{t("CouponRuleOr")}</option>
                </Select>
              </div>
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => removeGroup(group)}
                className="text-gray-400 hover:text-red-600"
                title={t("CouponRuleDeleteGroup")}
              >
                <FiTrash2 size={16} />
              </IconButton>
            </div>

            {group.conditions.map((condition) => (
              <div
                key={condition.localId}
                className="grid grid-cols-12 gap-2 items-center mb-3"
              >
                <div className="col-span-4">
                  <Select
                    value={condition.field}
                    onChange={(e) =>
                      setConditionField(group.localId, condition.localId, "field", e.target.value)
                    }
                  >
                    {FIELD_OPTIONS.map((field) => (
                      <option key={field} value={field}>
                        {t(`CouponRuleField_${field}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Select
                    value={condition.operator}
                    onChange={(e) =>
                      setConditionField(group.localId, condition.localId, "operator", e.target.value)
                    }
                  >
                    {OPERATOR_OPTIONS.map((operator) => (
                      <option key={operator} value={operator}>
                        {t(`CouponRuleOperator_${operator}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-4">{renderValueInput(group, condition)}</div>
                <div className="col-span-1 flex justify-center">
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => removeCondition(group, condition)}
                    className="text-gray-400 hover:text-red-600"
                    title={t("CouponRuleDeleteCondition")}
                  >
                    <FiTrash2 size={14} />
                  </IconButton>
                </div>
              </div>
            ))}

            <Button
              type="button"
              layout="outline"
              className="mt-2 h-9 text-xs"
              onClick={() => addCondition(group.localId)}
            >
              {t("CouponRuleAddCondition")}
            </Button>
          </div>
        ))}

        <Button type="button" layout="outline" className="h-10" onClick={addGroup}>
          {t("CouponRuleAddGroup")}
        </Button>
      </div>

      <DrawerButton id={id} title={t("CouponRulesTabTitle")} isSubmitting={isSubmitting} zIndex="z-20" />
      </form>
    </Scrollbars>
  );
};

export default CouponRulesForm;
