import React, { useEffect, useRef, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { SidebarContext } from "@/context/SidebarContext";
import platformAPI from "@/services/api/platformAPI";
import { notifySuccess, notifyError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import {
import { Button } from "@sofia/ui";
  FiEdit,
  FiEye,
  FiMoreVertical,
  FiTrash2,
  FiKey,
  FiMail,
  FiShield,
  FiLock,
  FiUnlock,
  FiArchive,
  FiDownload,
  FiCopy,
  FiLogIn,
  FiLogOut,
  FiSliders,
  FiFileText,
  FiActivity,
  FiClock,
  FiUserPlus,
  FiSettings,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiTerminal,
  FiUsers,
  FiFolder,
  FiBarChart2,
  FiPieChart,
  FiDollarSign,
  FiShoppingCart,
  FiPackage,
  FiTruck,
  FiHeart,
  FiStar,
  FiMessageSquare,
  FiGlobe,
  FiFlag,
  FiZap,
  FiDatabase,
  FiServer,
  FiWifi,
  FiBluetooth,
  FiCamera,
  FiImage,
  FiVideo,
  FiMusic,
  FiFolderPlus,
  FiPauseCircle,
  FiMonitor,
} from "react-icons/fi";
import ActionMenuItem from "@/components/table/ActionMenuItem";

const MENU_WIDTH = 200;

const StaffActionsMenu = ({
  id,
  title,
  handleUpdate,
  handleModalOpen,
  handleView,
  handleDetailsModalOpen,
  isSubmitting,
  status,
  showView = true,
  showEdit = true,
  showDelete = true,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef();
  const menuRef = useRef();

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // Fixed positioning relative to the viewport â€” immune to nested
      // scroll containers and overflow-hidden ancestors.
      const VIEWPORT_PAD = 8;
      const EST_HEIGHT = 460;
      const left = Math.max(
        VIEWPORT_PAD,
        Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - VIEWPORT_PAD)
      );
      let top = rect.bottom + 4;
      if (top + EST_HEIGHT > window.innerHeight - VIEWPORT_PAD) {
        top = Math.max(VIEWPORT_PAD, rect.top - EST_HEIGHT);
      }
      setMenuPosition({ top, left });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (e) => {
      if (
        !menuRef?.current?.contains(e.target) &&
        !buttonRef?.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleReposition = () => setIsOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen]);

  if (!showView && !showEdit && !showDelete) return null;

  const { setIsUpdate } = useContext(SidebarContext);

  const executeAction = async (actionFn, successMsg) => {
    try {
      await actionFn();
      notifySuccess(successMsg);
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "An error occurred");
    } finally {
      setIsOpen(false);
    }
  };

  const menuItems = [
    { icon: FiEye, label: t("ViewProfile") || "View Profile", action: () => { setIsOpen(false); handleView?.(id); }, show: showView },
    { icon: FiEdit, label: t("Edit") || "Edit", action: () => { setIsOpen(false); handleUpdate?.(id); }, show: showEdit },
    { divider: true, show: showEdit || showView },
    { icon: FiSliders, label: t("ChangeRole") || "Change Role", action: () => { setIsOpen(false); handleUpdate?.(id); }, show: showEdit },
    { icon: FiSettings, label: t("ManagePermissions") || "Manage Permissions", action: () => { setIsOpen(false); handleUpdate?.(id); }, show: showEdit },
    { divider: true, show: showEdit },
    { icon: FiAlertTriangle, label: t("BlockUser") || "Block User", action: () => executeAction(() => platformAPI.blockUser(id, {}), "User blocked successfully"), show: status !== "Blocked" },
    { icon: FiUnlock, label: t("UnblockUser") || "Unblock User", action: () => executeAction(() => platformAPI.unblockUser(id), "User unblocked successfully"), show: status === "Blocked" },
    { icon: FiPauseCircle, label: t("Suspend") || "Suspend", action: () => executeAction(() => platformAPI.suspendUser(id, {}), "User suspended successfully"), show: status === "Active" || status === "Pending" },
    { icon: FiCheckCircle, label: t("Activate") || "Activate", action: () => executeAction(() => platformAPI.reactivateUser(id), "User activated successfully"), show: status === "Inactive" || status === "Suspended" },
    { divider: true, show: showDelete },
    { icon: FiTrash2, label: t("Delete") || "Delete", action: () => { setIsOpen(false); handleModalOpen?.(id, title); }, show: showDelete },
    { icon: FiArchive, label: t("Archive") || "Archive", action: () => executeAction(() => platformAPI.archiveUser(id, {}), "User archived successfully"), show: showDelete },
    { divider: true, show: true },
    { icon: FiKey, label: t("ResetPassword") || "Reset Password", action: () => executeAction(() => platformAPI.sendSetupEmail(id), "Password reset email sent"), show: true },
    { icon: FiShield, label: t("ForcePasswordChange") || "Force Password Change", action: () => executeAction(() => platformAPI.forcePasswordChange(id, {}), "User will be forced to change password"), show: true },
    { icon: FiRefreshCw, label: t("Reset2FA") || "Reset 2FA", action: () => executeAction(() => platformAPI.reset2FA(id), "2FA has been reset"), show: true },
    { divider: true, show: true },
    { icon: FiLogOut, label: t("RevokeAllSessions") || "Revoke All Sessions", action: () => executeAction(() => platformAPI.revokeAllSessions(id), "All sessions revoked"), show: true },
    { divider: true, show: true },
    { icon: FiDownload, label: t("ExportUser") || "Export User", action: () => executeAction(() => platformAPI.bulkExport({ ids: [id] }), "Export initiated"), show: true },
    { icon: FiCopy, label: t("CopyUserID") || "Copy User ID", action: () => { setIsOpen(false); navigator.clipboard?.writeText(id); notifySuccess("User ID copied"); }, show: true },
  ];

  return (
    <>
      <Button
        type="button"
        ref={buttonRef}
        onClick={openMenu}
        className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 focus:outline-none"
      >
        <FiMoreVertical className="w-5 h-5" />
      </Button>

      {isOpen &&
        createPortal(
          <ul
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: MENU_WIDTH,
              maxHeight: `calc(100vh - ${menuPosition.top + 8}px)`,
              overflowY: "auto",
            }}
            className="z-50 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:outline-none"
          >
            {menuItems
              .filter(item => item.show !== false)
              .map((item, index, array) => {
              if (item.divider) {
                // Prevent duplicate dividers or dividers at the end
                if (index === 0 || index === array.length - 1 || array[index - 1].divider) return null;
                return (
                  <li key={`divider-${index}`}>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Button
                    type="button"

                    disabled={isSubmitting}
                    onClick={item.action}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-emerald-400"
                    icon={<item.icon className="w-4 h-4" />}
                  >
                    {item.label}
                  </Button>

                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
};

export default StaffActionsMenu;