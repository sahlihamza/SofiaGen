import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import Scrollbars from "react-custom-scrollbars-2";
import { Input, Select } from "@windmill/react-ui";
import Multiselect from "multiselect-react-dropdown";
import classnames from "classnames";

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";
import userAPI from "@/services/api/userAPI";

const USER_TYPE_OPTIONS = [
  { name: "SuperAdmin", value: "superadmin" },
  { name: "Store Admin", value: "store_admin" },
  { name: "Platform Admin", value: "platform_admin" },
  { name: "Store Staff", value: "staff" },
  { name: "Customer", value: "customer" },
];

const CreateUserDrawer = ({ roleOptions = [], stores = [], existingEmails = [], onSubmit, defaultUserType = "store_admin", hideStoreTypes = false }) => {
  const { t } = useTranslation();
  const { closeDrawer } = useContext(SidebarContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    userType: defaultUserType,
    storeIds: [],
    roleIds: [],
    teamId: null,
    department: "",
    sendInvitationEmail: true,
    twoFactorRequired: false,
  });

  const availableUserTypes = hideStoreTypes
    ? USER_TYPE_OPTIONS.filter(ut => ["superadmin", "platform_admin"].includes(ut.value))
    : USER_TYPE_OPTIONS;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailTaken = existingEmails.includes(formData.email?.toLowerCase());

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid =
    emailRegex.test(formData.email) &&
    !isEmailTaken &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.userType &&
    (formData.userType === "customer" ||
      formData.userType === "platform_admin" ||
      formData.userType === "superadmin" ||
      (formData.storeIds.length > 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const payload = {
        email: formData.email.toLowerCase(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        userType: formData.userType,
        storeIds: formData.storeIds,
        role: formData.roleIds,
        teamId: formData.teamId,
        department: formData.department || null,
        sendInvitationEmail: formData.sendInvitationEmail,
        twoFactorRequired: formData.twoFactorRequired,
      };

      if (onSubmit) {
        await onSubmit(payload);
      }
      closeDrawer();
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        userType: defaultUserType,
        storeIds: [],
        roleIds: [],
        teamId: null,
        department: "",
        sendInvitationEmail: true,
        twoFactorRequired: false,
      });
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title title={t("InviteUser")} description={t("InviteUserDesc") || "Create a new user account and send an invitation."} />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40 space-y-6">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("Email")} required />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  type="email"
                  placeholder={t("EnterEmail")}
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={isEmailTaken ? "border-red-500" : ""}
                  required
                />
                {isEmailTaken && (
                  <p className="text-xs text-red-500 mt-1">{t("EmailAlreadyExists")}</p>
                )}
                <Error errorName={!emailRegex.test(formData.email) && formData.email ? t("ValidEmailRequired") : ""} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("FirstName")} required />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  required={true}
                  label={t("FirstName")}
                  name="firstName"
                  type="text"
                  placeholder={t("EnterFirstName")}
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
                <Error errorName={!formData.firstName.trim() ? t("NameFieldsRequired") : ""} />
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
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
                <Error errorName={!formData.lastName.trim() ? t("NameFieldsRequired") : ""} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("Phone")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  type="text"
                  placeholder={t("EnterPhone")}
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("UserType")} required />
              <div className="col-span-8 sm:col-span-4">
                <Select
                  value={formData.userType}
                  onChange={(e) => updateField("userType", e.target.value)}
                  className="w-full"
                >
                  {availableUserTypes.map((ut) => (
                    <option key={ut.value} value={ut.value}>
                      {t(ut.name) || ut.name}
                    </option>
                  ))}
                </Select>
                <Error errorName={!formData.userType ? t("UserTypeRequired") : ""} />
              </div>
            </div>

            {(formData.userType === "store_admin" || formData.userType === "staff") && (
              <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                <LabelArea label={t("StoreAssignment")} required />
                <div className="col-span-8 sm:col-span-4">
                  <Multiselect
                    options={stores}
                    selectedValues={stores.filter((s) => formData.storeIds.includes(s._id))}
                    displayValue="name"
                    isObject={true}
                    placeholder={t("SelectStores")}
                    showCheckbox={true}
                    avoidHighlightFirstOption={true}
                    onSelect={(selected) => {
                      const ids = selected.map((s) => s._id);
                      updateField("storeIds", ids);
                    }}
                    onRemove={(removed) => {
                      const ids = formData.storeIds.filter(
                        (id) => !removed.find((r) => r._id === id)
                      );
                      updateField("storeIds", ids);
                    }}
                  />
                  {formData.storeIds.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">{t("StoreSelectionRequired")}</p>
                  )}
                </div>
              </div>
            )}

            {roleOptions.length > 0 && (
              <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                <LabelArea label={t("RoleAssignment")} />
                <div className="col-span-8 sm:col-span-4">
                  <Multiselect
                    options={roleOptions}
                    selectedValues={roleOptions.filter((r) => formData.roleIds.includes(r._id))}
                    displayValue="name"
                    isObject={true}
                    placeholder={t("SelectRoles")}
                    showCheckbox={true}
                    avoidHighlightFirstOption={true}
                    onSelect={(selected) => {
                      const ids = selected.map((r) => r._id);
                      updateField("roleIds", ids);
                    }}
                    onRemove={(removed) => {
                      const ids = formData.roleIds.filter(
                        (id) => !removed.find((r) => r._id === id)
                      );
                      updateField("roleIds", ids);
                    }}
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
                  value={formData.department}
                  onChange={(e) => updateField("department", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <div className="col-span-8 sm:col-span-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendInvitationEmail"
                    checked={formData.sendInvitationEmail}
                    onChange={(e) => updateField("sendInvitationEmail", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="sendInvitationEmail" className="text-sm text-gray-700 dark:text-gray-300">
                    {t("SendInvitationEmail")}
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <div className="col-span-8 sm:col-span-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="twoFactorRequired"
                    checked={formData.twoFactorRequired}
                    onChange={(e) => updateField("twoFactorRequired", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="twoFactorRequired" className="text-sm text-gray-700 dark:text-gray-300">
                    {t("RequireTwoFA")}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DrawerButton id="" title="User" isSubmitting={isSubmitting} isSubmitDisabled={!isFormValid} />
        </form>
      </Scrollbars>
    </>
  );
};

export default CreateUserDrawer;
