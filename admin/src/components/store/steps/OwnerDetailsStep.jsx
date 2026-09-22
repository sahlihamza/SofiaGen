import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FiSearch, FiUserPlus, FiCheck, FiX } from "react-icons/fi";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import Error from "@/components/form/others/Error";
import SelectField from "@/components/form/selectOption/SelectField";
import UserServices from "@/services/UserServices";
import { Button } from "@sofia/ui";

const SectionCard = ({ title, description, children, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
    {(title || description) && (
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        {title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const FormRow = ({ label, required, children, className = "" }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 last:mb-0 ${className}`}>
    <div className="sm:text-right">
      <LabelArea label={label} required={required} />
    </div>
    <div className="sm:col-span-2">{children}</div>
  </div>
);

const OwnerDetailsStep = ({ formData, onDataChange, register, errors, setValue }) => {
  const { t } = useTranslation();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onDataChange({ [name]: value });
  };

  const languages = [
    { value: "en", label: "English" },
    { value: "fr", label: "FranÃ§ais" },
    { value: "ar", label: "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" },
    { value: "de", label: "Deutsch" },
  ];

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!search || String(search).trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await UserServices.searchUsers(search);
        const data = res?.data?.data || res?.data || [];
        setResults(data);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleAssign = (user) => {
    setSelectedUser(user);
    const names = (user.name || "").split(" ");
    const firstName = names.shift() || "";
    const lastName = names.join(" ") || "";

    onDataChange({
      ownerEmail: user.email,
      ownerFirstName: firstName,
      ownerLastName: lastName,
      ownerPhone: user.phone || "",
      ownerName: user.name,
    });
    setValue("ownerEmail", user.email);
    setValue("ownerFirstName", firstName);
    setValue("ownerLastName", lastName);
    setValue("ownerPhone", user.phone || "");
    setValue("ownerName", user.name);
    setResults([]);
    setSearch("");
  };

  const handleUnassign = () => {
    setSelectedUser(null);
    onDataChange({
      ownerEmail: "",
      ownerFirstName: "",
      ownerLastName: "",
      ownerPhone: "",
      ownerName: "",
    });
    setValue("ownerEmail", "");
    setValue("ownerFirstName", "");
    setValue("ownerLastName", "");
    setValue("ownerPhone", "");
    setValue("ownerName", "");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">
      <div className="lg:col-span-2 space-y-5">
        <SectionCard
          title={t("NewOwnerAssignment") || "New Owner Assignment"}
          description={t("OwnerDetailsDesc") || "Please provide the details of the store owner."}
        >
          <FormRow label={t("FirstNameLabel") || "First Name"} required>
            <InputArea
              register={register}
              name="ownerFirstName"
              type="text"
              placeholder={t("FirstNameLabel") || "First Name"}
              defaultValue={formData.ownerFirstName || ""}
              onChange={handleInputChange}
              label={t("FirstNameLabel") || "First Name"}
            />
            <Error errorName={errors?.ownerFirstName} />
          </FormRow>

          <FormRow label={t("LastNameLabel") || "Last Name"} required>
            <InputArea
              register={register}
              name="ownerLastName"
              type="text"
              placeholder={t("LastNameLabel") || "Last Name"}
              defaultValue={formData.ownerLastName || ""}
              onChange={handleInputChange}
              label={t("LastNameLabel") || "Last Name"}
            />
            <Error errorName={errors?.ownerLastName} />
          </FormRow>

          <FormRow label={t("EmailLabel") || "Email"} required>
            <InputArea
              register={register}
              name="ownerEmail"
              type="email"
              placeholder="email@example.com"
              defaultValue={formData.ownerEmail || ""}
              onChange={handleInputChange}
              label={t("EmailLabel") || "Email"}
            />
            <Error errorName={errors?.ownerEmail} />
          </FormRow>

          <FormRow label={t("PhoneLabel") || "Phone Number"} required>
            <InputArea
              register={register}
              name="ownerPhone"
              type="tel"
              placeholder={t("PhoneLabel") || "Phone Number"}
              defaultValue={formData.ownerPhone || ""}
              onChange={handleInputChange}
              label={t("PhoneLabel") || "Phone Number"}
            />
            <Error errorName={errors?.ownerPhone} />
          </FormRow>

          <FormRow label={`${t("PasswordLabel") || "Password"} (${t("OptionalLabel") || "Optional"})`}>
            <InputArea
              register={register}
              name="ownerPassword"
              type="password"
              placeholder={t("PasswordLabel") || "Password"}
              defaultValue={formData.ownerPassword || ""}
              onChange={handleInputChange}
              label={t("PasswordLabel") || "Password"}
            />
          </FormRow>

          <FormRow label={t("PreferredLanguage") || "Preferred Language"}>
            <SelectField
              label={t("PreferredLanguage") || "Preferred Language"}
              name="ownerLanguage"
              register={register}
              defaultValue={formData.ownerLanguage || "en"}
              options={languages}
              placeholder={t("PreferredLanguage") || "Preferred Language"}
              onChange={handleInputChange}
            />
          </FormRow>
        </SectionCard>
      </div>

      <div className="lg:col-span-1">
        <SectionCard
          title={t("ExistingOwnerAssignment") || "Existing Owner Assignment"}
          description={t("OwnerAssignmentInfo") || "Search and select an existing user as owner."}
          className="lg:sticky lg:top-6"
        >
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("SearchExistingUser") || "Search existing user by email or name..."}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-shadow"
            />
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 border border-gray-100 dark:border-gray-700 min-h-[120px]">
            {selectedUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {selectedUser.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300">
                      {selectedUser.email}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleUnassign}
                  className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t("Unassign") || "Unassign"}
                >
                  <FiX size={16} />
                </Button>
              </div>
            ) : (
              <div>
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    {t("SearchingLabel") || "Searching..."}
                  </div>
                )}
                {!loading && results.length === 0 && search && (
                  <div className="text-xs text-gray-500 text-center py-4">
                    {t("NoResults") || "No results"}
                  </div>
                )}
                {!loading && !search && (
                  <div className="text-xs text-gray-400 text-center py-4">
                    {t("SearchExistingUser") || "Type at least 2 characters to search..."}
                  </div>
                )}
                {!loading && results.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between mb-2 last:mb-0 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-xs">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-300">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleAssign(user)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <FiCheck size={12} />
                      {t("AssignAsOwner") || "Assign"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default OwnerDetailsStep;
