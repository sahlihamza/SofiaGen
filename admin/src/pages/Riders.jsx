import { Card, CardBody, Input, Pagination, Select, Table, TableCell, TableContainer, TableFooter, TableHeader } from "@windmill/react-ui";

import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus, FiTruck, FiCheckCircle, FiMapPin, FiNavigation } from "react-icons/fi";

import useAsync from "@/hooks/useAsync";
import useGetCData from "@/hooks/useGetCData";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import RiderDrawer from "@/components/drawer/RiderDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import TableLoading from "@/components/preloader/TableLoading";
import RiderTable from "@/components/rider/RiderTable";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import { SidebarContext } from "@/context/SidebarContext";
import RiderServices from "@/services/RiderServices";
import { Button } from "@sofia/ui";

const StatCard = ({ icon: Icon, label, value, bg, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  </div>
);

const Riders = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { title, serviceId, setServiceId, handleUpdate, handleModalOpen } = useToggleDrawer();
  const { hasPermission } = useGetCData();
  const canCreateRider = hasPermission("riders", "create");
  const { data: riders, loading, error } = useAsync(RiderServices.getAllRiders);
  const [stats, setStats] = useState({ total: 0, active: 0, available: 0, onDelivery: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [checkedIds, setCheckedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  useEffect(() => {
    (async () => {
      try {
        const res = await RiderServices.getRiderStats();
        setStats(res?.data || {});
      } catch (err) {
        // silencieux, les cartes afficheront juste 0
      }
    })();
  }, [riders]);

  const handleOpenAddDrawer = () => {
    setServiceId(undefined);
    toggleDrawer();
  };

  const handleToggleCheck = (id) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filtered = riders?.data?.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.phone?.toLowerCase().includes(term);
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    const matchesAvailability = availabilityFilter
      ? r.availability === availabilityFilter
      : true;
    return matchesSearch && matchesStatus && matchesAvailability;
  });

  const paginated = filtered?.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageTitle>{t("RidersPageTitle")}</PageTitle>
      <DeleteModal id={serviceId} title={title} />
      <MainDrawer>
        <RiderDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FiTruck} label={t("RidersStatTotal")} value={stats.total || 0} bg="#DBEAFE" color="#2563EB" />
          <StatCard icon={FiCheckCircle} label={t("RidersStatActive")} value={stats.active || 0} bg="#D1FAE5" color="#059669" />
          <StatCard icon={FiMapPin} label={t("RidersStatAvailable")} value={stats.available || 0} bg="#D1FAE5" color="#059669" />
          <StatCard icon={FiNavigation} label={t("RidersStatOnDelivery")} value={stats.onDelivery || 0} bg="#FEF3C7" color="#D97706" />
        </div>

        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <div className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex items-center">
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("RidersSearchBy")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">{t("RidersStatusFilterLabel")}</option>
                  <option value="Active">{t("RidersStatusActiveOption")}</option>
                  <option value="Inactive">{t("RidersStatusInactiveOption")}</option>
                </Select>
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
                  <option value="">{t("RidersAvailabilityFilterLabel")}</option>
                  <option value="Ã€ La Livraison">{t("RidersAvailabilityOnDeliveryOption")}</option>

                  <option value="Disponible">{t("RidersAvailabilityAvailableOption")}</option>
                  <option value="Hors Ligne">{t("RidersAvailabilityOfflineOption")}</option>
                </Select>
              </div>
              {canCreateRider && (
                <div className="w-full md:w-56 lg:w-56 xl:w-56">
                  <Button onClick={handleOpenAddDrawer} className="w-full rounded-md h-12">
                    <span className="mr-3">
                      <FiPlus />
                    </span>
                    {t("AddRider")}
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </AnimatedContent>

      {loading ? (
        <TableLoading row={12} col={9} width={163} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">
          {error?.response?.data?.message || error?.message || String(error)}
        </span>
      ) : paginated?.length !== 0 ? (
        <TableContainer className="mb-8 rounded-b-lg">
          <Table>
            <TableHeader>
              <tr>
                <TableCell></TableCell>
                <TableCell>{t("RidersNameTbl")}</TableCell>
                <TableCell>{t("RidersPhoneTbl")}</TableCell>
                <TableCell>{t("RidersVehicleTbl")}</TableCell>
                <TableCell>{t("RidersAvailabilityTbl")}</TableCell>
                <TableCell>{t("RidersDeliveriesTbl")}</TableCell>
                <TableCell>{t("RidersRatingTbl")}</TableCell>
                <TableCell className="text-center">{t("RidersStatusTbl")}</TableCell>
                <TableCell className="text-center">{t("RidersActionsTbl")}</TableCell>
              </tr>
            </TableHeader>

            <RiderTable
              riders={paginated}
              checkedIds={checkedIds}
              onToggleCheck={handleToggleCheck}
              handleUpdate={handleUpdate}
              handleModalOpen={handleModalOpen}
            />
          </Table>
          <TableFooter>
            <Pagination
              totalResults={filtered?.length || 0}
              resultsPerPage={perPage}
              onChange={setPage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title={t("RidersNotFound")} />
      )}
    </>
  );
};

export default Riders;