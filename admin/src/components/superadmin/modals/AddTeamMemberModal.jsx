import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody, ModalFooter, Input } from "@windmill/react-ui";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FiSearch, FiX, FiUserCheck } from "react-icons/fi";
import userAPI from "@/services/api/userAPI";
import { Button } from "@sofia/ui";

const UserSearchSelect = ({ selected, onSelect }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["user-search-autocomplete", debouncedQuery],
    queryFn: () =>
      userAPI.getAllUsers({
        limit: 8,
        status: "Active",
        search: debouncedQuery || undefined,
      }),
    enabled: open,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const users = useMemo(
    () => (usersData?.data?.data || usersData?.data || []).filter((u) => u._id !== selected?._id),
    [usersData, selected]
  );

  useEffect(() => {
    setHighlightIndex(-1);
  }, [debouncedQuery, users.length]);

  const pick = (user) => {
    onSelect(user);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, users.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && highlightIndex >= 0 && users[highlightIndex]) {
      event.preventDefault();
      pick(users[highlightIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          value={selected ? "" : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("SearchUsersPlaceholder")}
          disabled={Boolean(selected)}
          autoComplete="off"
        />
        <FiSearch
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {selected && (
        <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 min-w-0">
            <FiUserCheck className="shrink-0 text-emerald-600 dark:text-emerald-400" size={16} />
            <span className="truncate">
              {selected.name || selected.email}{" "}
              <span className="text-gray-500 dark:text-gray-400">({selected.email})</span>
            </span>
          </span>
          <Button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 p-1 text-gray-400 hover:text-red-500"
            title={t("Remove")}
          >
            <FiX size={16} />
          </Button>
        </div>
      )}

      {open && !selected && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 z-50">
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t("Loading")}</p>
          ) : users.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t("NoUsersFound")}</p>
          ) : (
            users.map((user, index) => (
              <Button
                key={user._id}
                type="button"
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => pick(user)}
                className={`text-left px-4 py-2.5 text-sm ${
                  index === highlightIndex
                    ? "bg-emerald-50 dark:bg-emerald-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                }`}
              >
                <span className="block font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.name || user.email}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </span>
              </Button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const AddTeamMemberModal = ({ isOpen, onClose, onAdd, isSubmitting }) => {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!isOpen) setSelectedUser(null);
  }, [isOpen]);

  const handleSubmit = () => {
    if (selectedUser) {
      onAdd(selectedUser._id);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? undefined : onClose}>
      <ModalBody className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t("AddTeamMember")}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("SelectUser")}
            </label>
            <UserSearchSelect selected={selectedUser} onSelect={setSelectedUser} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-end gap-2">
          <Button layout="outline" onClick={onClose} disabled={isSubmitting} className="w-28 justify-center">
            {t("CancelBtn")}
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUser || isSubmitting} className="w-28 justify-center">
            {isSubmitting ? t("Adding") : t("Add")}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default AddTeamMemberModal;
