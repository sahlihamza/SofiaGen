import { Card, CardBody, Input, Pagination, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow, Badge, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";

import { useMemo, useState } from "react";
import { FiRefreshCw, FiEye, FiTrash2, FiArchive, FiPlus } from "react-icons/fi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import PlanServices from "@/services/PlanServices";
import PlanVersionServices from "@/services/PlanVersionServices";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useNotification from "@/hooks/useNotification";
import useGetCData from "@/hooks/useGetCData";
import { Button } from "@sofia/ui";

const sourceBadge = (source) => {
  const map = {
    create: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    update: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    clone: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    rollback: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    seeder: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return map[source] || map.update;
};

const PlanVersions = () => {
  const { t } = useTranslation();
  const { successMessage, errorMessage } = useNotification();
  const { hasPermission } = useGetCData();
  const queryClient = useQueryClient();

  const canRollback = hasPermission("platform", "update") || hasPermission("billing", "update");
  const canDelete = hasPermission("platform", "delete") || hasPermission("billing", "delete");
  const canCreate = hasPermission("platform", "create") || hasPermission("billing", "create");

  const [planId, setPlanId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [confirmRollback, setConfirmRollback] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createVersionNote, setCreateVersionNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const pageSize = 10;

  const { data: plansData } = useQuery({
    queryKey: ["plans-active-list"],
    queryFn: () => PlanServices.getActivePlans(),
    staleTime: 5 * 60 * 1000,
  });
  const plans = plansData?.data || [];

  const { data, isLoading, error } = useQuery({
    queryKey: ["plan-versions", planId, currentPage],
    queryFn: async () => {
      if (!planId) return { data: [], pagination: { total: 0, page: 1, limit: pageSize, pages: 0 } };
      return await PlanVersionServices.getPlanVersions(planId, {
        page: currentPage,
        limit: pageSize,
      });
    },
    enabled: !!planId,
  });

  const versions = data?.data || [];
  const pagination = data?.pagination || {};

  const selectedPlan = useMemo(
    () => plans.find((p) => p._id === planId) || null,
    [plans, planId]
  );

  const handleChangePage = (page) => {
    setCurrentPage(page);
    setSelectedVersion(null);
  };

  const handleReset = () => {
    setPlanId("");
    setCurrentPage(1);
    setSelectedVersion(null);
    setConfirmRollback(null);
  };

  const handleView = (version) => {
    setSelectedVersion(version);
    setConfirmRollback(null);
  };

  const handleRollback = async (version) => {
    if (!planId) return;
    try {
      await PlanVersionServices.rollbackPlanVersion(planId, version.version, {
        versionNote: `Rolled back to version ${version.version} by admin`,
      });
      successMessage(`Plan rolled back to version ${version.version}`);
      queryClient.invalidateQueries({ queryKey: ["plan-versions", planId] });
      queryClient.invalidateQueries({ queryKey: ["plans-active-list"] });
      setConfirmRollback(null);
      setSelectedVersion(null);
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Rollback failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await PlanVersionServices.deletePlanVersion(id);
      successMessage("Plan version deleted");
      queryClient.invalidateQueries({ queryKey: ["plan-versions", planId] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Delete failed");
    }
  };

  const handleCreateVersion = async () => {
    if (!planId) return;
    try {
      setIsCreating(true);
      await PlanVersionServices.createPlanVersion(planId, {
        versionNote: createVersionNote || undefined,
      });
      successMessage("Plan version created successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-versions", planId] });
      queryClient.invalidateQueries({ queryKey: ["plans-active-list"] });
      setIsCreateModalOpen(false);
      setCreateVersionNote("");
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to create plan version");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <PageTitle>Plan Versions</PageTitle>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCurrentPage(1);
              }}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={planId}
                  onChange={(e) => {
                    setPlanId(e.target.value);
                    setCurrentPage(1);
                    setSelectedVersion(null);
                    setConfirmRollback(null);
                  }}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a plan...</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (v{p.version || 1})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-grow-0">
                <div className="w-full mx-1">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    Load Versions
                  </Button>
                </div>
                <div className="w-full mx-1">
                  <Button layout="outline" onClick={handleReset} type="button" className="px-4 py-2 h-12 text-sm dark:bg-gray-700">
                    <span className="text-black dark:text-gray-200">Reset</span>
                  </Button>
                </div>
                {canCreate && planId && (
                  <div className="w-full mx-1">
                    <Button
                      className="h-12 w-full rounded-md whitespace-nowrap"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      <span className="mr-2 flex items-center"><FiPlus /></span>
                      Create Version
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <ModalBody className="custom-modal px-8 pt-6 pb-4">
          <h2 className="text-xl font-medium mb-4">Create Plan Version</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create a new snapshot version for <strong>{selectedPlan?.name}</strong>.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Version Note</label>
              <Input
                type="text"
                placeholder="e.g. Pricing update for Q4"
                value={createVersionNote}
                onChange={(e) => setCreateVersionNote(e.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="justify-between gap-2">
          <Button layout="outline" onClick={() => { setIsCreateModalOpen(false); setCreateVersionNote(""); }}>
            Cancel
          </Button>
          <Button onClick={handleCreateVersion} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Version"}
          </Button>
        </ModalFooter>
      </Modal>

      {selectedVersion && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Snapshot â€” v{selectedVersion.version}

                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${sourceBadge(selectedVersion.source)}`}>
                  {selectedVersion.source}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {canRollback && (
                  <Button
                    size="small"
                    className="bg-orange-600"
                    onClick={() => setConfirmRollback(selectedVersion)}
                  >
                    <FiRefreshCw className="mr-1" /> Rollback
                  </Button>
                )}
                <Button size="small" onClick={() => setSelectedVersion(null)}>
                  Close
                </Button>
              </div>
            </div>

            {confirmRollback && (
              <div className="mb-4 p-4 rounded border border-orange-300 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-700">
                <p className="text-sm mb-3">
                  Are you sure you want to rollback{" "}
                  <strong>{selectedPlan?.name}</strong> to version{" "}
                  <strong>{confirmRollback.version}</strong>? This will restore the
                  full plan snapshot (pricing, features, quotas).
                </p>
                <div className="flex gap-2">
                  <Button size="small" className="bg-red-600" onClick={() => handleRollback(confirmRollback)}>
                    Confirm Rollback
                  </Button>
                  <Button size="small" layout="outline" onClick={() => setConfirmRollback(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
                <p className="font-medium">{selectedVersion.snapshot?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <p className="font-medium">{selectedVersion.snapshot?.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                <p className="font-medium">
                  {selectedVersion.snapshot?.pricing?.monthly} {selectedVersion.snapshot?.pricing?.currency || "USD"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Yearly</p>
                <p className="font-medium">
                  {selectedVersion.snapshot?.pricing?.yearly} {selectedVersion.snapshot?.pricing?.currency || "USD"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Created by</p>
                <p className="font-medium">{selectedVersion.createdBy?.name || "â€”"}</p>

              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Created at</p>
                <p className="font-medium">
                  {dayjs(selectedVersion.createdAt).format("DD/MM/YYYY HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Feature count</p>
                <p className="font-medium">
                  {(selectedVersion.snapshot?.features
                    ? Object.keys(selectedVersion.snapshot.features).length
                    : 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Quota count</p>
                <p className="font-medium">
                  {(selectedVersion.snapshot?.limits
                    ? Object.keys(selectedVersion.snapshot.limits).length
                    : 0)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Change description</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {selectedVersion.changeDescription || "â€”"}

              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {isLoading ? (
        <TableLoading row={10} col={7} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error?.message || error}</span>
      ) : planId && versions?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>Version</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Change Description</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell className="text-right">Actions</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v._id}>
                  <TableCell>
                    <span className="text-sm font-bold">v{v.version}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${sourceBadge(v.source)}`}>
                      {v.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{v.changeDescription || "â€”"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{v.createdBy?.name || v.createdBy?.email || "â€”"}</span>

                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{dayjs(v.createdAt).format("DD/MM/YYYY HH:mm")}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="small" layout="outline" onClick={() => handleView(v)} title="View snapshot">
                        <FiEye />
                      </Button>
                      {canRollback && (
                        <Button
                          size="small"
                          className="bg-orange-600"
                          onClick={() => setConfirmRollback(v)}
                          title="Rollback"
                        >
                          <FiRefreshCw />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="small" className="bg-red-600" onClick={() => handleDelete(v._id)} title="Delete version">
                          <FiTrash2 />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TableFooter>
            <Pagination
              totalResults={pagination.total || 0}
              resultsPerPage={pageSize}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : planId ? (
        <NotFound title="No plan versions found for this plan." />
      ) : (
        <NotFound title="Select a plan to view its version history." />
      )}
    </>
  );
};

export default PlanVersions;

