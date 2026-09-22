import { Card, CardBody, Input, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";
import { useContext, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { SidebarContext } from "@/context/SidebarContext";
import TrialFactorServices from "@/services/TrialFactorServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import TrialFactorDrawer from "@/components/drawer/TrialFactorDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ActionMenu from "@/components/table/ActionMenu";
import { Button } from "@sofia/ui";

const CATEGORY_LABELS = {
  time: "Temps",
  catalog: "Catalogue",
  business: "Business",
  api: "API",
  storage: "Stockage",
  marketing: "Marketing",
  ai: "AI",
};

const categoryBadge = (cat) => {
  const map = {
    time: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    catalog: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    business: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    api: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    storage: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    marketing: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    ai: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  };
  return map[cat] || map.business;
};

const statusBadge = (status) => {
  const map = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.active;
};

const TrialFactors = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { serviceId, setServiceId } = useToggleDrawer();

  const canCreate = hasPermission("billing", "create") || hasPermission("platform", "create");
  const canUpdate = hasPermission("billing", "update");
  const canDelete = hasPermission("billing", "delete");

  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["trial-factors", searchText, categoryFilter],
    queryFn: () =>
      TrialFactorServices.getAllTrialFactors({
        search: searchText,
        category: categoryFilter,
        sort: "category",
      }),
  });

  const factors = data?.data || [];

  const handleReset = () => {
    setSearchText("");
    setCategoryFilter("");
  };

  const handleDelete = async (id) => {
    try {
      await TrialFactorServices.deleteTrialFactor(id);
      successMessage(t("TrialFactorDeleteSuccess") || "Trial factor deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["trial-factors"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to delete trial factor");
    }
  };

  const handleUpdate = (id) => {
    setServiceId(id);
    toggleDrawer();
  };

  return (
    <>
      <PageTitle>{t("TrialFactorsPageTitle") || "Trial Factors"}</PageTitle>

      <MainDrawer>
        <TrialFactorDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form onSubmit={(e) => e.preventDefault()} className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex">
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("SearchTrialFactor") || "Search by name or code"}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllCategories") || "All Categories"}</option>
                  {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
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
                      {t("AddTrialFactor") || "Add Trial Factor"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {isLoading ? (
        <TableLoading row={12} col={6} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error?.message || error}</span>
      ) : factors?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>{t("Factor")}</TableCell>
                <TableCell>{t("Code")}</TableCell>
                <TableCell>{t("Category")}</TableCell>
                <TableCell>{t("Unit")}</TableCell>
                <TableCell>{t("Operators")}</TableCell>
                <TableCell>{t("Status")}</TableCell>
                <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {factors.map((f) => (
                <TableRow key={f._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-blue-600">
                        {(f.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">
                        {f.name}
                        {f.isTimeFactor && (
                          <span className="ml-2 text-xs text-purple-600">â±</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-gray-100 dark:bg-gray-700">{f.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryBadge(f.category)}`}>
                      {CATEGORY_LABELS[f.category] || f.category}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-sm">{f.unit}</span></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(f.operators || []).slice(0, 3).map((op) => (
                        <span key={op} className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700">
                          {op}
                        </span>
                      ))}
                      {(f.operators || []).length > 3 && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700">
                          +{(f.operators || []).length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(f.status)}`}>{f.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <ActionMenu
                        id={f._id}
                        title={f.name}
                        handleUpdate={canUpdate ? handleUpdate : undefined}
                        handleModalOpen={canDelete ? (id, title) => handleDelete(id) : undefined}
                        showEdit={canUpdate}
                        showDelete={canDelete}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <NotFound title={t("NoTrialFactors") || "Sorry, There are no trial factors right now."} />
      )}
    </>
  );
};

export default TrialFactors;
