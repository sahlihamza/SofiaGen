import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody, ModalFooter, Input, Select, Textarea } from "@windmill/react-ui";
import { FiSave } from "react-icons/fi";
import Multiselect from "multiselect-react-dropdown";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const EditUserModal = ({
  isOpen,
  onClose,
  user,
  isSubmitting,
  onSubmit,
  roleOptions = [],
}) => {
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(user?.firstName || user?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [status, setStatus] = useState(user?.status || "Active");
  const [suspendedReason, setSuspendedReason] = useState(user?.suspendedReason || "");
  const [blockedReason, setBlockedReason] = useState(user?.blockedReason || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [selectedRoles, setSelectedRoles] = useState(
    roleOptions.filter((r) =>
      Array.isArray(user?.role)
        ? user.role.some((ur) => String(ur) === String(r._id))
        : String(user?.role) === String(r._id)
    )
  );

  if (!user) return null;

  const handleSubmit = async () => {
    const updates = {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      phone,
      status,
      department,
    };

    if (status === "Suspended" && suspendedReason) {
      updates.suspendedReason = suspendedReason;
    }
    if (status === "Blocked" && blockedReason) {
      updates.blockedReason = blockedReason;
    }

    // Only include roleIds if they changed
    const currentRoleIds = Array.isArray(user.role)
      ? user.role.map((r) => String(r))
      : [String(user.role)];
    const newRoleIds = selectedRoles.map((r) => String(r._id));

    if (currentRoleIds.sort().join(",") !== newRoleIds.sort().join(",")) {
      updates.role = newRoleIds;
    }

    await onSubmit(updates);
  };  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? undefined : onClose} size="lg" className="custom-modal">
      <ModalBody className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("EditUser")}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("FirstName")} *
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("EnterFirstName")}
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("LastName")} *
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("EnterLastName")}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Email")}
            </label>
            <Input value={user.email} disabled type="email" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("EmailCannotBeChanged")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Phone")}
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("EnterPhone")}
              disabled={isSubmitting}
            />
          </div>

           <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Status")}
              </label>
              <Select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={user.isSuperAdmin}
              >
                <option value="Active">{t("Active")}</option>
                <option value="Inactive">{t("Inactive")}</option>
                <option value="Suspended">{t("Suspended")}</option>
                <option value="Blocked">{t("Blocked")}</option>
                <option value="Archived">{t("Archived")}</option>
                <option value="Invited">{t("Invited")}</option>
                <option value="PendingActivation">{t("PendingActivation")}</option>
              </Select>
            </div>

            {(status === "Suspended" || status === "Blocked") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("BlockReason")}
                </label>
                <Textarea
                  value={status === "Blocked" ? blockedReason : suspendedReason}
                  onChange={(e) => {
                    if (status === "Blocked") {
                      setBlockedReason(e.target.value);
                    } else {
                      setSuspendedReason(e.target.value);
                    }
                  }}
                  placeholder={t("EnterReason")}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Department")}
              </label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={t("EnterDepartment")}
                disabled={isSubmitting}
              />
            </div>

          {roleOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Roles")}
              </label>
              <Multiselect
                options={roleOptions}
                selectedValues={selectedRoles}
                displayValue="name"
                isObject={true}
                placeholder={t("SelectRoles")}
                showCheckbox={true}
                avoidHighlightFirstOption={true}
                onSelect={(selected) => setSelectedRoles(selected)}
                onRemove={(removed) => setSelectedRoles(removed)}
                disable={isSubmitting}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("UserType")}
            </label>
            <Input value={user.userType} disabled />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("UserTypeCannotBeChanged")}
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="justify-end gap-2">
        <Button
          type="button"
          onClick={isSubmitting ? undefined : onClose}
          disabled={isSubmitting}
          className="users-btn users-btn-secondary"
        >
          {t("CancelBtn")}
        </Button>
        {isSubmitting ? (
          <Button type="button" disabled className="users-btn users-btn-primary">
            <LoadingSpinner alt="Loading" width={16} height={16} className="animate-spin" />
            <span>{t("Saving")}</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            className="users-btn users-btn-primary"
          >
            <FiSave size={14} />
            {t("SaveChanges")}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default EditUserModal;
