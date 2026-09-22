import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input, Textarea } from "@windmill/react-ui";
import { FiSave } from "react-icons/fi";
import { notifyError, notifySuccess } from "@/utils/toast";
import userAPI from "@/services/api/userAPI";
import { AppDrawer, LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const CreateTeamDrawer = ({ isOpen, onClose, team = null, isSubmitting, onSubmit }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(team?.name || "");
  const [code, setCode] = useState(team?.code || "");
  const [description, setDescription] = useState(team?.description || "");
  const [department, setDepartment] = useState(team?.department || "");
  const [leader, setLeader] = useState(team?.leader || "");

  useEffect(() => {
    if (team) {
      setName(team.name || "");
      setCode(team.code || "");
      setDescription(team.description || "");
      setDepartment(team.department || "");
      setLeader(team.leader || "");
    } else {
      setName("");
      setCode("");
      setDescription("");
      setDepartment("");
      setLeader("");
    }
  }, [team]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      code: code.trim() || name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, ""),
      description: description.trim(),
      department: department.trim() || null,
      leader: leader || null,
    };

    if (team) {
      payload._id = team._id;
    }

    await onSubmit(payload);
  };

  const footer = (
    <div className="flex gap-4">
      <Button
        onClick={onClose}
        disabled={isSubmitting}
        className="h-12 bg-white w-full text-red-500 hover:bg-red-50 hover:border-red-100 hover:text-red-600 dark:bg-gray-700 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-red-700"
        layout="outline"
      >
        {t("CancelBtn")}
      </Button>
      {isSubmitting ? (
        <Button disabled className="text-sm w-full h-12">
          <LoadingSpinner alt="Loading" width={20} height={10} />
          <span className="font-serif ml-2 font-light">{t("Saving")}</span>
        </Button>
      ) : (
        <Button
          onClick={handleSubmit}
          className="text-sm bg-emerald-700 hover:bg-emerald-800 w-full h-12"
          icon={FiSave}
          disabled={!name.trim()}
        >
          {t(team ? "UpdateTeam" : "CreateTeam")}
        </Button>
      )}
    </div>
  );

  return (
    <AppDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={team ? t("EditTeam") : t("CreateTeam")}
      width="560px"
      footer={footer}
      className="z-50"
    >
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40 space-y-6">
          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("Name")} *
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("EnterTeamName")}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("Code")}
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("EnterCode")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("Description")}
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("EnterDescription")}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("Department")}
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={t("EnterDepartment")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
            <label className="col-span-4 sm:col-span-2 font-medium text-sm">
              {t("Leader")}
            </label>
            <div className="col-span-8 sm:col-span-4">
              <Input
                type="text"
                value={leader}
                onChange={(e) => setLeader(e.target.value)}
                placeholder={t("EnterLeader")}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      </form>
    </AppDrawer>
  );
};

export default CreateTeamDrawer;
