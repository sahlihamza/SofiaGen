import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Table, TableCell, TableContainer, TableHeader, TableBody, TableRow, Badge, Input, Select } from "@windmill/react-ui";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import FeatureFlagServices from "@/services/FeatureFlagServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import Modal from "@/components/modal/SimpleModal";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const FeatureFlags = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const canView = hasPermission("billing", "view");
  const canCreate = hasPermission("billing", "create");
  const canEdit = hasPermission("billing", "update");
  const canDelete = hasPermission("billing", "delete");

  const { data: flags, isLoading, error } = useQuery({
    queryKey: ["feature-flags", page, search],
    queryFn: () =>
      FeatureFlagServices.getAll({
        page,
        limit: 20,
        search,
      }),
  });

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "stable", // stable, beta, preview, deprecated
    enabled: false,
    rolloutPercentage: 0,
    startDate: "",
    endDate: "",
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      type: "stable",
      enabled: false,
      rolloutPercentage: 0,
      startDate: "",
      endDate: "",
    });
    setEditingId(null);
  };

  const handleEdit = (flag) => {
    setFormData({
      code: flag.code,
      name: flag.name,
      description: flag.description || "",
      type: flag.type,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      startDate: flag.startDate?.split("T")[0] || "",
      endDate: flag.endDate?.split("T")[0] || "",
    });
    setEditingId(flag._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.code || !formData.name) {
        errorMessage(t("Code and name are required"));
        return;
      }

      if (editingId) {
        await FeatureFlagServices.update(editingId, formData);
        successMessage(t("Feature flag updated"));
      } else {
        await FeatureFlagServices.create(formData);
        successMessage(t("Feature flag created"));
      }

      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      setShowForm(false);
      resetForm();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    try {
      await FeatureFlagServices.delete(id);
      successMessage(t("Deleted"));
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to delete");
    }
  };

  if (!canView) {
    return <PageTitle>{t("Access Denied")}</PageTitle>;
  }

  const getTypeBadge = (type) => {
    const colors = {
      stable: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      beta: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      preview: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      deprecated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (enabled) => (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${enabled ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}>
      {enabled ? "ON" : "OFF"}
    </span>
  );

  return (
    <AnimatedContent>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <PageTitle>{t("Feature Flags")}</PageTitle>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
              <FiPlus /> {t("New Feature Flag") || "New Flag"}
            </Button>
          )}
        </div>

        {/* Search */}
        <Card>
          <CardBody>
            <Input
              type="text"
              placeholder={t("Search by name or code") || "Search..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </CardBody>
        </Card>

        {/* Table */}
        <Card>
          <CardBody>
            {isLoading ? (
              <p className="text-center py-8 text-gray-500">{t("Loading") || "Loading..."}</p>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                {error.message}
              </div>
            ) : flags?.data && flags.data.length > 0 ? (
              <>
                <TableContainer className="mb-4">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell>{t("Code") || "Code"}</TableCell>
                        <TableCell>{t("Name") || "Name"}</TableCell>
                        <TableCell>{t("Type") || "Type"}</TableCell>
                        <TableCell>{t("Status") || "Status"}</TableCell>
                        <TableCell>{t("Rollout") || "Rollout"}</TableCell>
                        <TableCell>{t("Stores Enabled") || "Stores"}</TableCell>
                        <TableCell>{t("Actions") || "Actions"}</TableCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {flags.data.map((flag) => (
                        <TableRow key={flag._id}>
                          <TableCell>
                            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                              {flag.code}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{flag.name}</p>
                              {flag.description && (
                                <p className="text-xs text-gray-500">{flag.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(flag.type)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(flag.enabled)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${flag.rolloutPercentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {flag.rolloutPercentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {flag.enabledForStores?.length || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {canEdit && (
                                <IconButton
                                  icon="edit"
                                  onClick={() => handleEdit(flag)}
                                  aria-label="Edit"
                                  title={t("Edit") || "Edit"}
                                />
                              )}
                              {canDelete && (
                                <IconButton
                                  icon="trash"
                                  onClick={() => handleDelete(flag._id)}
                                  aria-label="Delete"
                                  title={t("Delete") || "Delete"}
                                />
                              )}
                            </div>
                          </TableCell>

                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <div className="flex justify-between items-center">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    {t("Previous") || "Previous"}
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t("Page") || "Page"} {page} / {flags.pagination.pages}
                  </span>
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= flags.pagination.pages}
                  >
                    {t("Next") || "Next"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-center py-12 text-gray-500">{t("No feature flags found") || "No flags found"}</p>
            )}
          </CardBody>
        </Card>

        {/* Form Modal */}
        {showForm && (
          <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editingId ? t("Edit Feature Flag") : t("Create Feature Flag")}>
            <div className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium mb-2">{t("Code")}</label>
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., ai-assistant"
                  disabled={!!editingId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("Name")}</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AI Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("Description")}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t("Type")}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="stable">Stable</option>
                    <option value="beta">Beta</option>
                    <option value="preview">Preview</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("Rollout %")}</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.rolloutPercentage}
                    onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t("Start Date")}</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("End Date")}</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="enabled" className="text-sm font-medium">
                  {t("Enable globally") || "Enable globally"}
                </label>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  layout="outline"
                >
                  {t("Cancel") || "Cancel"}
                </Button>
                <Button onClick={handleSave}>
                  {editingId ? t("Update") : t("Create")}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AnimatedContent>
  );
};

export default FeatureFlags;
