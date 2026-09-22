import { Card, CardBody, Input, Pagination, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus, FiCopy, FiZap } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { SidebarContext } from "@/context/SidebarContext";
import PlanTemplateServices from "@/services/PlanTemplateServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import PlanTemplateDrawer from "@/components/drawer/PlanTemplateDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ActionMenu from "@/components/table/ActionMenu";
import formatMoney from "@/utils/formatMoney";
import { Button } from "@sofia/ui";

const statusBadge = (status) => {
  const map = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.active;
};

const PlanTemplates = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { serviceId, setServiceId } = useToggleDrawer();

  const canCreate = hasPermission("billing", "create") || hasPermission("platform", "create");
  const canUpdate = hasPermission("billing", "update");
  const canDelete = hasPermission("billing", "delete");

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [instantiateId, setInstantiateId] = useState(null);
  const [instantiateName, setInstantiateName] = useState("");
  const [instantiateSlug, setInstantiateSlug] = useState("");
  const [isInstantiating, setIsInstantiating] = useState(false);

  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["plan-templates", currentPage, searchText, statusFilter],
    queryFn: async () => {
      return await PlanTemplateServices.getPlanTemplates({
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status: statusFilter,
      });
    },
  });

  const templates = data?.data || [];
  const pagination = data?.pagination || {};

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const handleChangePage = (page) => setCurrentPage(page);

  const handleDelete = async (id) => {
    try {
      await PlanTemplateServices.deletePlanTemplate(id);
      successMessage("Plan template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-templates"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to delete plan template");
    }
  };

  const handleUpdate = (id) => {
    setServiceId(id);
    toggleDrawer();
  };

  const handleClone = async (id) => {
    try {
      await PlanTemplateServices.clonePlanTemplate(id);
      successMessage("Plan template cloned successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-templates"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to clone plan template");
    }
  };

  const handleInstantiate = async (template) => {
    setInstantiateId(template._id);
    setInstantiateName(`${template.name} Plan`);
    setInstantiateSlug(template.slug);
  };

  const submitInstantiate = async (e) => {
    e.preventDefault();
    if (!instantiateId) return;
    try {
      setIsInstantiating(true);
      await PlanTemplateServices.instantiatePlanTemplate(instantiateId, {
        name: instantiateName,
        slug: instantiateSlug,
      });
      successMessage("Plan instantiated from template successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-templates"] });
      queryClient.invalidateQueries({ queryKey: ["plans-active-list"] });
      setInstantiateId(null);
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to instantiate plan");
    } finally {
      setIsInstantiating(false);
    }
  };

  return (
    <>
      <PageTitle>{t("PlanTemplatesPageTitle") || "Plan Templates"}</PageTitle>

      <MainDrawer>
        <PlanTemplateDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); }}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("SearchPlanTemplate") || "Search by name or slug"}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatus") || "All Status"}</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-grow-0">
                <div className="w-full mx-1">
                  <Button layout="outline" onClick={handleReset} type="button" className="px-4 py-2 h-12 text-sm dark:bg-gray-700">
                    <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                  </Button>
                </div>
                {canCreate && (
                  <div className="w-full mx-1">
                    <Button onClick={() => { setServiceId(undefined); toggleDrawer(); }} className="h-12 w-full rounded-md whitespace-nowrap">
                      <span className="mr-2 flex items-center"><FiPlus /></span>
                      {t("AddPlanTemplate") || "Add Plan Template"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {/* Instantiate modal */}
      {instantiateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
            <h3 className="text-lg font-semibold mb-4">{t("InstantiatePlan") || "Instantiate Plan from Template"}</h3>
            <form onSubmit={submitInstantiate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan Name</label>
                <input
                  type="text"
                  value={instantiateName}
                  onChange={(e) => setInstantiateName(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plan Slug</label>
                <input
                  type="text"
                  value={instantiateSlug}
                  onChange={(e) => setInstantiateSlug(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button layout="outline" type="button" onClick={() => setInstantiateId(null)}>
                  {t("Cancel") || "Cancel"}
                </Button>
                <Button type="submit" disabled={isInstantiating} className="flex items-center gap-1">
                  <FiZap /> {isInstantiating ? t("Instantiating") || "Instantiating..." : t("Instantiate") || "Instantiate"}
                </Button>

              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <TableLoading row={12} col={7} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error?.message || error}</span>
      ) : templates?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>{t("Template")}</TableCell>
                <TableCell>{t("Slug")}</TableCell>
                <TableCell>{t("Monthly")}</TableCell>
                <TableCell>{t("Yearly")}</TableCell>
                <TableCell>{t("Features")}</TableCell>
                <TableCell>{t("Quotas")}</TableCell>
                <TableCell>{t("Instances")}</TableCell>
                <TableCell>{t("Status")}</TableCell>
                <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: tpl.color || "#3B82F6" }}>
                        {(tpl.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">{tpl.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-gray-100 dark:bg-gray-700">{tpl.slug}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold">{formatMoney(tpl.pricing?.monthly, tpl.pricing?.currency)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatMoney(tpl.pricing?.yearly, tpl.pricing?.currency)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {(tpl.features || []).length}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      {(tpl.quotas || []).length}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {tpl.instantiateCount ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(tpl.status)}`}>{tpl.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <ActionMenu
                        id={tpl._id}
                        title={tpl.name}
                        handleUpdate={canUpdate ? handleUpdate : undefined}
                        handleModalOpen={canDelete ? (id, title) => handleDelete(id) : undefined}
                        showEdit={canUpdate}
                        showDelete={canDelete}
                      />
                    </div>
                    <div className="flex justify-center gap-1 mt-1">
                      {canCreate && (
                        <Button size="small" layout="outline" onClick={() => handleInstantiate(tpl)} title="Instantiate plan">
                          <FiZap />
                        </Button>
                      )}
                      {canCreate && (
                        <Button size="small" layout="outline" onClick={() => handleClone(tpl._id)} title="Clone template">
                          <FiCopy />
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
      ) : (
        <NotFound title={t("NoPlanTemplates") || "Sorry, There are no plan templates right now."} />
      )}
    </>
  );
};

export default PlanTemplates;
