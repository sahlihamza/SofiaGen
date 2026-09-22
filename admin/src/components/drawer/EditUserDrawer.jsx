import React, { useState, useEffect } from "react";

import { useTranslation } from "react-i18next";
import Scrollbars from "react-custom-scrollbars-2";
import { Input, Select, Textarea } from "@windmill/react-ui";
import Multiselect from "multiselect-react-dropdown";
import { FiSave } from "react-icons/fi";

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const EditUserDrawer = ({
  isOpen,
  onClose,
  user,
  isSubmitting,
  onSubmit,
  roleOptions = [],
}) => {
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("Active");
  const [suspendedReason, setSuspendedReason] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    if (user) {
      setFirstName(user?.firstName || user?.name?.split(" ")[0] || "");
      setLastName(user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "");
      setPhone(user?.phone || "");
      setStatus(user?.status || "Active");
      setSuspendedReason(user?.suspendedReason || "");
      setBlockedReason(user?.blockedReason || "");
      setDepartment(user?.department || "");
      setSelectedRoles(
        roleOptions.filter((r) =>
          Array.isArray(user?.role)
            ? user.role.some((ur) => String(ur) === String(r._id))
            : String(user?.role) === String(r._id)
        )
      );
    }
  }, [user, roleOptions]);

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

    const currentRoleIds = Array.isArray(user.role)
      ? user.role.map((r) => String(r))
      : [String(user.role)];
    const newRoleIds = selectedRoles.map((r) => String(r._id));

    if (currentRoleIds.sort().join(",") !== newRoleIds.sort().join(",")) {
      updates.role = newRoleIds;
    }

    await onSubmit(updates);
  };

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title title={t("EditUser")} description="" />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40 space-y-6">
          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("FirstName")} required />
            <div className="col-span-8 sm:col-span-4">
              <InputArea
                required={true}
                label={t("FirstName")}
                name="firstName"
                type="text"
                placeholder={t("EnterFirstName")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Error errorName={!firstName.trim() ? t("NameFieldsRequired") : ""} />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("LastName")} required />
            <div className="col-span-8 sm:col-span-4">
              <InputArea
                required={true}
                label={t("LastName")}
                name="lastName"
                type="text"
                placeholder={t("EnterLastName")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <Error errorName={!lastName.trim() ? t("NameFieldsRequired") : ""} />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("Email")} />
            <div className="col-span-8 sm:col-span-4">
              <Input value={user.email} disabled type="email" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("EmailCannotBeChanged")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("Phone")} />
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                placeholder={t("EnterPhone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("Status")} />
            <div className="col-span-8 sm:col-span-4">
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
          </div>

          {(status === "Suspended" || status === "Blocked") && (
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("BlockReason")} />
              <div className="col-span-8 sm:col-span-4">
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
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("Department")} />
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                placeholder={t("Department")}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          {roleOptions.length > 0 && (
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("Roles")} />
              <div className="col-span-8 sm:col-span-4">
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
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("UserType")} />
            <div className="col-span-8 sm:col-span-4">
              <Input value={user.userType} disabled />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("UserTypeCannotBeChanged")}
              </p>
            </div>
          </div>
        </div>
      </Scrollbars>

      <div
        className={`fixed z-10 bottom-0 w-full right-0 py-4 lg:py-8 px-6 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex bg-gray-50 border-t border-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
        style={{ right: !isOpen && -50 }}
      >
        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-12 bg-white w-full text-red-500 hover:bg-red-50 hover:border-red-100 hover:text-red-600 dark:bg-gray-700 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-red-700"
            layout="outline"
          >
            {t("CancelBtn")}
          </Button>
        </div>
        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
          {isSubmitting ? (
            <Button disabled={true} type="button" className="w-full h-12">
              <LoadingSpinner alt="Loading" width={20} height={10} className="animate-spin" />
              <span className="font-serif ml-2 font-light">{t("Saving")}</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              className="w-full h-12"
            >
              <FiSave size={14} />
              {t("SaveChanges")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default EditUserDrawer;
