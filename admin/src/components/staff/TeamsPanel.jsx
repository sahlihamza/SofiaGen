import React, { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { FiUsers, FiPlus, FiTrash2, FiX } from "react-icons/fi";

import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import StoreServices from "@/services/StoreServices";
import { useStoreContext } from "@/context/StoreContext";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

// Teams are a business grouping of staff members (Sales, Support...) â€” a
// user can belong to several â€” separate from RBAC (which role/permissions
// they hold), matching the ticket's "Teams are not a second RBAC" rule.
const TeamsPanel = ({ staffOptions }) => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchTeams = async () => {
    if (!currentStoreId) return;
    setLoading(true);
    try {
      const res = await StoreServices.getStoreTeams(currentStoreId);
      setTeams(res?.teams || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await StoreServices.createStoreTeam(currentStoreId, { name, description });
      notifySuccess(t("TeamCreated", "Team created"));
      setName("");
      setDescription("");
      setShowForm(false);
      fetchTeams();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (teamId) => {
    setBusy(true);
    try {
      await StoreServices.deleteStoreTeam(currentStoreId, teamId);
      notifySuccess(t("TeamDeleted", "Team deleted"));
      fetchTeams();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async (teamId) => {
    if (!memberToAdd) return;
    setBusy(true);
    try {
      await StoreServices.addStoreTeamMember(currentStoreId, teamId, memberToAdd);
      notifySuccess(t("MemberAdded", "Member added"));
      setMemberToAdd("");
      fetchTeams();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    setBusy(true);
    try {
      await StoreServices.removeStoreTeamMember(currentStoreId, teamId, userId);
      notifySuccess(t("MemberRemoved", "Member removed"));
      fetchTeams();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("TeamsDesc", "Organize staff into business groups â€” Sales, Support, Logistics...")}
        </p>
        <Button onClick={() => setShowForm((v) => !v)} className="h-10 px-4 text-sm font-medium bg-emerald-600 hover:bg-emerald-700">
          <FiPlus size={14} /> {t("CreateTeam", "Create a team")}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-5 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 p-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-grow min-w-[180px]">
            <LabelArea label={t("TeamName", "Team name")} />
            <InputArea required={true} label="Name" name="team-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sales" />
          </div>
          <div className="flex-grow min-w-[220px]">
            <LabelArea label={t("Description", "Description")} />
            <InputArea label="Description" name="team-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("Optional", "Optional")} />
          </div>
          <Button disabled={submitting || !name.trim()} type="submit" className="h-12 px-5 bg-emerald-600 hover:bg-emerald-700">
            {submitting ? t("Loading", "Creating...") : t("CreateTeam", "Create a team")}
          </Button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">{t("Loading", "Loading...")}</p>
      ) : teams.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm py-12 text-center">
          <FiUsers className="mx-auto mb-2 text-gray-300" size={28} />
          <p className="text-sm text-gray-400">{t("NoTeams", "No teams yet")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div key={team._id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{team.name}</p>
                  {team.description && <p className="text-xs text-gray-400 mt-0.5">{team.description}</p>}
                </div>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(team._id)}
                  title={t("Delete", "Delete")}
                  className="text-gray-400 hover:text-red-500"
                >
                  <FiTrash2 size={16} />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(team.members || []).map((member) => (
                  <span
                    key={member._id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 pl-3 pr-1.5 py-1 text-xs"
                  >
                    {member.name || member.email}
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRemoveMember(team._id, member._id)}
                      className="w-4 h-4 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"
                    >
                      <FiX size={11} />
                    </Button>
                  </span>
                ))}
                {(!team.members || team.members.length === 0) && (
                  <span className="text-xs text-gray-400">{t("NoMembersYet", "No members yet")}</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <select
                  value={expandedId === team._id ? memberToAdd : ""}
                  onChange={(e) => {
                    setExpandedId(team._id);
                    setMemberToAdd(e.target.value);
                  }}
                  className="flex-grow h-9 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2"
                >
                  <option value="">{t("AddMember", "Add a member...")}</option>
                  {(staffOptions || [])
                    .filter((s) => !(team.members || []).some((m) => m._id === s._id))
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name || s.email}
                      </option>
                    ))}
                </select>
                <Button
                  disabled={busy || expandedId !== team._id || !memberToAdd}
                  onClick={() => handleAddMember(team._id)}
                  className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  {t("Add", "Add")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsPanel;
