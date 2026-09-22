import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiX,
  FiUser,
  FiShield,
  FiShoppingBag,
  FiMonitor,
  FiActivity,
  FiClock,
  FiLock,
  FiFileText,
  FiBell,
  FiMail,
  FiPhone,
  FiCalendar,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiLogIn,
  FiLogOut,
  FiTrash2,
  FiBarChart2,
  FiUsers,
  FiEdit,
  FiKey,
  FiRefreshCw,
  FiDownload,
  FiCopy,
  FiUnlock,
  FiZap,
  FiArrowUpRight,
  FiExternalLink,
  FiSmartphone,
  FiGlobe,
  FiServer,
} from "react-icons/fi";
import { AppDrawer } from "@/components/ui";
import { IconButton, SecondaryButton, PrimaryButton, Button } from "@sofia/ui";

import platformAPI from "@/services/api/platformAPI";
import { notifySuccess, notifyError } from "@/utils/toast";
import useToggleDrawer from "@/hooks/useToggleDrawer";

const tabConfig = [
  { key: "overview", label: "Overview", icon: FiUser },
  { key: "roles", label: "Roles & Permissions", icon: FiShield },
  { key: "stores", label: "Stores", icon: FiShoppingBag },
  { key: "sessions", label: "Sessions", icon: FiMonitor },
  { key: "activity", label: "Activity", icon: FiActivity },
  { key: "loginHistory", label: "Login History", icon: FiClock },
  { key: "security", label: "Security", icon: FiLock },
];

const getIconForAction = (action) => {
  if (!action) return FiActivity;
  const a = action.toLowerCase();
  if (a.includes("login")) return FiLogIn;
  if (a.includes("logout")) return FiLogOut;
  if (a.includes("create") || a.includes("add")) return FiCheckCircle;
  if (a.includes("delete") || a.includes("remove")) return FiTrash2;
  if (a.includes("update") || a.includes("edit")) return FiEdit;
  if (a.includes("password") || a.includes("security")) return FiKey;
  if (a.includes("store")) return FiShoppingBag;
  return FiActivity;
};

const ProfileViewDrawer = ({ isOpen, onClose, staff, roleOptions = [] }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const { handleUpdate, handleModalOpen } = useToggleDrawer();

  if (!staff) return null;

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["userSessions", staff._id],
    queryFn: () => platformAPI.getUserSessions(staff._id),
    enabled: !!isOpen && !!staff._id,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["userLoginHistory", staff._id],
    queryFn: () => platformAPI.getUserLoginHistory(staff._id, { limit: 20 }),
    enabled: !!isOpen && !!staff._id,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["userActivity", staff._id],
    queryFn: () => platformAPI.getUserActivity(staff._id, { limit: 20 }),
    enabled: !!isOpen && !!staff._id && activeTab === "activity",
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ["userPermissions", staff._id],
    queryFn: () => platformAPI.getUserPermissions(staff._id),
    enabled: !!isOpen && !!staff._id && activeTab === "roles",
  });

  const sessions = sessionsData?.data || [];
  const historyEntries = historyData?.data?.data || historyData?.data || [];
  const activities = activityData?.data?.data || activityData?.data || [];
  const permissionsList = permissionsData?.data?.data || permissionsData?.data || [];

  const handleDisconnect = async (sessionId) => {
    try {
      await platformAPI.logoutDevice(staff._id, sessionId);
      qc.invalidateQueries(["userSessions", staff._id]);
      notifySuccess(t("SessionRevoked") || "Session disconnected");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleDisconnectAll = async () => {
    try {
      await platformAPI.revokeAllSessions(staff._id);
      qc.invalidateQueries(["userSessions", staff._id]);
      notifySuccess(t("AllSessionsRevoked") || "All sessions disconnected");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleAction = async (actionType) => {
    try {
      if (actionType === "edit") {
        onClose();
        handleUpdate(staff._id);
      } else if (actionType === "delete") {
        onClose();
        handleModalOpen(staff._id, staff.name);
      } else if (actionType === "reset2fa") {
        await platformAPI.reset2FA(staff._id);
        notifySuccess("2FA has been reset successfully.");
      } else if (actionType === "password") {
        await platformAPI.sendSetupEmail(staff._id);
        notifySuccess("Password reset email sent.");
      } else if (actionType === "export") {
        await platformAPI.bulkExport({ ids: [staff._id] });
        notifySuccess("Export initiated.");
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/20",
      Blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-600/20",
      Suspended: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/20",
      Inactive: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 ring-1 ring-gray-600/20",
      Pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-600/20",
      Invited: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 ring-1 ring-sky-600/20",
      Archived: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-600/20",
    };
    return map[status] || map.Inactive;
  };

  const getRoleColor = (index) => {
    const colors = [
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    ];
    return colors[index % colors.length];
  };

  const initials = useMemo(() => {
    return staff?.name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  }, [staff?.name]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-3">
            <InfoRow label={t("StaffDetailsEmail")} value={staff?.email} icon={FiMail} />
            <InfoRow label={t("StaffDetailsPhone")} value={staff?.phone} icon={FiPhone} />
            <InfoRow label={t("StaffDetailsJoiningDate")} value={staff?.joiningData ? new Date(staff.joiningData).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : ""} icon={FiCalendar} />
            <InfoRow label={t("StaffDetailsAddress")} value={staff?.address || ""} icon={FiMapPin} />
            <InfoRow label={t("StaffDetailsGender")} value={staff?.gender || ""} icon={FiUser} />
            <InfoRow label={t("StaffDetailsStatus")} value={staff?.status || ""} icon={FiAlertTriangle} />
            <InfoRow label={t("StaffCreatedAt")} value={staff?.createdAt ? new Date(staff.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : ""} icon={FiCalendar} />
            <InfoRow label={t("StaffLastLogin")} value={staff?.lastLogin ? new Date(staff.lastLogin).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""} icon={FiLogIn} />
            <InfoRow label={t("StaffLastActivity")} value={staff?.lastActivity ? new Date(staff.lastActivity).toLocaleDateString("fr-FR") : ""} icon={FiActivity} />
            <InfoRow label={t("StaffCreatedBy")} value={typeof staff?.createdBy === "object" ? staff.createdBy?.name : staff?.createdBy || ""} icon={FiUser} />
            <InfoRow label={t("StaffDepartment")} value={staff?.department || ""} icon={FiUsers} />
            <InfoRow label={t("Staff2FA")} value={staff?.twoFactorEnabled ? "Enabled" : "Disabled"} icon={FiLock} />
          </div>
        );

      case "roles":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Assigned Roles</h4>
              <div className="space-y-2">
                {(staff?.role || []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{typeof r === "object" ? r?.name : r}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(i)}`}>
                      {typeof r === "object" ? r?.slug : "role"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {(staff?.roles || []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Role Assignments</h4>
                <div className="space-y-2">
                  {staff.roles.map((r, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <FiShield className="text-gray-400" size={16} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{r.roleId?.name || r.roleId}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        Store: {r.storeId?.name || r.storeId || "All"} " {new Date(r.assignedAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {permissionsLoading ? (
              <div className="space-y-2 mt-4">
                 <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
                 <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Permissions</h4>
                {Array.isArray(permissionsList) && permissionsList.length > 0 ? (
                  permissionsList.map((group, idx) => (
                    group.module || group.label ? (
                      <PermissionGroup key={idx} label={group.module || group.label || "General"} permissions={group.permissions || []} />
                    ) : null
                  ))
                ) : !Array.isArray(permissionsList) && Object.keys(permissionsList || {}).length > 0 ? (
                  Object.entries(permissionsList).map(([key, perms], idx) => (
                    <PermissionGroup key={idx} label={key} permissions={Array.isArray(perms) ? perms : []} />
                  ))
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <FiShield className="mx-auto text-gray-300 mb-2" size={24} />
                    <p className="text-sm text-gray-400">No specific permissions found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "stores":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Stores Managed</h4>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {staff?.storesManaged?.length || 0}
              </span>
            </div>
            {(staff?.storesManaged || []).map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                <span className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <FiShoppingBag size={14} />
                  </span>
                  {typeof s === "object" ? s?.name : s}
                </span>
                <FiArrowUpRight className="text-gray-300 hover:text-emerald-600 cursor-pointer" size={16} />
              </div>
            ))}
            {(!staff?.storesManaged || staff.storesManaged.length === 0) && (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <FiShoppingBag className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-400">No stores managed</p>
              </div>
            )}
          </div>
        );

      case "sessions":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active Sessions</h4>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {sessions.length}
              </span>
            </div>
            {sessionsLoading && (
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
                ))}
              </div>
            )}
            {!sessionsLoading && sessions.length === 0 && (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <FiMonitor className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-400">No active sessions</p>
              </div>
            )}
            <div className="space-y-2.5">
              {sessions.map((session) => {
                const userAgent = session.userAgent || session.deviceName || "Unknown Device";
                const browser = session.browser || extractBrowser(userAgent);
                const os = session.os || extractOS(userAgent);
                const location = [session.city, session.country].filter(Boolean).join(", ") || "Unknown";
                const lastActivity = session.lastActivity ? new Date(session.lastActivity).toLocaleString("fr-FR") : "";

                return (
                  <div key={session.sessionId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3.5 border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                        {os.includes("iOS") || os.includes("Android") ? <FiSmartphone size={20} /> : <FiMonitor size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{browser}</p>
                        <p className="text-xs text-gray-400">{os} " {location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">{lastActivity}</p>
                      </div>
                      <SecondaryButton
                        onClick={() => handleDisconnect(session.sessionId)}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Disconnect
                      </SecondaryButton>
                    </div>
                  </div>
                );
              })}
            </div>
            {sessions.length > 1 && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <SecondaryButton
                  onClick={handleDisconnectAll}
                  className="w-full px-4 py-2.5 text-xs font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Disconnect All Sessions
                </SecondaryButton>
              </div>
            )}
          </div>
        );

      case "activity":
        return (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent Activity</h4>
            {activityLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
                ))}
              </div>
            )}
            {!activityLoading && activities.length === 0 && (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <FiActivity className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-400">No recent activity</p>
              </div>
            )}
            {!activityLoading && activities.map((act, idx) => (
              <ActivityRow 
                key={act._id || idx} 
                icon={getIconForAction(act.action)} 
                action={act.action || act.description || "Performed an action"} 
                time={act.createdAt ? new Date(act.createdAt).toLocaleString("fr-FR") : "Unknown"} 
              />
            ))}
          </div>
        );

      case "loginHistory":
        return (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Login History</h4>
            {historyLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
                ))}
              </div>
            )}
            {!historyLoading && historyEntries.length === 0 && (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <FiClock className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-400">No login history</p>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">IP</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Browser</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">OS</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Location</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map((entry, idx) => (
                    <tr key={entry._id || idx} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-3 text-sm">
                        {entry.status === "success" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                            <FiCheckCircle size={14} /> Success
                          </span>
                        ) : entry.status === "failed" ? (
                          <span className="inline-flex items-center gap-1.5 text-red-600 font-medium text-xs">
                            <FiXCircle size={14} /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                            <FiAlertTriangle size={14} /> {entry.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 font-mono text-xs">{entry.ipAddress || "-"}</td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{entry.browser || "-"}</td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{entry.os || "-"}</td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{[entry.city, entry.country].filter(Boolean).join(", ") || "-"}</td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                        {entry.loginAt ? new Date(entry.loginAt).toLocaleString("fr-FR") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">2FA Status</p>
                <p className={`text-sm font-semibold ${staff?.twoFactorEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {staff?.twoFactorEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Failed Logins</p>
                <p className={`text-sm font-semibold ${(staff?.failedLoginAttempts || 0) > 3 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"}`}>
                  {staff?.failedLoginAttempts || 0}
                </p>
              </div>
            </div>
            <div className="space-y-0">
              <SecurityRow label="Password Updated" value={staff?.lastPasswordChange ? new Date(staff.lastPasswordChange).toLocaleDateString("fr-FR") : "Never"} status="info" />
              <SecurityRow label="Account Locked" value={staff?.lockedUntil && new Date(staff.lockedUntil) > new Date() ? "Yes" : "No"} status={staff?.lockedUntil && new Date(staff.lockedUntil) > new Date() ? "danger" : "success"} />
              <SecurityRow label="Trusted Devices" value={sessions.length.toString()} status="info" />
              <SecurityRow label="Active Sessions" value={sessions.length} status="info" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const footer = (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400">
        Last updated: {new Date().toLocaleDateString("fr-FR")}
      </p>
      <div className="flex items-center gap-2">
        <SecondaryButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Close
        </SecondaryButton>
        <PrimaryButton size="sm" onClick={() => handleAction("edit")} className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors">
          Edit Profile
        </PrimaryButton>
      </div>
    </div>
  );

  return (
    <AppDrawer
      isOpen={isOpen}
      onClose={onClose}
      placement="right"
      width="min(900px, 90vw)"
      hideCloseButton
      footer={footer}
      bodyClassName="flex flex-col h-full bg-white dark:bg-gray-800 shadow-2xl p-0"
    >
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 pt-6 pb-20 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-teal-300/20 blur-2xl" />
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all duration-200 backdrop-blur-sm border border-white/10"
        >
          <FiX size={18} />
        </IconButton>
          <div className="relative flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-lg">
                {staff?.image ? (
                  <img src={staff.image} alt={staff?.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white tracking-wide">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold truncate">{staff?.name}</h2>
              <p className="text-sm text-white/80 truncate mt-0.5">{staff?.email}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(staff?.status)}`}>
                  {staff?.status || ""}
                </span>
                {staff?.isSuperAdmin && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm border border-white/20">
                    Super Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 -mt-8 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-gray-700 p-2 flex items-center gap-1">
            <ActionButton icon={FiEdit} label="Edit" onClick={() => handleAction("edit")} />
            <ActionButton icon={FiKey} label="Password" onClick={() => handleAction("password")} />
            <ActionButton icon={FiRefreshCw} label="Reset 2FA" onClick={() => handleAction("reset2fa")} />
            <ActionButton icon={FiDownload} label="Export" onClick={() => handleAction("export")} />
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            <SecondaryButton variant="ghost" size="sm" onClick={() => handleAction("delete")} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
              <FiTrash2 size={14} />
              <span className="hidden sm:inline">Delete</span>
            </SecondaryButton>
          </div>
        </div>

        <div className="px-6 pt-4 pb-2 bg-white dark:bg-gray-800">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
            {tabConfig.map((tab) => (
              <SecondaryButton
                key={tab.key}
                variant={activeTab === tab.key ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-lg transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <tab.icon size={14} />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.label.split(" ")[0]}</span>
              </SecondaryButton>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6 py-4">
          <Scrollbars className="w-full h-full pr-1">
            {renderTabContent()}
          </Scrollbars>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Last updated: {new Date().toLocaleDateString("fr-FR")}
            </p>
            <div className="flex items-center gap-2">
              <SecondaryButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </SecondaryButton>
              <PrimaryButton size="sm" onClick={() => handleAction("edit")} className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors">
                Edit Profile
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </AppDrawer>
  );
};

function extractBrowser(userAgent) {
  if (!userAgent) return "Unknown";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edge")) return "Edge";
  return "Unknown";
}

function extractOS(userAgent) {
  if (!userAgent) return "Unknown";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac OS")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("iOS")) return "iOS";
  if (userAgent.includes("Android")) return "Android";
  return "Unknown";
}

const ActionButton = ({ icon: Icon, label, onClick }) => (
  <SecondaryButton
    variant="ghost"
    size="sm"
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
  >
    <Icon size={14} />
    <span className="hidden sm:inline">{label}</span>
  </SecondaryButton>
);

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-150 group">
    {Icon && (
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
        <Icon size={14} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200 break-all font-medium">{value || ""}</span>
    </div>
  </div>
);

const PermissionGroup = ({ label, permissions }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
    <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
      {label}
    </div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {permissions.map((p, i) => {
        const name = typeof p === "string" ? p : p.name || p.action || "Unknown";
        const granted = typeof p === "string" ? true : p.granted !== false;
        return (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
            {granted ? (
              <FiCheckCircle className="text-emerald-500" size={16} />
            ) : (
              <FiXCircle className="text-gray-400" size={16} />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const ActivityRow = ({ icon: Icon, action, time }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 group hover:bg-gray-50 dark:hover:bg-gray-700/30 -mx-2 px-2 rounded-lg transition-colors">
    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
      <Icon className="text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{action}</p>
    </div>
    <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
  </div>
);

const SecurityRow = ({ label, value, status }) => {
  const statusColors = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${statusColors[status] || ""}`}>{value}</span>
    </div>
  );
};

const AuditRow = ({ action, by, date }) => (
  <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 -mx-2 px-2 rounded-lg transition-colors">
    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
      <FiFileText className="text-gray-400" size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{action}</p>
      <p className="text-xs text-gray-400">by {by}</p>
    </div>
    <span className="text-xs text-gray-400 flex-shrink-0">{date}</span>
  </div>
);

const NotifRow = ({ type, msg, unread }) => (
  <div className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${unread ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50" : "bg-gray-50 dark:bg-gray-700/30 border border-transparent"}`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${unread ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-gray-200 dark:bg-gray-700 text-gray-400"}`}>
      <FiBell size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{msg}</p>
      <p className="text-xs text-gray-400">{type}</p>
    </div>
    {unread && <span className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0 ring-2 ring-blue-100" />}
  </div>
);

export default ProfileViewDrawer;
