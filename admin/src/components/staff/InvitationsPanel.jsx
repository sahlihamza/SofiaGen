import React, { useEffect, useState } from "react";
import { Select, Table, TableCell, TableContainer, TableHeader } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { FiMail, FiRefreshCw, FiXCircle, FiPlus } from "react-icons/fi";

import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import StoreServices from "@/services/StoreServices";
import { useStoreContext } from "@/context/StoreContext";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

// Store-scoped invitations: a real pending -> email -> accept flow, distinct
// from the "add staff" form on the Members tab (which activates the account
// immediately with a generated password). This is for inviting someone who
// doesn't have an account yet, or should confirm their own password.
const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  accepted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  revoked: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

const InvitationsPanel = ({ roleOptions }) => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetchInvitations = async () => {
    if (!currentStoreId) return;
    setLoading(true);
    try {
      const res = await StoreServices.getStoreInvitations(currentStoreId);
      setInvitations(res?.invitations || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email || !roleId) return;
    setSubmitting(true);
    try {
      await StoreServices.createStoreInvitation(currentStoreId, { email, roleId });
      notifySuccess(t("InvitationSent", "Invitation sent"));
      setEmail("");
      setRoleId("");
      setShowForm(false);
      fetchInvitations();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (id) => {
    setBusyId(id);
    try {
      await StoreServices.resendStoreInvitation(currentStoreId, id);
      notifySuccess(t("InvitationResent", "Invitation resent"));
      fetchInvitations();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (id) => {
    setBusyId(id);
    try {
      await StoreServices.revokeStoreInvitation(currentStoreId, id);
      notifySuccess(t("InvitationRevoked", "Invitation revoked"));
      fetchInvitations();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("InvitationsDesc", "Invite someone who doesn't have an account yet â€” they'll set their own password.")}
        </p>
        <Button onClick={() => setShowForm((v) => !v)} className="h-10 px-4 text-sm font-medium bg-emerald-600 hover:bg-emerald-700">
          <FiPlus size={14} /> {t("InviteMember", "Invite a member")}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleInvite}
          className="mb-5 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 p-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-grow min-w-[220px]">
            <LabelArea label={t("Email", "Email")} />
            <InputArea
              required={true}
              label="Email"
              name="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="w-48">
            <LabelArea label={t("StaffRole", "Role")} />
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="h-12">
              <option value="">{t("SelectRole", "Select a role")}</option>
              {(roleOptions || []).map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </div>
          <Button disabled={submitting || !email || !roleId} type="submit" className="h-12 px-5 bg-emerald-600 hover:bg-emerald-700">
            {submitting ? t("Loading", "Sending...") : t("SendInvitation", "Send invitation")}
          </Button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">{t("Loading", "Loading...")}</p>
      ) : invitations.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm py-12 text-center">
          <FiMail className="mx-auto mb-2 text-gray-300" size={28} />
          <p className="text-sm text-gray-400">{t("NoInvitations", "No invitations yet")}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
          <TableContainer className="min-w-full">
            <Table>
              <TableHeader>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50">
                  <TableCell>{t("Email", "Email")}</TableCell>
                  <TableCell>{t("StaffRole", "Role")}</TableCell>
                  <TableCell>{t("FilterStatus", "Status")}</TableCell>
                  <TableCell>{t("StaffCreatedAtTbl", "Invited")}</TableCell>
                  <TableCell className="text-right">{t("StaffActionsTbl", "Actions")}</TableCell>
                </tr>
              </TableHeader>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv._id} className="border-b border-gray-50 dark:border-gray-700/40">
                    <TableCell className="text-sm">{inv.email}</TableCell>
                    <TableCell className="text-sm">
                      {Array.isArray(inv.roleIds) && inv.roleIds[0]?.name ? inv.roleIds[0].name : "â€”"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "â€”"}
                    </TableCell>
                    <TableCell className="text-right">
                      {(inv.status === "pending" || inv.status === "expired") && (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            disabled={busyId === inv._id}
                            onClick={() => handleResend(inv._id)}
                            title={t("Resend", "Resend")}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-emerald-600 hover:border-emerald-300"
                          >
                            <FiRefreshCw size={14} />
                          </Button>
                          <Button
                            type="button"
                            disabled={busyId === inv._id}
                            onClick={() => handleRevoke(inv._id)}
                            title={t("Revoke", "Revoke")}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-600 hover:border-red-300"
                          >
                            <FiXCircle size={14} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      )}
    </div>
  );
};

export default InvitationsPanel;
