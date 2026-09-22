import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalBody, ModalFooter, Textarea, Input } from "@windmill/react-ui";
import ModalUI from "@/components/ui/Modal";
import {
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";
  FiAlertTriangle,
  FiTrash2,
  FiShieldOff,
  FiPower,
  FiLock,
  FiUnlock,
  FiRefreshCw,
  FiCopy,
  FiLogIn,
  FiArchive,
  FiRotateCcw,
  FiUserPlus,
  FiSend,
  FiKey,
  FiCheck,
  FiX,
  FiUserMinus,
} from "react-icons/fi";


const ACTION_CONFIG = {
  delete: {
    icon: FiTrash2,
    iconColor: "text-red-500",
    titleKey: "DeleteUser",
    confirmKey: "Delete",
    confirmClass: "bg-red-600 hover:bg-red-700",
    needsReason: true,
    reasonLabel: "DeletionReason",
    reasonPlaceholder: "EnterDeletionReason",
  },
  suspend: {
    icon: FiShieldOff,
    iconColor: "text-orange-500",
    titleKey: "SuspendUser",
    confirmKey: "Suspend",
    confirmClass: "bg-orange-600 hover:bg-orange-700",
    needsReason: true,
    reasonLabel: "SuspensionReason",
    reasonPlaceholder: "EnterSuspensionReason",
  },
  block: {
    icon: FiShieldOff,
    iconColor: "text-red-500",
    titleKey: "BlockUser",
    confirmKey: "Block",
    confirmClass: "bg-red-600 hover:bg-red-700",
    needsReason: true,
    reasonLabel: "BlockReason",
    reasonPlaceholder: "EnterBlockReason",
  },
  reactivate: {
    icon: FiPower,
    iconColor: "text-emerald-500",
    titleKey: "ReactivateUser",
    confirmKey: "Reactivate",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  unblock: {
    icon: FiUnlock,
    iconColor: "text-emerald-500",
    titleKey: "UnblockUser",
    confirmKey: "Unblock",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  archive: {
    icon: FiArchive,
    iconColor: "text-purple-500",
    titleKey: "ArchiveUser",
    confirmKey: "Archive",
    confirmClass: "bg-purple-600 hover:bg-purple-700",
    needsReason: true,
    reasonLabel: "ArchiveReason",
    reasonPlaceholder: "EnterArchiveReason",
  },
  unarchive: {
    icon: FiRotateCcw,
    iconColor: "text-emerald-500",
    titleKey: "UnarchiveUser",
    confirmKey: "Unarchive",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  impersonate: {
    icon: FiUserPlus,
    iconColor: "text-blue-500",
    titleKey: "ImpersonateUser",
    confirmKey: "Impersonate",
    confirmClass: "bg-blue-600 hover:bg-blue-700",
  },
  reset_password: {
    icon: FiKey,
    iconColor: "text-blue-500",
    titleKey: "ResetPassword",
    confirmKey: "ResetPassword",
    confirmClass: "bg-blue-600 hover:bg-blue-700",
    needsPassword: true,
  },
  force_password_change: {
    icon: FiLock,
    iconColor: "text-amber-500",
    titleKey: "ForcePasswordChange",
    confirmKey: "ForcePasswordChange",
    confirmClass: "bg-amber-600 hover:bg-amber-700",
    needsPassword: true,
  },
  reset_2fa: {
    icon: FiRefreshCw,
    iconColor: "text-indigo-500",
    titleKey: "Reset2FA",
    confirmKey: "Reset2FA",
    confirmClass: "bg-indigo-600 hover:bg-indigo-700",
  },
  logout_all_devices: {
    icon: FiLogIn,
    iconColor: "text-red-500",
    titleKey: "LogoutAllDevices",
    confirmKey: "LogoutAll",
    confirmClass: "bg-red-600 hover:bg-red-700",
  },
  duplicate: {
    icon: FiCopy,
    iconColor: "text-gray-500",
    titleKey: "DuplicateUser",
    confirmKey: "Duplicate",
    confirmClass: "bg-gray-600 hover:bg-gray-700",
    needsEmail: true,
  },
  resend_invitation: {
    icon: FiSend,
    iconColor: "text-emerald-500",
    titleKey: "ResendInvitation",
    confirmKey: "Resend",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  send_setup_email: {
    icon: FiSend,
    iconColor: "text-blue-500",
    titleKey: "SendSetupEmail",
    confirmKey: "Send",
    confirmClass: "bg-blue-600 hover:bg-blue-700",
  },
  approve_staff: {
    icon: FiCheck,
    iconColor: "text-emerald-500",
    titleKey: "ApproveStaff",
    confirmKey: "Approve",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  reject_staff: {
    icon: FiX,
    iconColor: "text-red-500",
    titleKey: "RejectStaff",
    confirmKey: "Reject",
    confirmClass: "bg-red-600 hover:bg-red-700",
    needsReason: true,
    reasonLabel: "RejectionReason",
    reasonPlaceholder: "EnterRejectionReason",
  },
  remove_member: {
    icon: FiUserMinus,
    iconColor: "text-red-500",
    titleKey: "RemoveMember",
    confirmKey: "Remove",
    confirmClass: "bg-red-600 hover:bg-red-700",
  },
};

const ConfirmActionModal = ({
  isOpen,
  onClose,
  action = "delete",
  user = null,
  isSubmitting = false,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const config = ACTION_CONFIG[action] || ACTION_CONFIG.delete;
  const Icon = config.icon;

  const handleConfirm = () => {
    const payload = {};
    if (config.needsReason) payload.reason = reason;
    if (config.needsPassword) payload.password = password;
    if (config.needsEmail) payload.email = newEmail;
    onConfirm && onConfirm(action, payload);
  };

  const handleClose = () => {
    setReason("");
    setPassword("");
    setNewEmail("");
    onClose && onClose();
  };

  const needsInput = config.needsReason || config.needsPassword || config.needsEmail;
  const inputValid = config.needsReason
    ? reason.trim().length > 0
    : config.needsPassword || config.needsEmail
    ? true
    : true;

  return (
    <ModalUI isOpen={isOpen} onClose={isSubmitting ? undefined : handleClose} size="md" className="custom-modal">
      <ModalBody className="text-center px-8 pt-6 pb-4">
        <span className={`flex justify-center text-3xl mb-4 ${config.iconColor}`}>
          <Icon />
        </span>
        <h2 className="text-xl font-bold mb-2">
          {t(config.titleKey)} <span className="text-emerald-600">{user?.email || user?.name || ""}</span>?
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t(
            config.titleKey + "Confirm",
            {
              name: user?.name || user?.firstName || "",
              email: user?.email || "",
            }
          )}
        </p>

        {config.needsReason && (
          <div className="mt-3 text-left">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t(config.reasonLabel)}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(config.reasonPlaceholder)}
              rows={3}
              required
              disabled={isSubmitting}
            />
          </div>
        )}

        {config.needsPassword && (
          <div className="mt-3 text-left">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("NewPassword")}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("EnterNewPassword")}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("PasswordMinLength")}
            </p>
          </div>
        )}

        {config.needsEmail && (
          <div className="mt-3 text-left">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("NewEmail")}
            </label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t("EnterNewEmail")}
              disabled={isSubmitting}
            />
          </div>
        )}
      </ModalBody>

      <ModalFooter className="justify-center gap-2">
        <Button
          layout="outline"
          onClick={handleClose}
          disabled={isSubmitting}
          className="w-28 justify-center text-sm"
        >
          {t("CancelBtn")}
        </Button>
        {isSubmitting ? (
          <Button disabled className="text-sm">
            <LoadingSpinner alt="Loading" width={20} height={10} />
            <span className="font-serif ml-2 font-light">{t("Processing")}</span>
          </Button>
        ) : (
          <Button
            onClick={handleConfirm}
            disabled={needsInput && !inputValid}
            className={`w-28 justify-center text-sm ${config.confirmClass}`}
          >
            {t(config.confirmKey)}
          </Button>
        )}
      </ModalFooter>
    </ModalUI>
  );
};

export default ConfirmActionModal;
