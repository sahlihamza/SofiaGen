import { Card, CardBody } from "@windmill/react-ui";

import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus, FiShield, FiTrash2 } from "react-icons/fi";
import { Link } from "react-router-dom";

import AnimatedContent from "@/components/common/AnimatedContent";
import Error from "@/components/form/others/Error";
import InputAreaTwo from "@/components/form/input/InputAreaTwo";
import PageTitle from "@/components/Typography/PageTitle";
import DeleteRoleModal from "@/components/modal/DeleteRoleModal";
import RoleServices from "@/services/RoleServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import useGetCData from "@/hooks/useGetCData";
import { useStoreContext } from "@/context/StoreContext";
import { Button } from "@sofia/ui";

const Roles = () => {
  const { t } = useTranslation();
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const { hasPermission } = useGetCData();
  const { currentStoreId } = useStoreContext() || {};
  const canCreateRole = hasPermission("staff", "create");
  const canDeleteRole = hasPermission("staff", "delete");

  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  const loadRoles = async () => {
    const requestedStoreId = currentStoreId;
    try {
      setIsLoadingRoles(true);
      const res = await RoleServices.getRoles();
      if (requestedStoreId !== latestStoreIdRef.current) return;

      const roleList = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      setRoles(roleList);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      if (requestedStoreId === latestStoreIdRef.current) {
        setIsLoadingRoles(false);
      }
    }
  };

  useEffect(() => {
    if (!currentStoreId) {
      setRoles([]);
      return;
    }

    loadRoles();
  }, [currentStoreId]);

  const onSubmit = async (data) => {
    try {
      setIsSubmittingRole(true);
      await RoleServices.createRole({
        name: data.name.trim(),
        description: data.description?.trim() || "",
      });

      notifySuccess(t("RolesCreateSuccess"));
      reset({ name: "", description: "" });
      await loadRoles();
    } catch (err) {
      if (err?.response?.status === 409) {
        notifyError(t("RolesNameAlreadyExists"));
      } else {
        notifyError(err?.response?.data?.message || err?.message);
      }
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      setIsDeletingRole(true);
      await RoleServices.deleteRole(roleToDelete._id);

      notifySuccess(t("RoleDeleteSuccess"));
      setRoleToDelete(null);
      await loadRoles();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeletingRole(false);
    }
  };

  const countPermissions = (rolePermissions) =>
    Array.isArray(rolePermissions) ? rolePermissions.length : 0;

  return (
    <>
      <PageTitle>{t("RolesPageTitle")}</PageTitle>

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
        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-12 xl:col-span-6">
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
              <CardBody className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold text-lg">
                      <FiShield className="text-emerald-600" />
                      {t("RolesCreateNewRole")}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("RolesCreateDescription")}
                    </p>
                  </div>

                  <Link
                    to="/settings/permissions"
                    className="shrink-0 inline-flex items-center rounded-md border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    {t("RolesManagePermissions")}
                  </Link>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {t("RolesRoleName")}
                    </label>
                    <InputAreaTwo
                      register={register}
                      label={t("RolesRoleName")}
                      name="name"
                      type="text"
                      required={true}
                      placeholder={t("RolesRoleNamePlaceholder")}
                    />
                    <Error errorName={errors.name} />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {t("RolesDescription")}
                    </label>
                    <textarea
                      {...register("description", {
                        required: t("RolesDescriptionRequired"),
                      })}
                      rows={6}
                      placeholder={t("RolesDescriptionPlaceholder")}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                    <Error errorName={errors.description} />
                  </div>

                  {canCreateRole && (
                    <Button
                      disabled={isSubmittingRole}
                      type="submit"
                      className="h-11 w-full bg-emerald-600"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FiPlus />
                        {isSubmittingRole ? t("Processing") : t("RolesCreateRole")}
                      </span>
                    </Button>
                  )}
                </form>
              </CardBody>
            </Card>
          </div>

          <div className="col-span-12 xl:col-span-6">
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
              <CardBody className="p-6">
                <div className="mb-5">
                  <div className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold text-lg">
                    <FiShield className="text-emerald-600" />
                    {t("RolePermissionsDefinedRoles")}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("RolePermissionsDefinedRolesDescription")}
                  </p>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {isLoadingRoles ? (
                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("RolePermissionsLoading")}
                    </div>
                  ) : roles.length > 0 ? (
                    roles.map((role) => (
                      <div
                        key={role._id}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-emerald-200 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {role.name}
                            </p>
                            <p
                              className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate"
                              title={role.description || t("RolePermissionsNoDescription")}
                            >
                              {role.description || t("RolePermissionsNoDescription")}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            {countPermissions(role.permissions)} {t("RolePermissionsPerms")}
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
                    ))
                  ) : (
                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("RolePermissionsNoRoleFound")}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </AnimatedContent>
    </>
  );
};

export default Roles;
