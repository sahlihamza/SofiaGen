import { Avatar, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiStar } from "react-icons/fi";
import { useHistory } from "react-router-dom";

import StaffActionsMenu from "@/components/staff/StaffActionsMenu";
import useGetCData from "@/hooks/useGetCData";
import RiderServices from "@/services/RiderServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { getRiderImageUrl } from "@/utils/getRiderImageUrl";
import { SidebarContext } from "@/context/SidebarContext";
import { Button } from "@sofia/ui";

const RiderTable = ({ riders, checkedIds, onToggleCheck, handleUpdate, handleModalOpen }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { setIsUpdate } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const [togglingId, setTogglingId] = useState(null);

  const canUpdateRider = hasPermission("riders", "update");
  const canDeleteRider = hasPermission("riders", "delete");

  const handleViewRider = (id) => history.push(`/riders/${id}`);

  const handleToggleStatus = async (rider) => {
    setTogglingId(rider._id);
    try {
      await RiderServices.updateRiderStatus(rider._id);
      notifySuccess(t("RiderStatusUpdateSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      <TableBody>
        {riders?.map((rider) => (
          <TableRow key={rider._id}>
            <TableCell>
              <input
                type="checkbox"
                checked={checkedIds?.includes(rider._id)}
                onChange={() => onToggleCheck(rider._id)}
              />
            </TableCell>

            <TableCell>
              <Button
                type="button"
                onClick={() => handleViewRider(rider._id)}
                className="flex items-center text-left"
              >
                {rider.image ? (
                  <Avatar
                    className="hidden mr-3 md:block bg-gray-50"
                    src={getRiderImageUrl(rider.image)}
                    alt={rider.name}
                  />
                ) : (
                  <div className="hidden mr-3 md:flex h-10 w-10 rounded-full items-center justify-center bg-gray-200 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200 flex-shrink-0">
                    {rider.name
                      ?.split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-medium hover:text-emerald-600">{rider.name}</h2>
                  <p className="text-xs text-gray-400">{rider.email}</p>
                </div>
              </Button>
            </TableCell>

            <TableCell>
              <span className="text-sm">{rider.phone}</span>
            </TableCell>

            <TableCell>
              <span className="text-sm">{rider.vehicleType || "-"}</span>
            </TableCell>

            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rider.availability === "Ã€ La Livraison"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {rider.availability}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {rider.completedDeliveries || 0}/{rider.totalDeliveries || 0}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm flex items-center gap-1">
                <FiStar className="text-yellow-400 fill-current" size={14} />
                {rider.averageRating || 0} ({rider.reviewsCount || 0})
              </span>
            </TableCell>

            <TableCell className="text-center">
              <Button
                onClick={() => handleToggleStatus(rider)}
                disabled={togglingId === rider._id || !canUpdateRider}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  rider.status === "Active" ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rider.status === "Active" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </Button>
            </TableCell>

            <TableCell>
              <div className="flex justify-center items-center">
                <StaffActionsMenu
                  id={rider._id}
                  isSubmitting={togglingId === rider._id}
                  handleUpdate={handleUpdate}
                  handleModalOpen={handleModalOpen}
                  handleView={() => handleViewRider(rider._id)}
                  title={rider?.name}
                  status={rider?.status}
                  showEdit={canUpdateRider}
                  showDelete={canDeleteRider}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default RiderTable;