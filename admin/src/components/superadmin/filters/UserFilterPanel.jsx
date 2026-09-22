import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiCheck, FiRotateCcw, FiUsers, FiShield, FiLock, FiBriefcase, FiCalendar, FiFolder, FiUserCheck } from "react-icons/fi";

import { Button } from "@sofia/ui";

const USER_TYPES = [
  { value: "superadmin", label: "SuperAdmin" },
  { value: "platform_admin", label: "Platform Admin" },
  { value: "store_admin", label: "Store Admin" },
  { value: "staff", label: "Staff" },
  { value: "customer", label: "Customer" },
];

const STATUSES = ["Active", "Inactive", "Suspended", "Blocked", "Archived", "Invited", "PendingActivation"];

const PRESETS = [
  { key: "platformOnly", label: "Platform Users" },
  { key: "storeOwners", label: "Store Owners" },
  { key: "staff", label: "Staff" },
  { key: "all", label: "All" },
];

/* ---------- Presentational helpers ---------- */

const SectionTitle = ({ icon: Icon, children, badge }) => (
  <div className="mb-2 flex items-center justify-between">
    <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {Icon && <Icon size={13} className="text-emerald-500" />}
      {children}
    </h4>
    {badge !== undefined && badge !== null && (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        {badge}
      </span>
    )}
  </div>
);

const OptionRow = ({ children, className = "" }) => (
  <label
    className={`-mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/60 ${className}`}
  >
    {children}
  </label>
);

const CheckIcon = (props) => (
  <input
    type="checkbox"
    {...props}
    className="h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
  />
);

const RadioIcon = ({ name, ...props }) => (
  <input
    type="radio"
    name={name}
    {...props}
    className="h-4 w-4 shrink-0 border-gray-300 text-emerald-600 focus:ring-emerald-500"
  />
);

const DateField = ({ label, ...inputProps }) => (
  <div>
    <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-400">
      {label}
    </label>
    <input
      type="date"
      {...inputProps}
      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
    />
  </div>
);

/* ---------- Component ---------- */

const UserFilterPanel = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  userTypes = [],
  statuses = [],
  roleOptions = [],
  stores = [],
  departments = [],
  onApply,
  onPresetSelect,
}) => {
  const { t } = useTranslation();

  const [localFilters, setLocalFilters] = useState({
    userType: filters?.userType ?? filters?.userTypes ?? [],
    status: filters?.status ?? filters?.statuses ?? [],
    twoFactorEnabled: filters?.twoFactorEnabled ?? null,
    twoFactorVerified: filters?.twoFactorVerified ?? null,
    forcePasswordChange: filters?.forcePasswordChange ?? null,
    storeIds: filters?.storeIds ?? [],
    roleIds: filters?.roleIds ?? [],
    teamId: filters?.teamId ?? null,
    department: filters?.department ?? null,
    platformOnly: filters?.platformOnly ?? true,
    dateFrom: filters?.dateFrom ?? null,
    dateTo: filters?.dateTo ?? null,
    lastLoginFrom: filters?.lastLoginFrom ?? null,
    lastLoginTo: filters?.lastLoginTo ?? null,
  });

  useEffect(() => {
    if (!isOpen) return;
    setLocalFilters({
      userType: filters?.userType ?? filters?.userTypes ?? [],
      status: filters?.status ?? filters?.statuses ?? [],
      twoFactorEnabled: filters?.twoFactorEnabled ?? null,
      twoFactorVerified: filters?.twoFactorVerified ?? null,
      forcePasswordChange: filters?.forcePasswordChange ?? null,
      storeIds: filters?.storeIds ?? [],
      roleIds: filters?.roleIds ?? [],
      teamId: filters?.teamId ?? null,
      department: filters?.department ?? null,
      platformOnly: filters?.platformOnly ?? true,
      dateFrom: filters?.dateFrom ?? null,
      dateTo: filters?.dateTo ?? null,
      lastLoginFrom: filters?.lastLoginFrom ?? null,
      lastLoginTo: filters?.lastLoginTo ?? null,
    });
  }, [isOpen, filters]);

  const toggleArrayValue = (arr, setArr, value) => {
    if (arr.includes(value)) {
      setArr(arr.filter((v) => v !== value));
    } else {
      setArr([...arr, value]);
    }
  };

  const handleApply = () => {
    setFilters(localFilters);
    onApply && onApply(localFilters);
    onClose && onClose();
  };

  const handleReset = () => {
    const cleared = {
      userType: [],
      status: [],
      twoFactorEnabled: null,
      twoFactorVerified: null,
      forcePasswordChange: null,
      storeIds: [],
      roleIds: [],
      teamId: null,
      department: null,
      platformOnly: false,
      dateFrom: null,
      dateTo: null,
      lastLoginFrom: null,
      lastLoginTo: null,
    };
    setLocalFilters(cleared);
    setFilters(cleared);
    onApply && onApply(cleared);
  };

  const availableUserTypes = userTypes.length > 0 ? userTypes : USER_TYPES;
  const normalizedUserTypes = availableUserTypes.map((ut) =>
    typeof ut === "string" ? { value: ut, label: ut } : ut
  );
  const availableStatuses = statuses.length > 0 ? statuses : STATUSES;
  const platformRoleOptions = roleOptions.filter((r) => !r.scope || r.scope === "platform");

  const activeCount =
    localFilters.userType.length +
    localFilters.status.length +
    localFilters.roleIds.length +
    localFilters.storeIds.length +
    (localFilters.twoFactorEnabled !== null ? 1 : 0) +
    (localFilters.twoFactorVerified !== null ? 1 : 0) +
    (localFilters.forcePasswordChange !== null ? 1 : 0) +
    (localFilters.department ? 1 : 0) +
    (localFilters.lastLoginFrom || localFilters.lastLoginTo ? 1 : 0) +
    (localFilters.dateFrom || localFilters.dateTo ? 1 : 0);

  return (
    <>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px]" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-80 flex-col bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("Filters")}
              {activeCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400">{activeCount > 0 ? `${activeCount} filter(s) active` : "Refine the users list"}</p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <FiX size={18} />
          </Button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* Presets */}
          <section>
            <SectionTitle icon={FiUserCheck}>{t("Preset") || "Preset"}</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  onClick={() => onPresetSelect && onPresetSelect(preset.key)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-600 dark:hover:bg-gray-800 dark:hover:text-emerald-300"
                >
                  {t(preset.label) || preset.label}
                </Button>
              ))}
            </div>
          </section>

          {/* Platform Only */}
          <section>
            <SectionTitle icon={FiBriefcase}>{t("PlatformOnly") || "Platform Only"}</SectionTitle>
            <div className="space-y-0.5">
              <OptionRow>
                <RadioIcon name="platformOnly" checked={localFilters.platformOnly === true} onChange={() => setLocalFilters({ ...localFilters, platformOnly: true })} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t("Yes")}</span>
              </OptionRow>
              <OptionRow>
                <RadioIcon name="platformOnly" checked={localFilters.platformOnly === false} onChange={() => setLocalFilters({ ...localFilters, platformOnly: false })} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t("No")}</span>
              </OptionRow>
            </div>
          </section>

          {/* User Type */}
          <section>
            <SectionTitle icon={FiUsers} badge={localFilters.userType.length || null}>
              {t("UserType")}
            </SectionTitle>
            <div className="space-y-0.5">
              {normalizedUserTypes.map((ut) => (
                <OptionRow key={ut.value}>
                  <CheckIcon checked={localFilters.userType.includes(ut.value)} onChange={() =>
                    toggleArrayValue(
                      localFilters.userType,
                      (v) => setLocalFilters({ ...localFilters, userType: v }),
                      ut.value
                    )
                  } />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t(ut.label) || ut.label}</span>
                </OptionRow>
              ))}
            </div>
          </section>

          {/* Status */}
          <section>
            <SectionTitle icon={FiShield} badge={localFilters.status.length || null}>
              {t("Status")}
            </SectionTitle>
            <div className="space-y-0.5">
              {availableStatuses.map((st) => (
                <OptionRow key={st}>
                  <CheckIcon checked={localFilters.status.includes(st)} onChange={() =>
                    toggleArrayValue(
                      localFilters.status,
                      (v) => setLocalFilters({ ...localFilters, status: v }),
                      st
                    )
                  } />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t(st) || st}</span>
                </OptionRow>
              ))}
            </div>
          </section>

          {/* 2FA */}
          <section>
            <SectionTitle icon={FiLock}>{t("TwoFA")}</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                [true, t("Enabled")],
                [false, t("Disabled")],
                [null, t("All")],
              ].map(([value, label]) => (
                <Button
                  key={String(value)}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, twoFactorEnabled: value })}
                  className={`rounded-lg border px-1 py-1.5 text-xs font-medium transition-colors ${
                    localFilters.twoFactorEnabled === value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"
                  }`}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="mt-3">
              <SectionTitle>2FA Verified</SectionTitle>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  [true, t("Verified")],
                  [false, t("Unverified")],
                  [null, t("All")],
                ].map(([value, label]) => (
                  <Button
                    key={String(value)}
                    type="button"
                    onClick={() => setLocalFilters({ ...localFilters, twoFactorVerified: value })}
                    className={`rounded-lg border px-1 py-1.5 text-xs font-medium transition-colors ${
                      localFilters.twoFactorVerified === value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <SectionTitle>{t("ForcePasswordChange")}</SectionTitle>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  [true, t("Yes")],
                  [false, t("No")],
                  [null, t("All")],
                ].map(([value, label]) => (
                  <Button
                    key={String(value)}
                    type="button"
                    onClick={() => setLocalFilters({ ...localFilters, forcePasswordChange: value })}
                    className={`rounded-lg border px-1 py-1.5 text-xs font-medium transition-colors ${
                      localFilters.forcePasswordChange === value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Store Assignment */}
          <section>
            <SectionTitle icon={FiFolder} badge={localFilters.storeIds.length || null}>
              {t("StoreAssignment")}
            </SectionTitle>
            <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-600">
              {stores.length === 0 ? (
                <p className="text-xs text-gray-400">{t("NoStoresAvailable") || "No stores available"}</p>
              ) : (
                stores.map((store) => (
                  <OptionRow key={store._id}>
                    <CheckIcon checked={localFilters.storeIds.includes(store._id)} onChange={() =>
                      toggleArrayValue(
                        localFilters.storeIds,
                        (v) => setLocalFilters({ ...localFilters, storeIds: v }),
                        store._id
                      )
                    } />
                    <span className="truncate text-sm text-gray-700 dark:text-gray-300">{store.name}</span>
                  </OptionRow>
                ))
              )}
            </div>
          </section>

          {/* Role */}
          <section>
            <SectionTitle icon={FiShield} badge={localFilters.roleIds.length || null}>
              {t("Role")}
            </SectionTitle>
            <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-600">
              {platformRoleOptions.length === 0 ? (
                <p className="text-xs text-gray-400">{t("NoRolesAvailable") || "No roles available"}</p>
              ) : (
                platformRoleOptions.map((role) => (
                  <OptionRow key={role._id}>
                    <CheckIcon checked={localFilters.roleIds.includes(role._id)} onChange={() =>
                      toggleArrayValue(
                        localFilters.roleIds,
                        (v) => setLocalFilters({ ...localFilters, roleIds: v }),
                        role._id
                      )
                    } />
                    <span className="truncate text-sm text-gray-700 dark:text-gray-300">{role.name}</span>
                  </OptionRow>
                ))
              )}
            </div>
          </section>

          {/* Department */}
          {departments && departments.length > 0 && (
            <section>
              <SectionTitle icon={FiBriefcase}>{t("Department")}</SectionTitle>
              <select
                value={localFilters.department || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, department: e.target.value || null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="">{t("AllDepartments")}</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </section>
          )}

          {/* Dates */}
          <section>
            <SectionTitle icon={FiCalendar}>Last login</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <DateField
                label={t("From")}
                value={
                  localFilters.lastLoginFrom
                    ? new Date(localFilters.lastLoginFrom).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    lastLoginFrom: e.target.value ? new Date(e.target.value) : null,
                  })
                }
              />
              <DateField
                label={t("To")}
                value={
                  localFilters.lastLoginTo
                    ? new Date(localFilters.lastLoginTo).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    lastLoginTo: e.target.value ? new Date(e.target.value) : null,
                  })
                }
              />
            </div>
          </section>

          <section>
            <SectionTitle icon={FiCalendar}>Created</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <DateField
                label={t("From")}
                value={localFilters.dateFrom ? new Date(localFilters.dateFrom).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, dateFrom: e.target.value ? new Date(e.target.value) : null })
                }
              />
              <DateField
                label={t("To")}
                value={localFilters.dateTo ? new Date(localFilters.dateTo).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, dateTo: e.target.value ? new Date(e.target.value) : null })
                }
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex items-center gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <Button layout="outline" size="small" onClick={handleReset} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl">
            <FiRotateCcw size={13} />
            {t("Reset") || "Reset"}
          </Button>
          <Button size="small" onClick={handleApply} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800">
            <FiCheck size={13} />
            {t("ApplyFilters") || "Apply"}
          </Button>
        </footer>
          </aside>
        </>
      )}
    </>
  );
};

export default UserFilterPanel;
