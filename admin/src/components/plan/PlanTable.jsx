import { Badge, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

// Internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import CheckBox from "@/components/form/others/CheckBox";
import ActionMenu from "@/components/table/ActionMenu";
import { FiCopy, FiCheckCircle, FiXCircle } from "react-icons/fi";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import useGetCData from "@/hooks/useGetCData";
import { useTranslation } from "react-i18next";
import formatMoney from "@/utils/formatMoney";

const PlanTable = ({ isCheck, plans, setIsCheck, onClone, onStatusToggle }) => {
  const { t } = useTranslation();
  const [updatedPlans, setUpdatedPlans] = useState([]);
  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();
  const { showDateFormat, globalSetting } = useUtilsFunction();
  const { hasPermission } = useGetCData();
  const canUpdatePlan = hasPermission("plans", "update");
  const canDeletePlan = hasPermission("plans", "delete");
  const canClonePlan = hasPermission("plans", "update");
  const canActivatePlan = hasPermission("plans", "activate");
  const canDeactivatePlan = hasPermission("plans", "deactivate");

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { type: "warning", label: t("Draft") },
      active: { type: "success", label: t("Active") },
      inactive: { type: "danger", label: t("Inactive") },
      archived: { type: "gray", label: t("Archived") },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge type={config.type}>{config.label}</Badge>;
  };

  const getExtraActions = (plan) => {
    const actions = [];

    if (canActivatePlan && plan.status === "inactive") {
      actions.push({
        key: "activate",
        Icon: FiCheckCircle,
        label: t("Activate"),
        className: "text-gray-500 dark:text-gray-400 hover:text-emerald-600",
        onClick: () => onStatusToggle?.(plan._id, "active"),
      });
    }

    if (canDeactivatePlan && plan.status === "active") {
      actions.push({
        key: "deactivate",
        Icon: FiXCircle,
        label: t("Deactivate"),
        className: "text-gray-500 dark:text-gray-400 hover:text-red-600",
        onClick: () => onStatusToggle?.(plan._id, "inactive"),
      });
    }

    return actions;
  };

  useEffect(() => {
    const result = plans?.map((el) => {
      const newDate = new Date(el?.updatedAt).toLocaleString("en-US", {
        timeZone: globalSetting?.default_time_zone,
      });
      const newObj = {
        ...el,
        updatedDate: newDate,
      };
      return newObj;
    });
    setUpdatedPlans(result);
  }, [plans, globalSetting?.default_time_zone]);

  return (
    <>
      {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}
      <TableBody>
        {updatedPlans?.map((plan, i) => (
          <TableRow key={i + 1}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name={plan?.name}
                id={plan._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(plan._id)}
              />
            </TableCell>

            <TableCell>
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-semibold">
                    <Link
                      to={`/plans/${plan._id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {plan.name}
                    </Link>
                  </p>
                  <p className="text-xs text-gray-500">{plan.slug}</p>
                </div>
              </div>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {formatMoney(plan.pricing?.monthly, plan.pricing?.currency)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {formatMoney(plan.pricing?.yearly, plan.pricing?.currency)}
              </span>
            </TableCell>

<TableCell>
               <span className="text-sm">{plan.pricing?.currency}</span>
             </TableCell>

             <TableCell>
               <span className="text-sm">
                 {plan.pricing?.trialDays || 0}
               </span>
             </TableCell>

             <TableCell>
               <span className="text-sm">
                 {plan.badge || "-"}
               </span>
             </TableCell>

              <TableCell>
                <span className="text-sm">
                  {plan.color || "-"}
                </span>
              </TableCell>

              <TableCell className="text-center">
                <span className="text-sm font-semibold">v{plan.version || 1}</span>
              </TableCell>

              <TableCell className="text-center">
                {getStatusBadge(plan.status)}
              </TableCell>

            <TableCell>
              <span className="text-sm">
                {plan.storesCount || 0}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {showDateFormat(plan.createdAt)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {showDateFormat(plan.updatedAt)}
              </span>
            </TableCell>

            <TableCell>
              <div className="flex justify-center space-x-3">
                <ActionMenu
                  id={plan._id}
                  title={plan.name}
                  isCheck={isCheck}
                  handleUpdate={canUpdatePlan ? handleUpdate : undefined}
                  handleClone={onClone}
                  handleModalOpen={
                    canDeletePlan && plan.status === "draft"
                      ? handleModalOpen
                      : undefined
                  }
                  showEdit={canUpdatePlan}
                  showClone={canClonePlan}
                  showDelete={canDeletePlan && plan.status === "draft"}
                  extraActions={getExtraActions(plan)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default PlanTable;
