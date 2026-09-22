import { Card, CardBody, Table, TableBody, TableCell, TableContainer, TableHeader } from "@windmill/react-ui";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiRefreshCw, FiShield, FiTrash2, FiUserCheck } from "react-icons/fi";

import AnimatedContent from "@/components/common/AnimatedContent";
import PageTitle from "@/components/Typography/PageTitle";
import RoleServices from "@/services/RoleServices";
import roleTemplateAPI from "@/services/api/roleTemplateAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import useGetCData from "@/hooks/useGetCData";
import { useStoreContext } from "@/context/StoreContext";
import SavePermissionsModal from "@/components/modal/SavePermissionsModal";
import DeleteRoleModal from "@/components/modal/DeleteRoleModal";
import { Button } from "@sofia/ui";

const RolePermissions = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { currentStoreId } = useStoreContext() || {};
  const canUpdateRole = hasPermission("staff", "update");
  const canDeleteRole = hasPermission("staff", "delete");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [roles, setRoles] = useState([]);
  const [predefinedRoles, setPredefinedRoles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templatePermissions, setTemplatePermissions] = useState({});

  const normalizeRolePermissions = (rolePermissions) => {
    if (!Array.isArray(rolePermissions)) return [];

    return rolePermissions.map((permission) =>
      typeof permission === "string" ? permission : permission?._id
    );
  };

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  const loadRolesData = async () => {
    const requestedStoreId = currentStoreId;
    setIsLoading(true);
    try {
      const [permissionsRes, predefinedRes, templatesRes] = await Promise.all([
        RoleServices.getPermissions(),
        RoleServices.getPredefinedRoles(),
        roleTemplateAPI.getAllTemplates(),
      ]);
      if (requestedStoreId !== latestStoreIdRef.current) return;

      const permissionList = Array.isArray(permissionsRes?.data)
        ? permissionsRes.data
        : permissionsRes?.data?.data || [];
      const predefinedList = Array.isArray(predefinedRes?.data)
        ? predefinedRes.data
        : predefinedRes?.data?.data || [];
      const templatesList = Array.isArray(templatesRes?.data)
        ? templatesRes.data
        : templatesRes?.data?.data || [];

      setPermissions(permissionList);
      setPredefinedRoles(predefinedList);
      setTemplates(templatesList);

      const initialTemplatePerms = {};
      templatesList.forEach((tpl) => {
        initialTemplatePerms[tpl._id] = normalizeRolePermissions(tpl.permissions);
      });
      setTemplatePermissions(initialTemplatePerms);

      if (requestedStoreId) {
        try {
          const rolesRes = await RoleServices.getRoles();
          const roleList = Array.isArray(rolesRes?.data)
            ? rolesRes.data
            : rolesRes?.data?.data || [];
          setRoles(roleList);

          const stillExists = roleList.some((role) => role._id === selectedRoleId);
          if (!stillExists) {
            const firstRole = roleList[0];
            setSelectedRoleId(firstRole?._id || "");
            setSelectedPermissions(
              firstRole ? normalizeRolePermissions(firstRole.permissions) : []
            );
          }
        } catch {
          setRoles([]);
        }
      } else {
        setRoles([]);
        const firstPredefined = predefinedList[0];
        setSelectedRoleId(firstPredefined?._id || "");
        setSelectedPermissions(
          firstPredefined ? normalizeRolePermissions(firstPredefined.permissions) : []
        );
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      if (requestedStoreId === latestStoreIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadRolesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId]);

  useEffect(() => {
    const allRoles = [...roles, ...predefinedRoles, ...templates];
    const role = allRoles.find((item) => item._id === selectedRoleId);
    if (role) {
      const perms = normalizeRolePermissions(role.permissions);
      setSelectedPermissions(perms);
      setTemplatePermissions((prev) => ({ ...prev, [role._id]: perms }));
      if (isTemplate(role)) {
        setEditingTemplateId(role._id);
      } else {
        setEditingTemplateId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId, roles, predefinedRoles, templates]);

  const groupedPermissions = useMemo(() => {
    const groups = permissions.reduce((acc, permission) => {
      const moduleName = permission?.module || "Other";
      if (!acc[moduleName]) {
        acc[moduleName] = [];
      }
      acc[moduleName].push(permission);
      return acc;
    }, {});

    return Object.entries(groups);
  }, [permissions]);


  const standardActionsOrder = ["view", "create", "update", "delete"];
  const actionColumns = useMemo(() => {
    const seen = new Set();
    const extras = [];

    permissions.forEach((permission) => {
      const action = permission?.action;
      if (action && !standardActionsOrder.includes(action) && !seen.has(action)) {
        seen.add(action);
        extras.push(action);
      }
    });

    return [...standardActionsOrder, ...extras.sort()];
  }, [permissions]);

  const selectedRole = [...roles, ...predefinedRoles].find((item) => item._id === selectedRoleId);

  const isEditingTemplate = editingTemplateId === selectedRoleId;

  const isPredefinedRole = (role) => {
    if (!role) return false;
    if (roles.some((r) => r._id === role._id)) return false;
    return predefinedRoles.some((pr) => pr._id === role._id);
  };

  const isTemplate = (role) => {
    if (!role) return false;
    return templates.some((t) => t._id === role._id);
  };

  const handleCreateFromTemplate = async (template) => {
    if (!template || !currentStoreId) return;
    try {
      const res = await RoleServices.createRole({
        name: template.name,
        description: template.description || "",
        permissions: normalizeRolePermissions(template.permissions),
        storeId: currentStoreId,
      });
      notifySuccess(t("RolesCreateSuccess"));
      await loadRolesData();
      setSelectedRoleId(res?.data?._id || "");
    } catch (err) {
      if (err?.response?.status === 409) {
        notifyError(t("RolesNameAlreadyExists"));
      } else {
        notifyError(err?.response?.data?.message || err?.message);
      }
    }
  };

  const handleEditTemplate = async (template) => {
    if (!template) return;
    setEditingTemplateId(template._id);
    setSelectedRoleId(template._id);
    const perms = normalizeRolePermissions(template.permissions);
    setSelectedPermissions(perms);
    setTemplatePermissions((prev) => ({ ...prev, [template._id]: perms }));
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplateId) return;
    try {
      setIsSavingTemplate(true);
      await roleTemplateAPI.updateTemplate(editingTemplateId, {
        permissions: selectedPermissions,
      });
      notifySuccess(t("RolePermissionsSaveSuccess") || "Template updated successfully");
      setTemplatePermissions((prev) => ({
        ...prev,
        [editingTemplateId]: selectedPermissions,
      }));
      setEditingTemplateId(null);
      await loadRolesData();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const actionTranslationKeys = {
    view: "RolePermissionsView",
    create: "RolePermissionsCreate",
    update: "RolePermissionsEdit",
    delete: "RolePermissionsDelete",
  };

  const ACTION_REQUIRES = {
    create: ["view"],
    update: ["view"],
    delete: ["view"],
    duplicate: ["create"],
    preview: ["view"],
  };

  const resolveRequiredActions = (action, seen = new Set()) => {
    (ACTION_REQUIRES[action] || []).forEach((dep) => {
      if (!seen.has(dep)) {
        seen.add(dep);
        resolveRequiredActions(dep, seen);
      }
    });
    return seen;
  };

  const resolveDependentActions = (action, seen = new Set()) => {
    Object.entries(ACTION_REQUIRES).forEach(([act, deps]) => {
      if (deps.includes(action) && !seen.has(act)) {
        seen.add(act);
        resolveDependentActions(act, seen);
      }
    });
    return seen;
  };

  const permissionsByModule = useMemo(() => {
    const map = new Map();
    permissions.forEach((permission) => {
      const moduleName = permission?.module || "Other";
      if (!map.has(moduleName)) map.set(moduleName, []);
      map.get(moduleName).push(permission);
    });
    return map;
  }, [permissions]);

  const handlePermissionToggle = (permission, modulePermissions = []) => {
    const permissionId = permission._id;
    const permissionByAction = modulePermissions.reduce((acc, item) => {
      acc[item.action] = item;
      return acc;
    }, {});
    const idsForActions = (actions) =>
      [...actions].map((action) => permissionByAction[action]?._id).filter(Boolean);

    setSelectedPermissions((current) => {
      if (current.includes(permissionId)) {
        const removeIds = [
          permissionId,
          ...idsForActions(resolveDependentActions(permission.action)),
        ];

        return current.filter((id) => !removeIds.includes(id));
      }

      const addIds = [
        permissionId,
        ...idsForActions(resolveRequiredActions(permission.action)),
      ];

      return Array.from(new Set([...current, ...addIds]));
    });
  };

  const handleModuleToggle = (modulePermissions) => {
    const permissionIds = modulePermissions.map((permission) => permission._id);
    const allSelected = permissionIds.every((permissionId) =>
      selectedPermissions.includes(permissionId)
    );

    setSelectedPermissions((current) => {
      if (allSelected) {
        return current.filter((permissionId) => !permissionIds.includes(permissionId));
      }

      return Array.from(new Set([...current, ...permissionIds]));
    });
  };

  const handleActionToggle = (action, permissionIds) => {
    const allSelected =
      permissionIds.length > 0 &&
      permissionIds.every((permissionId) => selectedPermissions.includes(permissionId));

    setSelectedPermissions((current) => {
      if (allSelected) {
        const dependentActions = resolveDependentActions(action);
        const removeIds = new Set(permissionIds);

        permissionsByModule.forEach((modulePermissions) => {
          modulePermissions.forEach((permission) => {
            if (dependentActions.has(permission.action)) {
              removeIds.add(permission._id);
            }
          });
        });

        return current.filter((permissionId) => !removeIds.has(permissionId));
      }

      const requiredActions = resolveRequiredActions(action);
      const addIds = new Set(permissionIds);

      permissionsByModule.forEach((modulePermissions) => {
        const hasTargetAction = modulePermissions.some((p) => p.action === action);
        if (!hasTargetAction) return;

        modulePermissions.forEach((permission) => {
          if (requiredActions.has(permission.action)) {
            addIds.add(permission._id);
          }
        });
      });

      return Array.from(new Set([...current, ...addIds]));
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;

    try {
      setIsSavingPermissions(true);
      const res = await RoleServices.assignPermissions(selectedRoleId, {
        permissions: selectedPermissions,
      });

      notifySuccess(t("RolePermissionsSaveSuccess"));
      await loadRolesData();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSavingPermissions(false);
      setIsSaveModalOpen(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      setIsDeletingRole(true);
      await RoleServices.deleteRole(roleToDelete._id);

      notifySuccess(t("RoleDeleteSuccess"));

      if (selectedRoleId === roleToDelete._id) {
        setSelectedRoleId("");
        setSelectedPermissions([]);
      }

      setRoleToDelete(null);
      await loadRolesData();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeletingRole(false);
    }
  };

  return (
    <>
      <PageTitle>{t("RolePermissionsPageTitle")}</PageTitle>

      {isSaveModalOpen && (
        <SavePermissionsModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onConfirm={handleSavePermissions}
          isSubmitting={isSavingPermissions}
        />
      )}

      {roleToDelete && (
        <DeleteRoleModal
          isOpen={!!roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onConfirm={handleDeleteRole}
          roleName={roleToDelete?.name}
          isSubmitting={isDeletingRole}
        />
      )}

      <AnimatedContent>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-4 space-y-6">
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
              <CardBody className="p-6">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold text-lg">
                      <FiShield className="text-emerald-600" />
                      {t("RolePermissionsDefinedRoles")}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("RolePermissionsDefinedRolesDescription")}
                    </p>
                  </div>
                  {/* <Button
                    type="button"
                    layout="outline"
                    size="small"
                    onClick={loadRolesData}
                    disabled={isLoading}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiRefreshCw />
                      Refresh
                    </span>
                  </Button> */}
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {isLoading ? (
                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("RolePermissionsLoading")}
                    </div>
                  ) : roles.length > 0 || predefinedRoles.length > 0 ? (
                    <>
                      {roles.map((role) => {
                        const isActive = role._id === selectedRoleId;
                        const permissionsCount = normalizeRolePermissions(role.permissions).length;

                        return (
                          <div
                            key={role._id}
                            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-900/20"
                                : "border-gray-200 bg-white hover:border-emerald-200 dark:border-gray-700 dark:bg-gray-800"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <Button
                                type="button"
                                onClick={() => setSelectedRoleId(role._id)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                                  {role.name}
                                </p>
                                <p
                                  className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate"
                                  title={role.description || t("RolePermissionsNoDescription")}
                                >
                                  {role.description || t("RolePermissionsNoDescription")}
                                </p>
                              </Button>
                              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                {permissionsCount} {t("RolePermissionsPerms")}
                              </span>
                              {canDeleteRole && (
                                <Button
                                  type="button"
                                  onClick={() => setRoleToDelete(role)}
                                  className="shrink-0 text-gray-400 hover:text-red-500 transition"
                                  title={t("RoleDeleteConfirmButton")}
                                >
                                  <FiTrash2 />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {predefinedRoles.length > 0 && (
                        <>
                          <div className="pt-3 pb-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                              {t("RolePermissionsPredefinedRoles") || "Predefined Roles"}
                            </p>
                          </div>
                          {predefinedRoles.map((role) => {
                            const isActive = role._id === selectedRoleId;
                            const permissionsCount = normalizeRolePermissions(role.permissions).length;

                            return (
                              <div
                                key={role._id}
                                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                  isActive
                                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-900/20"
                                    : "border-gray-200 bg-gray-50 hover:border-emerald-200 dark:border-gray-700 dark:bg-gray-800"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <Button
                                    type="button"
                                    onClick={() => handleEditTemplate(role)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                                        {role.name}
                                      </p>
                                      <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                        {t("RolePermissionsTemplate") || "Template"}
                                      </span>
                                    </div>
                                    <p
                                      className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate"
                                      title={role.description || t("RolePermissionsNoDescription")}
                                    >
                                      {role.description || t("RolePermissionsNoDescription")}
                                    </p>
                                  </Button>
                                  <span className="shrink-0 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {permissionsCount} {t("RolePermissionsPerms")}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("RolePermissionsNoRoleFound")}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <Link
                    to="/settings/roles"
                    className="inline-flex items-center rounded-md border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    {t("RolePermissionsCreateRole")}
                  </Link>
                </div>
              </CardBody>
            </Card>

            {/* <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
              <CardBody className="p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Role Summary
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedRole?.name || "Select a role"}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {selectedRole?.description || "Choose a role from the left panel to edit its permissions."}
                </p>
              </CardBody>
            </Card> */}
          </div>

          <div className="col-span-12 xl:col-span-8 space-y-6">
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
              <CardBody className="p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold text-lg">
                      <FiShield className="text-emerald-600" />
                      {t("RolePermissionsMatrixTitle")}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("RolePermissionsMatrixDescription")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {selectedRole?.name || t("RolePermissionsNoRoleSelected")}
                    </span>
                    {isEditingTemplate ? (
                      <Button
                        className="bg-emerald-600"
                        onClick={handleSaveTemplate}
                        disabled={!selectedRoleId || isSavingTemplate}
                      >
                        {isSavingTemplate ? t("Processing") : t("RolePermissionsSave") || "Save Template"}
                      </Button>
                    ) : selectedRole && isPredefinedRole(selectedRole) ? (
                      <Button
                        layout="outline"
                        className="border-emerald-500 text-emerald-600"
                        onClick={() => handleCreateFromTemplate(selectedRole)}
                        disabled={!selectedRoleId || isSavingPermissions}
                      >
                        {t("RolePermissionsCreateFromTemplate") || "Create from template"}
                      </Button>
                    ) : (
                      canUpdateRole && (
                        <Button
                          className="bg-emerald-600"
                          onClick={() => setIsSaveModalOpen(true)}
                          disabled={!selectedRoleId || isSavingPermissions}
                        >
                          {isSavingPermissions ? t("Processing") : t("RolePermissionsSave")}
                        </Button>
                      )
                    )}
                    {isEditingTemplate && (
                      <Button
                        layout="outline"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setSelectedPermissions(templatePermissions[selectedRoleId] || []);
                        }}
                      >
                        {t("Cancel") || "Cancel"}
                      </Button>
                    )}
                  </div>
                </div>

                {selectedRole && isPredefinedRole(selectedRole) && !isEditingTemplate && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    {t("RolePermissionsPredefinedNotice") || "This is a predefined role template. You can view its default permissions below, but cannot modify them here. Use 'Create from template' to create a custom role with these permissions."}
                  </div>
                )}
                {isEditingTemplate && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {t("RolePermissionsEditingTemplate") || "You are editing a role template. Changes will be saved to the template and will affect all stores using this template."}
                  </div>
                )}

                {groupedPermissions.length > 0 ? (
                  <TableContainer className="overflow-visible">
                    <Table>
                      <TableHeader>
                        <tr>
                          <TableCell>{t("RolePermissionsModule")}</TableCell>
                          {actionColumns.map((action) => {
                            const actionPermissionIds = permissions
                              .filter((permission) => permission.action === action)
                              .map((permission) => permission._id);
                            const actionAllSelected =
                              actionPermissionIds.length > 0 &&
                              actionPermissionIds.every((permissionId) =>
                                selectedPermissions.includes(permissionId)
                              );
                            const actionLabel = actionTranslationKeys[action]
                              ? t(actionTranslationKeys[action])
                              : action.charAt(0).toUpperCase() + action.slice(1);

                            const isPredefined = selectedRole && isPredefinedRole(selectedRole) && !isEditingTemplate;

                            return (
                              <TableCell key={action}>
                                {action === "view" ? (
                                  <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={actionAllSelected}
                                      onChange={() => handleActionToggle(actionPermissionIds)}
                                      disabled={actionPermissionIds.length === 0 || isPredefined}
                                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>{actionLabel}</span>
                                  </label>
                                ) : (
                                  actionLabel
                                )}
                              </TableCell>
                            );
                          })}
                        </tr>
                      </TableHeader>
                      <TableBody>
                        {groupedPermissions.map(([moduleName, modulePermissions]) => {
                          const permissionByAction = modulePermissions.reduce((acc, permission) => {
                            acc[permission.action] = permission;
                            return acc;
                          }, {});
                          const modulePermissionIds = modulePermissions.map((permission) => permission._id);
                          const moduleSelected =
                            modulePermissionIds.length > 0 &&
                            modulePermissionIds.every((permissionId) =>
                              selectedPermissions.includes(permissionId)
                            );
                          const isPredefined = selectedRole && isPredefinedRole(selectedRole) && !isEditingTemplate;

                          return (
                            <tr key={moduleName}>
                              <TableCell>
                                <label className="inline-flex items-center gap-3 font-semibold text-gray-800 dark:text-gray-100 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={moduleSelected}
                                    onChange={() => handleModuleToggle(modulePermissions)}
                                    disabled={isPredefined}
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span>{moduleName}</span>
                                </label>
                              </TableCell>
                              {actionColumns.map((action) => {
                                const permission = permissionByAction[action];
                                const checked = permission
                                  ? selectedPermissions.includes(permission._id)
                                  : false;
                                const actionLabel = actionTranslationKeys[action]
                                  ? t(actionTranslationKeys[action])
                                  : action;

                                return (
                                  <TableCell key={`${moduleName}-${action}`}>
                                    {permission ? (
                                      <label className="inline-flex cursor-pointer items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => handlePermissionToggle(permission._id)}
                                          disabled={isPredefined}
                                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs uppercase text-gray-500 dark:text-gray-400">
                                          {actionLabel}
                                        </span>
                                      </label>
                                    ) : (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("RolePermissionsNoPermissions")}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </AnimatedContent>
    </>
  );
};

export default RolePermissions;