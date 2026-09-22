import { Card, CardBody, Modal, ModalBody, ModalFooter, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";

import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronRight, FiEdit, FiPlus, FiTrash2 } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";

//internal import
import MainDrawer from "@/components/drawer/MainDrawer";
import AttributeValueDrawer from "@/components/drawer/AttributeValueDrawer";
import Loading from "@/components/preloader/Loading";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import { IconButton } from "@/components/ui";

import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import useGetCData from "@/hooks/useGetCData";
import AttributeServices from "@/services/AttributeServices";
import AttributeValueServices from "@/services/AttributeValueServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const AttributeValues = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { toggleDrawer, isDrawerOpen, closeDrawer, setIsUpdate } =
    useContext(SidebarContext);

  const { hasPermission } = useGetCData();
  const canCreate = hasPermission("attributes", "create");
  const canUpdate = hasPermission("attributes", "update");
  const canDelete = hasPermission("attributes", "delete");

  const [serviceId, setServiceId] = useState(undefined);
  const [deleteValue, setDeleteValue] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: attribute } = useAsync(() =>
    AttributeServices.getAttributeById(id)
  );
  const {
    data: values,
    loading,
    error,
  } = useAsync(() => AttributeValueServices.getValuesByAttribute(id));

  // Keep the drawer in "add" mode once it closes.
  useEffect(() => {
    if (!isDrawerOpen) setServiceId(undefined);
  }, [isDrawerOpen]);

  const handleAdd = () => {
    setServiceId(undefined);
    toggleDrawer();
  };

  const handleEdit = (valueId) => {
    setServiceId(valueId);
    toggleDrawer();
  };

  const handleConfirmDelete = async () => {
    if (!deleteValue?._id) return;
    try {
      setIsDeleting(true);
      const res = await AttributeValueServices.deleteValue(deleteValue._id);
      notifySuccess(res?.message || "Attribute value deleted successfully!");
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
      setDeleteValue(null);
    }
  };

  return (
    <>
      <PageTitle>{t("AttributeTermsTitle")}</PageTitle>

      <MainDrawer>
        <AttributeValueDrawer
          key={serviceId || "new"}
          attributeId={id}
          id={serviceId}
        />
      </MainDrawer>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteValue} onClose={() => setDeleteValue(null)}>
        <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
          <span className="flex justify-center text-3xl mb-6 text-red-500">
            <FiTrash2 />
          </span>
          <h2 className="text-xl font-medium mb-2">
            {t("DeleteModalH2")}{" "}
            <span className="text-red-500">{deleteValue?.label}</span>?
          </h2>
          <p>{t("DeleteModalPtag")}</p>
        </ModalBody>
        <ModalFooter className="justify-center">
          <Button
            className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
            layout="outline"
            onClick={() => setDeleteValue(null)}
          >
            {t("modalKeepBtn")}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="w-full h-12 sm:w-auto"
          >
            {t("modalDeletBtn")}
          </Button>
        </ModalFooter>
      </Modal>

      <AnimatedContent>
        <div className="flex items-center pb-4">
          <ol className="flex items-center w-full overflow-hidden font-serif">
            <li className="text-sm pr-1 transition duration-200 ease-in cursor-pointer hover:text-emerald-500 font-semibold">
              <Link className="text-blue-700" to={`/attributes`}>
                Attributes
              </Link>
            </li>
            <span className="flex items-center font-serif dark:text-gray-400">
              <li className="text-sm mt-[1px]">
                <FiChevronRight />
              </li>
              <li className="text-sm pl-1 font-semibold dark:text-gray-400">
                {attribute?.name}
              </li>
            </span>
          </ol>
        </div>

        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody className="py-3 flex justify-end">
            {canCreate && (
              <Button onClick={handleAdd} className="rounded-md h-12">
                <span className="mr-3">
                  <FiPlus />
                </span>
                {t("AddValue")}
              </Button>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      {loading ? (
        <Loading loading={loading} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">
          {error?.response?.data?.message || error?.message || String(error)}
        </span>
      ) : values?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>Label</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Value</TableCell>
                <TableCell className="text-center">Color</TableCell>
                <TableCell className="text-center">Image</TableCell>
                <TableCell className="text-center">Sort order</TableCell>
                <TableCell className="text-right">{t("AAction")}</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {values?.map((value) => (
                <TableRow key={value._id}>
                  <TableCell className="font-medium text-sm">
                    {value.label}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {value.slug}
                  </TableCell>
                  <TableCell className="text-sm">{value.value}</TableCell>
                  <TableCell className="text-center">
                    {value.color ? (
                      <span
                        className="inline-block w-6 h-6 rounded border border-gray-200 dark:border-gray-600 align-middle"
                        style={{ backgroundColor: value.color }}
                        title={value.color}
                      />
                    ) : (
                      <span className="text-gray-300">â€”</span>

                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {value.image ? (
                      <img
                        src={value.image}
                        alt={value.label}
                        className="inline-block w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <span className="text-gray-300">â€”</span>

                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {value.sortOrder}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <IconButton
                          icon="edit"
                          onClick={() => handleEdit(value._id)}
                          aria-label="Edit"
                          title={t("Edit") || "Edit"}
                        />
                      )}
                      {canDelete && (
                        <IconButton
                          icon="trash"
                          onClick={() => setDeleteValue(value)}
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
      ) : (
        <NotFound title="Sorry, there are no values for this attribute yet." />
      )}
    </>
  );
};

export default AttributeValues;
