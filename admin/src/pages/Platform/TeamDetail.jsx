import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Input, Badge } from "@windmill/react-ui";
import {
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiUsers,
  FiCalendar,
  FiShield,
  FiRefreshCw,
  FiCopy,
} from "react-icons/fi";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import userAPI from "@/services/api/userAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import CreateTeamDrawer from "@/components/drawer/CreateTeamDrawer";
import AddTeamMemberModal from "@/components/superadmin/modals/AddTeamMemberModal";
import ConfirmActionModal from "@/components/superadmin/modals/ConfirmActionModal";
import { CButton, IconButton } from "@/components/ui";

const TeamDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const { data: teamData, isLoading, error, refetch } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      return await userAPI.getTeamById(id);
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  const team = teamData?.data || teamData;

  const stats = useMemo(() => {
    if (!team) return { members: 0 };
    return {
      members: team.membersCount ?? team.memberCount ?? team.members?.length ?? 0,
    };
  }, [team]);

  const handleArchive = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.archiveTeam(team._id);
      notifySuccess(t("TeamArchivedSuccess") || t("TeamDeletedSuccess"));
      refetch();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!team.code || !navigator.clipboard) return;
    await navigator.clipboard.writeText(team.code);
    notifySuccess(t("TeamCodeCopied") || "Team code copied");
  };

  const handleRemoveMember = (member) => {
    setMemberToRemove(member);
  };

  const handleConfirmRemoveMember = async () => {
    const member = memberToRemove;
    if (!member) return;
    const user = member.userId || {};
    const userId = user._id || member.userId;
    if (!userId) {
      setMemberToRemove(null);
      return;
    }

    try {
      setIsSubmitting(true);
      await userAPI.removeTeamMember(team._id, userId);
      notifySuccess(t("MemberRemovedSuccess") || "Member removed successfully");
      setMemberToRemove(null);
      await refetch();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      setIsSubmitting(true);
      await userAPI.addTeamMember(team._id, userId);
      notifySuccess(t("MemberAddedSuccess") || "Membre ajoutÃ© avec succÃ¨s");
      setIsAddMemberOpen(false);
      await refetch();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
  };

  const handleDrawerSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      if (payload._id) {
        await userAPI.updateTeam(payload._id, payload);
        notifySuccess(t("TeamUpdatedSuccess"));
      } else {
        await userAPI.createTeam(payload);
        notifySuccess(t("TeamCreatedSuccess"));
      }
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      setIsDrawerOpen(false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full">
        <PageTitle>{t("Teams")}</PageTitle>
        <TableLoading row={5} col={4} />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="mx-auto w-full">
        <div className="mb-4">
          <Link
            to="/platform/teams"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiArrowLeft className="mr-2" size={16} />
            {t("BackToTeams") || "Back to Teams"}
          </Link>
        </div>
        <NotFound
          title={t("TeamNotFound") || "Team not found"}
          text={error?.response?.data?.message || error?.message || ""}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <div className="mb-4">
        <Link
          to="/platform/teams"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiArrowLeft className="mr-2" size={16} />
          {t("BackToTeams") || "Back to Teams"}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <PageTitle>{team.name}</PageTitle>
        <div className="flex items-center gap-2">
          <IconButton
            icon="refresh"
            variant="outline"
            aria-label={t("Refresh") || "Refresh"}
            onClick={() => refetch()}
          />
          <IconButton
            icon="copy"
            variant="outline"
            aria-label={t("CopyCode") || "Copy code"}
            disabled={!team.code}
            onClick={handleCopyCode}
          />
          <CButton onClick={handleEdit} variant="outline" icon="edit" size="sm">
            {t("Edit")}
          </CButton>
          <CButton onClick={handleArchive} variant="danger" icon="trash" size="sm">
            {t("Archive") || t("Delete")}
          </CButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Members")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.members}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <FiShield size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Status")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">{team.status || "Active"}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
              <FiCalendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("CreatedAt")}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : "â€”"}

              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Details */}
      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("TeamDetails") || "Team Details"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Name")}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{team.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Code") || "Code"}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{team.code || "â€”"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Department")}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{team.department || "â€”"}</p>

            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Leader")}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {typeof team.leader === "object" ? team.leader?.name || team.leader?.email || "â€”" : team.leader || "â€”"}

              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Description")}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{team.description || "â€”"}</p>

            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("Members") || "Members"}
            </h3>
            <CButton size="sm" icon="plus" onClick={() => setIsAddMemberOpen(true)}>
              {t("AddMember") || "Ajouter"}
            </CButton>
          </div>
          {team.members?.length ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {team.members.map((member) => {
                const user = member.userId || {};
                return (
                  <div key={member._id || user._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <FiUser size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.name || user.email || "â€”"}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email || "â€”"}

                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                        {user.userType || member.status || "â€”"}

                      </span>
                      <CButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {t("Remove") || "Remove"}
                      </CButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("NoMembers") || "No members in this team."}
            </p>
          )}
        </CardBody>
      </Card>

      <CreateTeamDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        isSubmitting={isSubmitting}
        onSubmit={handleDrawerSubmit}
        team={team}
      />

      <AddTeamMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onAdd={handleAddMember}
        isSubmitting={isSubmitting}
      />

      <ConfirmActionModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        action="remove_member"
        user={
          memberToRemove
            ? {
                name: memberToRemove.userId?.name || memberToRemove.userId?.email,
                email: memberToRemove.userId?.email,
              }
            : null
        }
        isSubmitting={isSubmitting}
        onConfirm={() => handleConfirmRemoveMember()}
      />
    </div>
  );
};

export default TeamDetail;
