import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams, useLocation, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Label, Select, Textarea } from "@windmill/react-ui";
import { FiArrowLeft, FiShield, FiChevronDown, FiChevronRight, FiSearch, FiCheck, FiX, FiCopy, FiPlus } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import roleAPI from "@/services/api/roleAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import { CButton } from "@/components/ui";
import { Button } from "@sofia/ui";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  scope: "platform",
  permissions: [],
};

const SCOPES = [
  { value: "platform", label: "Platform" },
  { value: "store", label: "Store" },
];

const RoleDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const history = useHistory();
  const queryClient = useQueryClient();
  const isCreate = !id;
  const isFormMode = isCreate || location.pathname.endsWith("/edit");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [expandedModules, setExpandedModules] = useState({});
  const [copySuccess, setCopySuccess] = useState(false);

  const { data: permissionsData, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["platformRolePermissions"],
    queryFn: () => roleAPI.getAllPermissions({ scope: "platform", limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["platformRole", id],
    queryFn: () => roleAPI.getRoleById(id),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });

  const role = data?.data || data;
  const permissions = permissionsData?.data || [];
  const groupedByModule = permissionsData?.groupedByModule || {};

  const MODULE_ORDER = [
    "Dashboard", "Platform Dashboard", "Platform User", "Platform Role",
    "Platform Coupons", "Platform Store", "Platform Billing", "Platform Plan",
    "Platform Settings", "Platform Invitation", "Platform Team", "Platform Staff",
    "Analytics", "Audit", "Settings",
    "Products", "Categories", "Attributes", "Coupons", "Customers", "Orders",
    "Staff", "Riders", "Reviews", "Posts", "Website Visibility", "Online Store",
    "Pages", "Plans", "Features", "QuotaTypes", "Subscriptions", "Invoices",
    "Payments", "Notifications",
  ];
  const moduleSortIndex = new Map(MODULE_ORDER.map((m, i) => [m, i]));
  const sortedModules = useMemo(() => {
    return Object.keys(groupedByModule).sort((a, b) => {
      const ai = moduleSortIndex.has(a) ? moduleSortIndex.get(a) : 999;
      const bi = moduleSortIndex.has(b) ? moduleSortIndex.get(b) : 999;
      return ai - bi;
    });
  }, [groupedByModule]);

  const ACTION_LABELS = {
    view: "View", create: "Create", update: "Update", delete: "Delete",
    export: "Export", suspend: "Suspend", activate: "Activate", restore: "Restore",
    transfer: "Transfer", impersonate: "Impersonate", resend: "Resend",
    cancel: "Cancel", revoke: "Revoke", members_manage: "Members manage",
    role_assign: "Role assign", team_manage: "Team manage", sessions: "Sessions",
    login_history: "Login history", assign: "Assign", clone: "Clone",
    archive: "Archive", send: "Send", retry: "Retry", manage: "Manage",
    publish: "Publish", duplicate: "Duplicate", feature: "Feature",
    approve: "Approve", reply: "Reply", refund: "Refund",
    preview: "Preview", "set.home": "Set home", "restore.version": "Restore version",
    "compare.versions": "Compare versions", manageCategories: "Manage categories",
    manageTags: "Manage tags", manageComments: "Manage comments",
    "view.activity": "View activity", "revoke.sessions": "Revoke sessions",
    "reset.password": "Reset password", block: "Block", unblock: "Unblock",
    invite: "Invite", view_members: "View members", view_teams: "View teams",
    view_audit: "View audit", logoutAllDevices: "Logout all devices",
    resetPassword: "Reset password", reset2fa: "Reset 2FA", assignRole: "Assign role",
  };

  const STANDARD_ACTIONS = ["view", "create", "update", "delete", "export"];
  const getActionLabel = (action) => {
    if (!action) return "Unknown";
    return ACTION_LABELS[action] || action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const getRiskBadge = (riskLevel) => {
    if (!riskLevel || riskLevel === "low") return null;
    const colors = {
      medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      critical: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${colors[riskLevel] || ""}`}>{riskLevel}</span>;
  };

  const toggleModule = (moduleName) => {
    setExpandedModules((prev) => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };

  const togglePermission = useCallback((permissionId) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permissionId)
        ? current.permissions.filter((id) => id !== permissionId)
        : [...current.permissions, permissionId],
    }));
  }, []);

  const toggleModulePermissions = useCallback((moduleName, modulePermissions) => {
    const modulePermissionIds = modulePermissions.map((p) => p._id);
    const allSelected = modulePermissionIds.every((id) => form.permissions.includes(id));
    setForm((current) => {
      const newPermissions = [...current.permissions];
      if (allSelected) {
        return { ...current, permissions: newPermissions.filter((id) => !modulePermissionIds.includes(id)) };
      }
      const merged = [...newPermissions];
      for (const id of modulePermissionIds) {
        if (!merged.includes(id)) merged.push(id);
      }
      return { ...current, permissions: merged };
    });
  }, [form.permissions]);

  useEffect(() => {
    if (role) {
      setForm({
        name: role.name || "",
        slug: role.slug || "",
        description: role.description || "",
        scope: role.scope || "platform",
        permissions: (role.permissions || [])
          .map((permission) => (typeof permission === "string" ? permission : permission?._id))
          .filter(Boolean),
      });
    }
  }, [role]);

  useEffect(() => {
    if (permissionsData && !isCreate) {
      setExpandedModules((prev) => {
        const next = { ...prev };
        sortedModules.forEach((moduleName) => {
          if (next[moduleName] === undefined) {
            next[moduleName] = true;
          }
        });
        return next;
      });
    }
  }, [permissionsData, sortedModules, isCreate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const generateSlug = () => {
    const slug = form.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((current) => ({ ...current, slug }));
  };

  const copySlug = async () => {
    if (form.slug) {
      await navigator.clipboard.writeText(form.slug);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSaving(true);
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        scope: form.scope,
        permissions: form.permissions,
      };

      const response = isCreate
        ? await roleAPI.createRole(payload)
        : await roleAPI.updateRole(id, payload);
      const savedRole = response?.data || response;

      notifySuccess(isCreate ? t("RoleCreatedSuccess") || "Role created" : t("RoleUpdatedSuccess") || "Role updated");
      queryClient.invalidateQueries({ queryKey: ["platformRoles"] });
      if (isCreate && savedRole?._id) {
        history.replace(`/platform/roles/${savedRole._id}`);
      } else if (isCreate) {
        history.replace("/platform/roles");
      } else {
        queryClient.invalidateQueries({ queryKey: ["platformRole", id] });
        history.push(`/platform/roles/${id}`);
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isCreate && isLoading) {
    return <TableLoading row={5} col={4} />;
  }

  if (!isCreate && (error || !role)) {
    return (
      <div className="px-4 md:px-6 w-full">
        <Link to="/platform/roles" className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <FiArrowLeft className="mr-2" size={16} />
          {t("BackToRoles") || "Back to roles"}
        </Link>
        <NotFound title={t("RoleNotFound") || "Role not found"} text={error?.response?.data?.message || error?.message || ""} />
      </div>
    );
  }

  const selectedCount = form.permissions.length;
  const totalCount = permissions.length;

  return (
    <div className="px-4 md:px-6 w-full">
      <AnimatedContent>
        <div className="mb-8 p-4">
          <Link
            to="/platform/roles"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
          >
            <FiArrowLeft size={16} />
            {t("BackToRoles") || "Back to roles"}
          </Link>
        </div>

        <div className="mb-10 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <FiShield size={28} />
            </div>
            <div>
              <PageTitle className="mb-1">
                {isCreate ? t("CreateRole") || "Create Role" : role.name}
              </PageTitle>
              {isCreate && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("CreateRoleDesc") || "Define a new role and assign permissions"}
                </p>
              )}
            </div>
          </div>
        </div>
      </AnimatedContent>

      {isFormMode ? (
        <form onSubmit={handleSubmit} className="space-y-6 p-4 md:p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <AnimatedContent>
            <Card className="min-w-0 bg-white shadow-sm dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    <FiShield size={18} />
                  </span>
                  {isCreate ? t("NewRoleInfo") || "New Role Information" : t("EditRoleInfo") || "Edit Role Information"}
                </h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t("Name")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Platform Manager"
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t("Slug") || "Slug"}
                      </Label>
                      {form.name && (
                        <Button
                          type="button"
                          onClick={generateSlug}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                        >
                          Generate
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        name="slug"
                        value={form.slug}
                        onChange={handleChange}
                        placeholder="role-slug"
                        className="w-full pr-10"
                      />
                      {form.slug && (
                        <Button
                          type="button"
                          onClick={copySlug}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          title="Copy slug"
                        >
                          {copySuccess ? <FiCheck className="text-emerald-600" size={14} /> : <FiCopy size={14} />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t("Scope") || "Scope"}
                    </Label>
                    <Select
                      name="scope"
                      value={form.scope}
                      onChange={(e) => setForm((current) => ({ ...current, scope: e.target.value }))}
                      className="w-full md:w-1/2"
                    >
                      {SCOPES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t("Description")}
                    </Label>
                    <Textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Describe this role's purpose and responsibilities..."
                      className="w-full"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          </AnimatedContent>

          <AnimatedContent>
            <Card className="min-w-0 bg-white shadow-sm dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardBody className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                      <FiShield size={18} />
                    </span>
                    {t("Permissions")}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <Input
                        type="search"
                        placeholder="Search permissions..."
                        className="pl-9 w-full sm:w-64"
                        onChange={(e) => setPermissionSearch(e.target.value.toLowerCase())}
                      />
                    </div>
                    <Badge type="primary" className="whitespace-nowrap">
                      {selectedCount} / {totalCount}
                    </Badge>
                  </div>
                </div>

                {form.scope === "store" && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {t("StoreScopePermissionsNote") ||
                      "This endpoint lists platform permissions only. For store-scope roles, assign permissions from the store settings."}
                  </div>
                )}

                {isLoadingPermissions ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                  </div>
                ) : permissions.length ? (
                  <div className="space-y-4">
                    {sortedModules.map((moduleName) => {
                      const modulePerms = groupedByModule[moduleName] || [];
                      const modulePermissionIds = modulePerms.map((p) => p._id);
                      const selectedCount = modulePermissionIds.filter((id) => form.permissions.includes(id)).length;
                      const isAllSelected = selectedCount === modulePermissionIds.length && modulePermissionIds.length > 0;
                      const isOpen = expandedModules[moduleName] !== false;
                      const standardPerms = modulePerms.filter((p) => STANDARD_ACTIONS.includes(p.action));
                      const otherPerms = modulePerms.filter((p) => !STANDARD_ACTIONS.includes(p.action));

                      const filteredStandardPerms = permissionSearch
                        ? standardPerms.filter((p) => {
                            const label = (getActionLabel(p.action) + " " + (p.name || "")).toLowerCase();
                            const code = (p.code || "").toLowerCase();
                            return label.includes(permissionSearch) || code.includes(permissionSearch);
                          })
                        : standardPerms;
                      const filteredOtherPerms = permissionSearch
                        ? otherPerms.filter((p) => {
                            const label = (getActionLabel(p.action) + " " + (p.name || "")).toLowerCase();
                            const code = (p.code || "").toLowerCase();
                            return label.includes(permissionSearch) || code.includes(permissionSearch);
                          })
                        : otherPerms;

                      if (permissionSearch && filteredStandardPerms.length === 0 && filteredOtherPerms.length === 0) {
                        return null;
                      }

                      const progress = modulePermissionIds.length > 0 ? (selectedCount / modulePermissionIds.length) * 100 : 0;

                      return (
                        <div key={moduleName} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-colors">
                          <Button
                            type="button"
                            onClick={() => toggleModule(moduleName)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {isOpen ? (
                                <FiChevronDown className="text-gray-400 flex-shrink-0 transition-transform" size={18} />
                              ) : (
                                <FiChevronRight className="text-gray-400 flex-shrink-0 transition-transform" size={18} />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200 truncate pt-6">{moduleName}</span>
                                  {isAllSelected && (
                                    <FiCheck className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={14} />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[140px]">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                                    {selectedCount}/{modulePermissionIds.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span
                              onClick={(e) => { e.stopPropagation(); toggleModulePermissions(moduleName, modulePerms); }}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex-shrink-0"
                            >
                              {isAllSelected ? "Deselect all" : "Select all"}
                            </span>
                          </Button>
                          {isOpen && (
                            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-5 dark:border-gray-700 dark:bg-gray-900/30">
                              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                                {[...filteredStandardPerms, ...filteredOtherPerms].map((perm) => {
                                  const checked = form.permissions.includes(perm._id);
                                  return (
                                    <label
                                      key={perm._id}
                                      title={perm.code || ""}
                                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                                        checked
                                          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700/60 dark:bg-emerald-900/15"
                                          : "border-transparent bg-white/80 hover:border-emerald-200 hover:bg-white dark:border-transparent dark:bg-gray-800/70 dark:hover:border-emerald-700/50 dark:hover:bg-gray-800"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => togglePermission(perm._id)}
                                        className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded-md border-gray-300 accent-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-700"
                                      />
                                      <span className="flex min-w-0 flex-col">
                                        <span className="flex items-center gap-2">
                                          <span className="truncate font-medium text-gray-800 dark:text-gray-100">
                                            {getActionLabel(perm.action)}
                                          </span>
                                          {getRiskBadge(perm.riskLevel)}
                                        </span>
                                        {perm.code && (
                                          <span className="truncate font-mono text-[11px] text-gray-400">
                                            {perm.code}
                                          </span>
                                        )}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                      <FiShield className="text-gray-400 dark:text-gray-500" size={28} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoPermissions") || "No permissions available."}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </AnimatedContent>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <CButton type="button" variant="outline" onClick={() => history.push(isCreate ? "/platform/roles" : `/platform/roles/${id}`)} className="min-w-[120px]">
              {t("Cancel") || "Cancel"}
            </CButton>
            <CButton type="submit" loading={isSaving} icon="save" className="min-w-[140px]">
              {isSaving ? t("Processing") || "Saving..." : t("Save") || "Save Role"}
            </CButton>
          </div>
        </form>
      ) : (
        <div className="space-y-6 p-4 md:p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <AnimatedContent>
            <Card className="min-w-0 bg-white shadow-sm dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardBody className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                      <FiShield size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{role.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge type={role.scope === "platform" ? "info" : "warning"}>{role.scope}</Badge>
                        {role.isSystem && <Badge type="neutral">{t("System") || "System"}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("Permissions")}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{role.permissions?.length || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Name")}</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{role.name || "-"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Slug") || "Slug"}</p>
                    <code className="text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{role.slug || "-"}</code>
                  </div>
                  <div className="md:col-span-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Description")}</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{role.description || "-"}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </AnimatedContent>

          <AnimatedContent>
            <Card className="min-w-0 bg-white shadow-sm dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">{t("PermissionList") || "Permission List"}</h3>
                {role.permissions?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission) => {
                      const permissionName = typeof permission === "string"
                        ? permission
                        : permission.name || permission.action || permission._id;
                      return (
                        <span key={permission._id || permissionName} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <FiCheck size={12} />
                          {permissionName}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                      <FiShield className="text-gray-400 dark:text-gray-500" size={28} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoPermissions") || "No permissions assigned."}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </AnimatedContent>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <CButton variant="outline" onClick={() => history.push("/platform/roles")}>
              {t("BackToRoles") || "Back to roles"}
            </CButton>
            <CButton icon="edit" onClick={() => history.push(`/platform/roles/${id}/edit`)}>
              {t("Edit") || "Edit Role"}
            </CButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleDetail;
