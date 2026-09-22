import React from "react";
import { useTranslation } from "react-i18next";
import { Input, Label, Textarea } from "@windmill/react-ui";
import { FiSend } from "react-icons/fi";
import { AppDrawer, LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const InviteUserDrawer = ({ isOpen, onClose, isSubmitting, onSubmit, platformRoles = [] }) => {
  const { t } = useTranslation();
  const [form, setForm] = React.useState({
    email: "",
    firstName: "",
    lastName: "",
    roleId: "",
    expiresInHours: 168,
    message: "",
  });

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.roleId) return;
    onSubmit({
      email: form.email,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      roleIds: [form.roleId],
      storeId: null,
      expiresInHours: Number(form.expiresInHours),
      message: form.message || undefined,
      sendEmail: true,
    });
  };

  const footer = (
    <div className="flex gap-4">
      <Button
        onClick={onClose}
        disabled={isSubmitting}
        className="h-12 bg-white w-full text-red-500 hover:bg-red-50 hover:border-red-100 hover:text-red-600 dark:bg-gray-700 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-red-700"
        layout="outline"
      >
        {t("CancelBtn")}
      </Button>
      {isSubmitting ? (
        <Button disabled className="text-sm w-full h-12">
          <LoadingSpinner alt="Loading" width={20} height={10} />
          <span className="font-serif ml-2 font-light">{t("Processing")}</span>
        </Button>
      ) : (
        <Button
          type="submit"
          className="text-sm bg-emerald-700 hover:bg-emerald-800 w-full h-12"
          icon={FiSend}
          disabled={!form.email || !form.roleId}
        >
          {t("SendInvitation")}
        </Button>
      )}
    </div>
  );

  return (
    <AppDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("CreateInvitation")}
      description={t("InviteUserDesc")}
      width="560px"
      footer={footer}
      className="z-50"
    >
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40 space-y-6">
          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("Email")} *
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="email"
                value={form.email}
                onChange={setField("email")}
                placeholder="user@example.com"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("FirstName")}
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                value={form.firstName}
                onChange={setField("firstName")}
                placeholder={t("FirstName")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("LastName")}
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                value={form.lastName}
                onChange={setField("lastName")}
                placeholder={t("LastName")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("PlatformRole")} *
            </label>
            <div className="col-span-8 sm:col-span-4">
              <select
                required
                value={form.roleId}
                onChange={setField("roleId")}
                disabled={isSubmitting}
                className="w-full h-12 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 text-sm"
              >
                <option value="">{t("SelectRole")}</option>
                {platformRoles
                  .filter((role) => role.scope === "platform")
                  .map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("ExpirationHours")}
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="number"
                min="1"
                value={form.expiresInHours}
                onChange={setField("expiresInHours")}
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("DefaultExpirationNote")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <Label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("MessageOptional")}
            </Label>
            <div className="col-span-8 sm:col-span-4">
              <Textarea
                value={form.message}
                onChange={setField("message")}
                rows={3}
                placeholder={t("MessagePlaceholder")}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div
          className={`fixed bottom-0 w-full right-0 py-4 lg:py-8 px-6 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex bg-gray-50 border-t border-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
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
              <Button disabled className="text-sm w-full h-12">
                <LoadingSpinner alt="Loading" width={20} height={10} />
                <span className="font-serif ml-2 font-light">{t("Processing")}</span>
              </Button>
            ) : (
              <Button
                type="submit"
                className="text-sm bg-emerald-700 hover:bg-emerald-800 w-full h-12"
                icon={FiSend}
                disabled={!form.email || !form.roleId}
              >
                {t("SendInvitation")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </AppDrawer>
  );
};

export default InviteUserDrawer;
