import { Card, CardBody, Input, Pagination, Select, Table, TableCell, TableContainer, TableFooter, TableHeader } from "@windmill/react-ui";

import { useContext, useEffect, useState } from "react";
import { FiPlus, FiUsers } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import SupportTicketServices from "@/services/SupportTicketServices";
import UserServices from "@/services/UserServices";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useGetCData from "@/hooks/useGetCData";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import SupportTicketDrawer from "@/components/drawer/SupportTicketDrawer";
import SupportTicketTable from "@/components/supportTicket/SupportTicketTable";
import CheckBox from "@/components/form/others/CheckBox";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

// SFG-80 Phase 1 (frontend): no ticket-category management UI/API exists
// yet, same limitation documented in SupportTicketDrawer.jsx â€” swap for a

// live fetch once TicketCategory CRUD lands.
const CATEGORY_OPTIONS = [];

const BULK_ACTIONS = [
  { value: "assign", label: "SupportTicketBulkActionAssign" },
  { value: "priority", label: "SupportTicketBulkActionPriority" },
  { value: "tag", label: "SupportTicketBulkActionTag" },
];

const BULK_PRIORITY_VALUES = ["low", "normal", "high", "critical"];

const SupportTickets = () => {
  const { t } = useTranslation();
  const {
    currentPage,
    handleChangePage,
    searchText,
    setSearchText,
    searchRef,
    limitData,
    setIsUpdate,
  } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const canCreateTicket = hasPermission("support ticket", "create");
  const canAssignTicket = hasPermission("support ticket", "assign");
  const canUpdateTicket = hasPermission("support ticket", "update");

  // Local filter/sort state â€” deliberately NOT the shared SidebarContext

  // status/category/startDate/endDate slots (those bleed across pages);
  // same choice Coupons.jsx makes with its own local quickFilter state.
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("");

  const { data: staffData } = useAsync(() => UserServices.getStaff());
  const staffList = Array.isArray(staffData?.data) ? staffData.data : [];

  const { data, loading, error } = useAsync(() =>
    SupportTicketServices.getAllTickets({
      page: currentPage,
      limit: limitData,
      status: statusFilter,
      priority: priorityFilter,
      categoryId: categoryFilter,
      assigneeId: assigneeFilter,
      dateFrom,
      dateTo,
      sortBy,
      search: searchText,
    })
  );
  const ticketList = data?.data || [];

  const { handleUpdate } = useToggleDrawer();

  // useAsync only refetches on a fixed set of SidebarContext values (see
  // useAsync.js) â€” none of the local filter state above is in that list, so

  // every filter change has to explicitly flag isUpdate itself.
  useEffect(() => {
    setIsUpdate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, categoryFilter, assigneeFilter, dateFrom, dateTo, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchText(searchRef.current.value || null);
    setIsUpdate(true);
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
    setAssigneeFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("");
    searchRef.current.value = "";
    setSearchText(null);
    setIsUpdate(true);
  };

  // Single-direction sort per column â€” the backend's getAllTickets doesn't

  // support an asc/desc toggle for any of these (priority is always
  // most-urgent-first, sla.resolutionDeadline always soonest-first,
  // createdAt is only ever the default newest-first fallback), so this is a
  // 3-way "sort by X" switch rather than a real ascending/descending toggle.
  const handleSort = (column) => {
    setSortBy((prev) => (prev === column ? "" : column));
  };

  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const handleSelectAll = () => {
    const next = !isCheckAll;
    setIsCheckAll(next);
    setIsCheck(next ? ticketList.map((tk) => tk._id) : []);
  };

  useEffect(() => {
    setIsCheck([]);
    setIsCheckAll(false);
  }, [ticketList.length, currentPage]);

  const [bulkAction, setBulkAction] = useState("assign");
  const [bulkValue, setBulkValue] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const handleBulkApply = async () => {
    if (isCheck.length === 0 || !bulkValue) return;
    try {
      setIsBulkSubmitting(true);
      await SupportTicketServices.bulkAction({
        ticketIds: isCheck,
        action: bulkAction,
        value: bulkValue,
      });
      notifySuccess(t("SupportTicketBulkActionSuccess", { count: isCheck.length }));
      setIsCheck([]);
      setIsCheckAll(false);
      setBulkValue("");
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle>{t("SupportTicketspageTitle")}</PageTitle>

      <MainDrawer>
        <SupportTicketDrawer />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSearchSubmit}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex flex-wrap items-center"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  ref={searchRef}
                  type="search"
                  name="search"
                  placeholder={t("SupportTicketSearchPlaceholder")}
                />
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">{t("SupportTicketFilterAllStatus")}</option>
                  <option value="open">{t("SupportTicketStatusOpen")}</option>
                  <option value="in_progress">{t("SupportTicketStatusInProgress")}</option>
                  <option value="waiting_customer">{t("SupportTicketStatusWaitingCustomer")}</option>
                  <option value="resolved">{t("SupportTicketStatusResolved")}</option>
                  <option value="closed">{t("SupportTicketStatusClosed")}</option>
                </Select>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="">{t("SupportTicketFilterAllPriority")}</option>
                  <option value="low">{t("SupportTicketPriorityLow")}</option>
                  <option value="normal">{t("SupportTicketPriorityNormal")}</option>
                  <option value="high">{t("SupportTicketPriorityHigh")}</option>
                  <option value="critical">{t("SupportTicketPriorityCritical")}</option>
                </Select>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">{t("SupportTicketFilterAllCategory")}</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                  <option value="">{t("SupportTicketFilterAllAssignee")}</option>
                  {staffList.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name || staff.email}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <div className="w-full mx-1">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    {t("FilterBtn") || "Filter"}
                  </Button>
                </div>
                <div className="w-full mx-1">
                  <Button
                    layout="outline"
                    onClick={handleResetFilters}
                    type="button"
                    className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">{t("ResetBtn") || "Reset"}</span>
                  </Button>
                </div>
              </div>

              {canCreateTicket && (
                <div className="w-full md:w-48 lg:w-48 xl:w-48">
                  <Button type="button" onClick={() => handleUpdate(null)} className="w-full rounded-md h-12">
                    <span className="mr-2">
                      <FiPlus />
                    </span>
                    {t("AddSupportTicket")}
                  </Button>
                </div>
              )}
            </form>
          </CardBody>
        </Card>

        {isCheck.length > 0 && (canUpdateTicket || canAssignTicket) && (
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium flex items-center">
                  <FiUsers className="mr-2" />
                  {t("SupportTicketBulkSelectedCount", { count: isCheck.length })}
                </span>

                <Select
                  value={bulkAction}
                  onChange={(e) => {
                    setBulkAction(e.target.value);
                    setBulkValue("");
                  }}
                  className="w-auto"
                >
                  {BULK_ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>
                      {t(action.label)}
                    </option>
                  ))}
                </Select>

                {bulkAction === "assign" && (
                  <Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="w-auto">
                    <option value="">{t("SupportTicketBulkSelectAgent")}</option>
                    {staffList.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.name || staff.email}
                      </option>
                    ))}
                  </Select>
                )}

                {bulkAction === "priority" && (
                  <Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="w-auto">
                    <option value="">{t("SupportTicketBulkSelectPriority")}</option>
                    {BULK_PRIORITY_VALUES.map((p) => (
                      <option key={p} value={p}>
                        {t(`SupportTicketPriority${p.charAt(0).toUpperCase()}${p.slice(1)}`)}
                      </option>
                    ))}
                  </Select>
                )}

                {bulkAction === "tag" && (
                  <Input
                    type="text"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    placeholder={t("SupportTicketBulkTagPlaceholder")}
                    className="w-auto"
                  />
                )}

                <Button
                  type="button"
                  onClick={handleBulkApply}
                  disabled={!bulkValue || isBulkSubmitting}
                  className="h-10"
                >
                  {t("SupportTicketBulkApply")}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </AnimatedContent>

      {loading ? (
        <TableLoading row={12} col={10} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : ticketList.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    isChecked={isCheckAll}
                    handleClick={handleSelectAll}
                  />
                </TableCell>
                <TableCell>{t("SupportTicketTblNumber")}</TableCell>
                <TableCell>{t("SupportTicketTblSubject")}</TableCell>
                <TableCell>{t("SupportTicketTblCustomer")}</TableCell>
                <TableCell>{t("SupportTicketTblCategory")}</TableCell>
                <TableCell
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("priority")}
                >
                  {t("SupportTicketTblPriority")}
                  {sortBy === "priority" ? " â–¾" : ""}

                </TableCell>
                <TableCell className="text-center">{t("SupportTicketTblStatus")}</TableCell>
                <TableCell
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("sla.resolutionDeadline")}
                >
                  {t("SupportTicketTblSla")}
                  {sortBy === "sla.resolutionDeadline" ? " â–¾" : ""}

                </TableCell>
                <TableCell>{t("SupportTicketTblAssignedTo")}</TableCell>
                <TableCell
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  {t("SupportTicketTblCreatedAt")}
                  {sortBy === "createdAt" ? " â–¾" : ""}

                </TableCell>
              </tr>
            </TableHeader>
            <SupportTicketTable
              tickets={ticketList}
              isCheck={isCheck}
              setIsCheck={setIsCheck}
              canAssign={canAssignTicket}
              canUpdateStatus={canUpdateTicket}
            />
          </Table>
          <TableFooter>
            <Pagination
              totalResults={data?.totalDoc || 0}
              resultsPerPage={limitData}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title={t("SupportTicketNotFound")} />
      )}
    </>
  );
};

export default SupportTickets;
