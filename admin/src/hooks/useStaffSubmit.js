import Cookies from "js-cookie";
import { useContext, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

//internal import
import RoleServices from "@/services/RoleServices";
import UserServices from "@/services/UserServices";
import { AdminContext } from "@/context/AdminContext";
import { SidebarContext } from "@/context/SidebarContext";
import { resolveRoleIds } from "@/utils/roleUtils";
import { notifyError, notifySuccess } from "@/utils/toast";
import useTranslationValue from "./useTranslationValue";
import platformAPI from "@/services/api/platformAPI";

const useStaffSubmit = (id) => {
  const { t } = useTranslation();
  const { state, dispatch } = useContext(AdminContext);
  const { adminInfo } = state;
  const { isDrawerOpen, closeDrawer, setIsUpdate, lang } =
    useContext(SidebarContext);
  const [imageUrl, setImageUrl] = useState("");
  const [language, setLanguage] = useState("en");
  const [resData, setResData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessedRoutes, setAccessedRoutes] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [department, setDepartment] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const location = useLocation();

  const { handlerTextTranslateHandler } = useTranslationValue();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    register("role", {
      validate: (value) =>
        (Array.isArray(value) && value.length > 0) || "Role is required!",
    });
  }, [register]);

  const selectedRoleOptions = useMemo(
    () =>
      roleOptions.filter(
        (role) => selectedRoleIds.includes(role?._id) || selectedRoleIds.includes(role?.name)
      ),
    [roleOptions, selectedRoleIds]
  );

  const watchedName = watch("name");
  const watchedEmail = watch("email");
  const watchedPhone = watch("phone");

  const isAddFormReady =
    !!imageUrl &&
    !!watchedName?.trim() &&
    !!watchedEmail?.trim() &&
    /^\d{8}$/.test(watchedPhone?.trim() || "") &&
    selectedRoleIds.length > 0;

  const isUpdateFormReady = isAddFormReady;

  const resetStaffForm = () => {
    reset({
      name: "",
      email: "",
      phone: "",
      role: "",
    });
    setImageUrl("");
    setAccessedRoutes([]);
    setSelectedRoleIds([]);
    clearErrors();
  };

  const handleSelectRole = (selectedList) => {
    const roleIds = resolveRoleIds(selectedList, roleOptions);
    setSelectedRoleIds(roleIds);
    setValue("role", roleIds, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRemoveRole = (selectedList) => {
    const roleIds = resolveRoleIds(selectedList, roleOptions);
    setSelectedRoleIds(roleIds);
    setValue("role", roleIds, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRemoveEmptyKey = (obj) => {
    for (const key in obj) {
      if (obj[key].trim() === "") {
        delete obj[key];
      }
    }
    return obj;
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      if (id && !imageUrl) {
        notifyError("Please upload a staff image before updating.");
        setIsSubmitting(false);
        return;
      }

      const staffData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: selectedRoleIds,
        // access_list: accessedRoutes?.map((list) => list.value),
        image: imageUrl,
        lang: language,
        department: department || "",
        twoFactorEnabled: twoFactorEnabled,
      };

      // return;
      const isSameAdmin = adminInfo?._id === resData?._id;
      // return setIsSubmitting(false);
      // const superAdmin = "Super Admin";

      // const allowedRoles = {
      //   [superAdmin]: [
      //     "Super Admin",
      //     "Admin",
      //     "Cashier",
      //     "CEO",
      //     "Manager",
      //     "Accountant",
      //     "Driver",
      //     "Security Guard",
      //     "Deliver Person",
      //   ], // Can update all roles
      //   Admin: [
      //     "Admin",
      //     "Cashier",
      //     "CEO",
      //     "Manager",
      //     "Accountant",
      //     "Driver",
      //     "Security Guard",
      //     "Deliver Person",
      //   ], // Can update Admin and Cashier
      //   CEO: [
      //     "Admin",
      //     "Cashier",
      //     "CEO",
      //     "Manager",
      //     "Accountant",
      //     "Driver",
      //     "Security Guard",
      //     "Deliver Person",
      //   ], // Can update Admin and Cashier
      //   Manager: [
      //     "Manager",
      //     "Accountant",
      //     "Driver",
      //     "Security Guard",
      //     "Deliver Person",
      //   ], // Can update only Manager
      //   Accountant: ["Accountant"], // Can update only Accountant
      //   Driver: ["Driver"], // Can update only Driver
      //   Cashier: ["Cashier"], // Can update only Cashier
      // };

      // if (!allowedRoles[staff?.role]?.includes(data?.role)) {
      //   // If the logged-in admin's role doesn't allow updating the selected role
      //   notifyError(
      //     `You are not allowed to update staff with the role: ${data?.role}`
      //   );
      //   setIsSubmitting(false);
      //   return;
      // }

      const isSuperAdmin = adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin";

      if (id) {
        let res;
        if (isSuperAdmin) {
          res = await platformAPI.updateUser(id, staffData);
        } else {
          res = await UserServices.updateStaff(id, staffData);
        }

        if (isSameAdmin) {
          dispatch({ type: "USER_LOGIN", payload: res.data });
          const cookieTimeOut = 0.5;
          Cookies.set("adminInfo", JSON.stringify(res.data), {
            expires: cookieTimeOut,
            sameSite: window.location.protocol === "https:" ? "None" : "Lax",
            secure: window.location.protocol === "https:",
          });
        }
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(t("StaffUpdateSuccess"));
        closeDrawer();
      } else {
        let res;
        if (isSuperAdmin) {
          res = await platformAPI.createUser(staffData);
        } else {
          res = await UserServices.addStaff(staffData);
        }
        setIsUpdate(true);
        setIsSubmitting(false);
        if (res?.emailSent === false) {
          notifyError(res.message);
        } else {
          notifySuccess(t("StaffAddSuccessWithEmail"));
        }
        resetStaffForm();
        closeDrawer();
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || "";
      const isDuplicateEmailError =
        err?.response?.status === 409 ||
        /email/i.test(errorMessage) ||
        /deja utilise/i.test(errorMessage);

      notifyError(errorMessage);
      setIsSubmitting(false);

      if (!isDuplicateEmailError) {
        closeDrawer();
      }
    }
  };

  const getStaffData = async () => {
    try {
      const isSuperAdmin = adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin";
      let res;
      if (isSuperAdmin) {
        res = await platformAPI.getUserById(id);
      } else {
        res = await UserServices.getStaffById(id, {
          email: adminInfo.email,
        });
      }

      if (res?.data) {
        const staff = res.data;
        setResData(staff);
        setValue("name", staff.name);
        setValue("email", staff.email);
        setValue("phone", staff.phone);
        const roleIds = resolveRoleIds(staff.role, roleOptions);
        setSelectedRoleIds(roleIds);
        setValue("role", roleIds);
        setImageUrl(staff.image);
        setDepartment(staff.department || "");
        setTwoFactorEnabled(staff.twoFactorEnabled || false);
        const result = staff?.access_list?.map((list) => {
          const newObj = {
            label: list,
            value: list,
          };
          return newObj;
        });
        setAccessedRoutes(result);
      }
    } catch (err) {
      notifyError(err ? err?.response?.data?.message : err?.message);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setResData({});
      setValue("name");
      setValue("email");
      setValue("phone");
      setValue("role");
      setImageUrl("");
      setSelectedRoleIds([]);
      clearErrors("name");
      clearErrors("email");
      clearErrors("phone");
      clearErrors("role");
      setLanguage(lang);
      setValue("language", language);
      return;
    }
    if (id) {
      getStaffData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, setValue, isDrawerOpen, clearErrors]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const loadRoles = async () => {
      try {
        const isSuperAdmin = adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin";
        let res;
        if (isSuperAdmin) {
          res = await platformAPI.getRoles();
        } else {
          res = await RoleServices.getRoles();
        }
        
        const roleList = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
        setRoleOptions(roleList);

        if (id && resData?.role) {
          const roleIds = resolveRoleIds(resData.role, roleList);
          setSelectedRoleIds(roleIds);
          setValue("role", roleIds, { shouldDirty: true, shouldValidate: true });
        }
      } catch (error) {
        notifyError(error?.response?.data?.message || error?.message || "Unable to load roles");
      }
    };

    loadRoles();
  }, [isDrawerOpen]);

  useEffect(() => {
    if (location.pathname === "/edit-profile" && Cookies.get("adminInfo")) {
      getStaffData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, setValue]);

  return {
    register,
    handleSubmit,
    onSubmit,
    language,
    errors,
    adminInfo,
    setImageUrl,
    imageUrl,
    isSubmitting,
    isAddFormReady,
    isUpdateFormReady,
    accessedRoutes,
    setAccessedRoutes,
    roleOptions,
    selectedRoleOptions,
    handleSelectRole,
    handleRemoveRole,
    department,
    setDepartment,
    twoFactorEnabled,
    setTwoFactorEnabled,
  };
};

export default useStaffSubmit;
