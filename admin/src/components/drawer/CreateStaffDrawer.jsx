import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input, Select } from "@windmill/react-ui";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import Multiselect from "multiselect-react-dropdown";
import { FiSave } from "react-icons/fi";
import { notifyError, notifySuccess } from "@/utils/toast";
import platformAPI from "@/services/api/platformAPI";
import { AppDrawer, LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const USER_TYPE_OPTIONS = [
  { name: "Super Admin", value: "superadmin" },
  { name: "Platform Admin", value: "platform_admin" },
];

const CreateStaffDrawer = ({ isOpen, onClose, isSubmitting, onSubmit }) => {
  const { t } = useTranslation();
  const [platformRoles, setPlatformRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    userType: "platform_admin",
    roleIds: [],
    department: "",
    sendInvitationEmail: true,
    twoFactorRequired: false,
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        userType: "platform_admin",
        roleIds: [],
        department: "",
        sendInvitationEmail: true,
        twoFactorRequired: false,
      });
      return;
    }

    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await platformAPI.getRoles({ scope: "platform" });
        const roles = res?.data || res || [];
        setPlatformRoles(roles);
      } catch {
        setPlatformRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    loadRoles();
  }, [isOpen]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isFormValid =
    emailRegex.test(formData.email) &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.userType &&
    formData.roleIds.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    const payload = {
      email: formData.email.toLowerCase(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      userType: formData.userType,
      role: formData.roleIds,
      department: formData.department || null,
      sendInvitationEmail: formData.sendInvitationEmail,
      twoFactorRequired: formData.twoFactorRequired,
    };

    if (onSubmit) {
      await onSubmit(payload);
    }
  };

  return (
    <AppDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("CreateStaff") || "Create Staff"}
      description={t("CreateStaffDesc") || "Invite a new platform staff member"}
      width="560px"
      footer={
        <div className="grid gap-4 md:flex">
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
              <Button disabled className="text-sm w-full h-12">
                <LoadingSpinner alt="Loading" width={20} height={10} />
                <span className="font-serif ml-2 font-light">{t("Saving")}</span>
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="text-sm bg-emerald-700 hover:bg-emerald-800 w-full h-12"
                icon={FiSave}
                disabled={!isFormValid}
              >
                {t("CreateStaff") || "Create Staff"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("Email")} required />
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="email"
                placeholder={t("EnterEmail")}
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
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
                {USER_TYPE_OPTIONS.map((ut) => (
                  <option key={ut.value} value={ut.value}>
                    {t(ut.name) || ut.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <LabelArea label={t("PlatformRole")} required />
            <div className="col-span-8 sm:col-span-4">
              {loadingRoles ? (
                <p className="text-sm text-gray-500">{t("Loading") || "Loading..."}</p>
              ) : (
                <Multiselect
                  options={platformRoles}
                  selectedValues={platformRoles.filter((r) => formData.roleIds.includes(r._id))}
                  displayValue="name"
                  isObject={true}
                  placeholder={t("SelectPlatformRole") || "Select platform role"}
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
              )}
              {formData.roleIds.length === 0 && (
                <p className="text-xs text-red-500 mt-1">{t("PlatformRoleRequired") || "Platform role is required"}</p>
              )}
            </div>
          </div>

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
      </form>
    </AppDrawer>
  );
};

export default CreateStaffDrawer;
