import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody, ModalFooter, Input, Select, Option } from "@windmill/react-ui";
import { FiMail, FiUser, FiShield, FiLock, FiCheckCircle, FiInfo } from "react-icons/fi";
import Multiselect from "multiselect-react-dropdown";
import classnames from "classnames";
import { Button } from "@sofia/ui";

const USER_TYPE_OPTIONS = [
  { name: "SuperAdmin", value: "superadmin", isPlatform: true },
  { name: "Platform Admin", value: "platform_admin", isPlatform: true },
  { name: "Store Admin", value: "store_admin", isPlatform: false },
  { name: "Staff", value: "staff", isPlatform: false },
  { name: "Customer", value: "customer", isPlatform: false },
];

const PLATFORM_USER_TYPES = new Set(["superadmin", "platform_admin"]);

const STEPS = ["Info", "Type", "Roles", "Confirmation"];

const CreateUserWizard = ({
  isOpen,
  onClose,
  isSubmitting,
  onSubmit,
  roleOptions = [],
  stores = [],
  existingEmails = [],
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    userType: "",
    storeIds: [],
    roleIds: [],
    teamId: null,
    department: "",
    sendInvitationEmail: true,
    twoFactorRequired: false,
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isEmailTaken = existingEmails.includes(formData.email?.toLowerCase());

  const isPlatformType = PLATFORM_USER_TYPES.has(formData.userType);
  const availableRoleOptions = roleOptions.filter((role) =>
    isPlatformType ? role?.scope === "platform" : role?.scope === "store"
  );

  const canProceedToStep = (targetStep) => {
    if (targetStep === 1) {
      if (!emailRegex.test(formData.email)) {
        return { valid: false, message: t("ValidEmailRequired") };
      }
      if (isEmailTaken) {
        return { valid: false, message: t("EmailAlreadyExists") };
      }
      if (!formData.firstName || !formData.lastName) {
        return { valid: false, message: t("NameFieldsRequired") };
      }
    }
    if (targetStep === 2) {
      if (!formData.userType) {
        return { valid: false, message: t("UserTypeRequired") };
      }
      if (
        (formData.userType === "store_admin" || formData.userType === "staff") &&
        formData.storeIds.length === 0
      ) {
        return { valid: false, message: t("StoreSelectionRequired") };
      }
    }
    if (targetStep === 3) {
      if (formData.roleIds.length === 0) {
        return { valid: false, message: t("RoleSelectionRequired") };
      }
    }
    return { valid: true, message: "" };
  };

  const nextStep = () => {
    const check = canProceedToStep(step + 1);
    if (!check.valid) return;
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const selectedStoreNames = formData.storeIds
    .map((id) => stores.find((s) => s._id === id)?.name || id)
    .join(", ");

  const selectedRoleNames = formData.roleIds
    .map((id) => availableRoleOptions.find((r) => r._id === id)?.name || id)
    .join(", ");

  const handleSubmit = async () => {
    const check = canProceedToStep(step + 1);
    if (!check.valid) return;

    const payload = {
      email: formData.email.toLowerCase(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      userType: formData.userType,
      storeIds: formData.storeIds,
      roleIds: formData.roleIds,
      teamId: formData.teamId,
      department: formData.department || null,
      sendInvitationEmail: formData.sendInvitationEmail,
      twoFactorRequired: formData.twoFactorRequired,
    };

    await onSubmit(payload);
    setStep(0);
     setFormData({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      userType: "",
      storeIds: [],
      roleIds: [],
      teamId: null,
      department: "",
      sendInvitationEmail: true,
      twoFactorRequired: false,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Email")} *
              </label>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("InvitationEmailWillBeSent")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("FirstName")} *
                </label>
                <Input
                  placeholder={t("EnterFirstName")}
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("LastName")} *
                </label>
                <Input
                  placeholder={t("EnterLastName")}
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Phone")}
              </label>
              <Input
                placeholder={t("EnterPhone")}
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
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

            <div className="flex items-center gap-2 pt-2">
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
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("UserType")} *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {USER_TYPE_OPTIONS.map((ut) => (
                  <label
                    key={ut.value}
                    className={classnames(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all",
                      formData.userType === ut.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <input
                      type="radio"
                      name="userType"
                      value={ut.value}
                      checked={formData.userType === ut.value}
                      onChange={() => updateField("userType", ut.value)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t(ut.name) || ut.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {(formData.userType === "store_admin" || formData.userType === "staff") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("StoreAssignment")} *
                </label>
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
                  <p className="text-xs text-red-500 mt-1">
                    {t("StoreSelectionRequired")}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("RoleAssignment")}
              </label>
              {formData.userType ? (
                <Multiselect
                  options={availableRoleOptions}
                  selectedValues={availableRoleOptions.filter((r) => formData.roleIds.includes(r._id))}
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
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  {t("SelectUserTypeFirst") || "Select a user type first"}
                </p>
              )}
              {formData.roleIds.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  {t("RoleSelectionOptional")}
                </p>
              )}
            </div>

            {roleOptions.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("PermissionsPreview")}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.roleIds.length > 0
                    ? roleOptions
                        .filter((r) => formData.roleIds.includes(r._id))
                        .map((r) => r.name)
                        .join(", ")
                    : t("NoRolesSelected")}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                {t("Summary")}
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("Email")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{formData.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("Name")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formData.firstName} {formData.lastName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("Phone")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formData.phone || "â€”"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("UserType")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {USER_TYPE_OPTIONS.find((u) => u.value === formData.userType)?.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("StoreAssignment")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {selectedStoreNames || "â€”"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("RoleAssignment")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {selectedRoleNames || t("DefaultRole")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("InvitationEmail")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formData.sendInvitationEmail ? t("Yes") : t("No")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t("RequireTwoFA")}:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formData.twoFactorRequired ? t("Yes") : t("No")}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const footerContent = () => {
    if (step === 3) {
      return (
        <>
          <Button
            layout="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-28 justify-center text-sm"
          >
            {t("CancelBtn")}
          </Button>
          {isSubmitting ? (
            <Button disabled className="text-sm">
              <img src="/spinner.gif" alt="Loading" width={20} height={10} />
              <span className="font-serif ml-2 font-light">{t("Creating")}</span>
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="w-28 justify-center bg-emerald-700 text-sm hover:bg-emerald-800"
            >
              {t("CreateUser")}
            </Button>
          )}
        </>
      );
    }

    return (
      <>
        <Button
          layout="outline"
          onClick={step === 0 ? onClose : prevStep}
          disabled={isSubmitting}
          className="w-28 justify-center text-sm"
        >
          {step === 0 ? t("CancelBtn") : t("Back")}
        </Button>
        <Button
          onClick={step === 2 ? handleSubmit : nextStep}
          disabled={isSubmitting}
          className="w-28 justify-center bg-emerald-700 text-sm hover:bg-emerald-800"
        >
          {step === 2 ? t("CreateUser") : t("Next")}
        </Button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      size="xl"
      className="superadmin-wizard"
    >
      <ModalBody className="px-6 pt-6 pb-4">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((stepName, idx) => (
            <div key={stepName} className="flex items-center">
              <div
                className={classnames(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium",
                  idx === step
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : idx < step
                    ? "border-emerald-600 bg-white dark:bg-gray-800 text-emerald-600"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400"
                )}
              >
                {idx === step ? (
                  <FiCheckCircle size={16} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={classnames(
                  "ml-2 text-sm font-medium",
                  idx === step
                    ? "text-emerald-600 dark:text-emerald-400"
                    : idx < step
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-400"
                )}
              >
                {t(stepName)}
              </span>
              {idx < STEPS.length - 1 && (
                <div className="w-12 h-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
              )}
            </div>
          ))}
        </div>

        {renderStep()}
      </ModalBody>

      <ModalFooter className="justify-end gap-2">
        {footerContent()}
      </ModalFooter>
    </Modal>
  );
};

export default CreateUserWizard;
