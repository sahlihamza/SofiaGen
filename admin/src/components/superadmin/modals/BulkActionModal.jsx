import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody, ModalFooter, Textarea, Select } from "@windmill/react-ui";
import {
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

  FiAlertTriangle,
  FiShieldOff,
  FiLock,
  FiArchive,
  FiTrash2,
  FiCheck,
  FiUserCheck,
  FiUpload,
  FiDownload,
  FiKey,
  FiX,
} from "react-icons/fi";


const ACTION_CONFIG = {
  suspend: {
    title: "Suspendre les utilisateurs",
    icon: FiShieldOff,
    color: "amber",
    label: "Suspendre",
    needsReason: true,
  },
  block: {
    title: "Bloquer les utilisateurs",
    icon: FiLock,
    color: "rose",
    label: "Bloquer",
    needsReason: true,
  },
  unblock: {
    title: "DÃ©bloquer les utilisateurs",
    icon: FiCheck,
    color: "emerald",
    label: "DÃ©bloquer",

  },
  archive: {
    title: "Archiver les utilisateurs",
    icon: FiArchive,
    color: "purple",
    label: "Archiver",
    needsReason: true,
  },
  unarchive: {
    title: "Restaurer les utilisateurs",
    icon: FiCheck,
    color: "emerald",
    label: "Restaurer",
  },
  delete: {
    title: "Supprimer dÃ©finitivement",
    icon: FiTrash2,
    color: "red",
    label: "Supprimer dÃ©finitivement",
    isDanger: true,
  },
  reactivate: {
    title: "RÃ©activer les utilisateurs",
    icon: FiUserCheck,
    color: "emerald",
    label: "RÃ©activer",
  },
  assign_role: {
    title: "Assigner un rÃ´le",

    icon: FiUserCheck,
    color: "cyan",
    label: "Assigner",
    needsRole: true,
  },
  force_password_change: {
    title: "Forcer le changement de mot de passe",
    icon: FiKey,
    color: "amber",
    label: "Forcer",
  },
  resend_invitation: {
    title: "Renvoyer les invitations",
    icon: FiUpload,
    color: "emerald",
    label: "Renvoyer",
  },
  export: {
    title: "Exporter les utilisateurs",
    icon: FiDownload,
    color: "emerald",
    label: "Exporter",
  },
};

const COLOR_BG = {
  amber: "from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10",
  rose: "from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-900/10",
  emerald: "from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10",
  purple: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10",
  red: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10",
  cyan: "from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-900/10",
};

const COLOR_BORDER = {
  amber: "border-amber-300",
  rose: "border-rose-300",
  emerald: "border-emerald-300",
  purple: "border-purple-300",
  red: "border-red-300",
  cyan: "border-cyan-300",
};

const COLOR_ICON = {
  amber: "text-amber-600",
  rose: "text-rose-600",
  emerald: "text-emerald-600",
  purple: "text-purple-600",
  red: "text-red-600",
  cyan: "text-cyan-600",
};

const COLOR_BG_ICON = {
  amber: "bg-amber-100 dark:bg-amber-900/30",
  rose: "bg-rose-100 dark:bg-rose-900/30",
  emerald: "bg-emerald-100 dark:bg-emerald-900/30",
  purple: "bg-purple-100 dark:bg-purple-900/30",
  red: "bg-red-100 dark:bg-red-900/30",
  cyan: "bg-cyan-100 dark:bg-cyan-900/30",
};

const CONFIRM_CLASS = {
  amber: "users-btn-warning",
  rose: "users-btn-danger",
  emerald: "users-btn-success",
  purple: "users-btn-primary",
  red: "users-btn-danger",
  cyan: "users-btn-primary",
};

const BulkActionModal = ({
  isOpen,
  onClose,
  action,
  selectedCount,
  isSubmitting,
  onSubmit,
  roleOptions = [],
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const config = ACTION_CONFIG[action] || {
    title: t("BulkAction") || "Action en lot",
    icon: FiAlertTriangle,
    color: "amber",
    label: t("Confirm") || "Confirmer",
  };

  const Icon = config.icon;
  const color = config.color;

  const handleSubmit = () => {
    onSubmit && onSubmit(action, { reason, selectedRole });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      size="lg"
      className="custom-modal"
    >
      <ModalBody className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${COLOR_BG[color]} flex items-center justify-center flex-shrink-0 border-2 ${COLOR_BORDER[color]}`}>
            <Icon className={`w-6 h-6 ${COLOR_ICON[color]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {config.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Cette action concerne <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedCount}</span> utilisateur{selectedCount > 1 ? "s" : ""} sÃ©lectionnÃ©{selectedCount > 1 ? "s" : ""}.

            </p>
          </div>
          {!isSubmitting && (
            <Button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </Button>
          )}
        </div>

        {config.isDanger && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
            <FiAlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              Attention : la suppression est dÃ©finitive et irrÃ©versible. Les comptes et leurs donnÃ©es associÃ©es ne pourront pas Ãªtre rÃ©cupÃ©rÃ©s.

            </p>
          </div>
        )}

        {config.needsReason && (
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Raison <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="DÃ©crivez la raison de cette action..."

              rows={3}
              className="w-full"
            />
          </div>
        )}

        {config.needsRole && (
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              RÃ´le Ã  assigner

            </label>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full"
            >
              <option value="">SÃ©lectionner un rÃ´le</option>

              {roleOptions.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="justify-end gap-2 px-6 pb-6 pt-2">
        <Button
          type="button"
          onClick={isSubmitting ? undefined : onClose}
          disabled={isSubmitting}
          className="users-btn users-btn-secondary"
        >
          {t("CancelBtn") || "Annuler"}
        </Button>
        {isSubmitting ? (
          <Button type="button" disabled className={`users-btn ${CONFIRM_CLASS[color]}`}>
            <LoadingSpinner alt="Loading" width={16} height={16} className="animate-spin" />
            <span>Traitement...</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={config.needsReason && !reason.trim()}
            className={`users-btn ${CONFIRM_CLASS[color]} users-btn-lg`}
          >
            <Icon size={16} />
            {config.label}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default BulkActionModal;
