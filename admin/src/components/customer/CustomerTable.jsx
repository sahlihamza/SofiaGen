import { Badge, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import dayjs from "dayjs";
import { t } from "i18next";
import React from "react";
import { FiZoomIn } from "react-icons/fi";
import { Link } from "react-router-dom";

//internal import

import Tooltip from "@/components/tooltip/Tooltip";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import useGetCData from "@/hooks/useGetCData";

// The backend stores the name split in two columns and exposes a "name"
// virtual; fall back on it for documents created by the storefront.
const getCustomerName = (customer) =>
  [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
  customer?.name ||
  "";

const statusBadgeType = {
  active: "success",
  inactive: "warning",
  blocked: "danger",
};

const statusLabelKey = {
  active: "CustomerStatusActive",
  inactive: "CustomerStatusInactive",
  blocked: "CustomerStatusBlocked",
};

const CustomerTable = ({ customers, handleUpdate, handleModalOpen }) => {
  const { hasPermission } = useGetCData();
  const canUpdateCustomer = hasPermission("customers", "update");
  const canDeleteCustomer = hasPermission("customers", "delete");

  return (
    <>
      <TableBody>
        {customers?.map((user) => (
          <TableRow key={user._id}>
            <TableCell>
              <span className="font-semibold uppercase text-xs">
                {" "}
                {user?._id?.substring(20, 24)}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {dayjs(user.createdAt).format("MMM D, YYYY")}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm">{getCustomerName(user)}</span>
            </TableCell>
            <TableCell>
              <span className="text-sm">{user.email}</span>{" "}
            </TableCell>
            <TableCell>
              <span className="text-sm font-medium">{user.phone}</span>
            </TableCell>
            <TableCell>
              <Badge type={statusBadgeType[user.status] || "neutral"}>
                {t(statusLabelKey[user.status] || "CustomerStatusActive")}
              </Badge>
            </TableCell>

            <TableCell>
              <div className="flex justify-end text-right">
                <div className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600">
                  {" "}
                  <Link to={`/customer-order/${user._id}`}>
                    <Tooltip
                      id="view"
                      Icon={FiZoomIn}
                      title={t("ViewOrder")}
                      bgColor="#34D399"
                    />
                  </Link>
                </div>

                <EditDeleteButton
                  title={getCustomerName(user)}
                  id={user._id}
                  handleUpdate={handleUpdate}
                  handleModalOpen={handleModalOpen}
                  showEdit={canUpdateCustomer}
                  showDelete={canDeleteCustomer}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default CustomerTable;
