import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody, ModalFooter, Input, Textarea } from "@windmill/react-ui";
import { FiSave, FiX } from "react-icons/fi";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const EditTeamModal = ({
  isOpen,
  onClose,
  team = null,
  isSubmitting,
  onSubmit,
}) => {
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

  const handleSubmit = async () => {
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

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? undefined : onClose} size="lg">
      <ModalBody className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {team ? t("EditTeam") : t("CreateTeam")}
          </h2>
          <Button
            onClick={isSubmitting ? undefined : onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={20} />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Name")} *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("EnterTeamName")}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Code")}
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("EnterCode")}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Description")}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("EnterDescription")}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Department")}
            </label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={t("EnterDepartment")}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Leader")}
            </label>
            <Input
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              placeholder={t("EnterLeader")}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="justify-end gap-2">
        <Button
          layout="outline"
          onClick={isSubmitting ? undefined : onClose}
          disabled={isSubmitting}
          className="w-28 justify-center text-sm"
        >
          {t("CancelBtn")}
        </Button>
        {isSubmitting ? (
          <Button disabled className="text-sm">
            <LoadingSpinner alt="Loading" width={20} height={10} />
            <span className="font-serif ml-2 font-light">{t("Saving")}</span>
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="w-28 justify-center bg-emerald-700 text-sm hover:bg-emerald-800"
            icon={FiSave}
            disabled={!name.trim()}
          >
            {t(team ? "UpdateTeam" : "CreateTeam")}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default EditTeamModal;
