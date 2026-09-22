import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiSliders } from "react-icons/fi";

//internal import
import MainDrawer from "@/components/drawer/MainDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useGetCData from "@/hooks/useGetCData";
import CheckBox from "@/components/form/others/CheckBox";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import AttributeDrawer from "@/components/drawer/AttributeDrawer";
import Tooltip from "@/components/tooltip/Tooltip";

// Supports the new schema (name: String) and legacy multilingual { title } docs.
const attributeName = (a) => {
  if (typeof a?.name === "string" && a.name.trim()) return a.name;
  if (a?.name && typeof a.name === "object")
    return a.name.en || Object.values(a.name)[0] || "";
  if (typeof a?.title === "string" && a.title.trim()) return a.title;
  if (a?.title && typeof a.title === "object")
    return a.title.en || Object.values(a.title)[0] || "";
  return "";
};

const AttributeTable = ({ isCheck, setIsCheck, attributes }) => {
  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();

  const { t } = useTranslation();
  const { showingTranslateValue } = useUtilsFunction();
  const { hasPermission } = useGetCData();
  const canUpdateAttribute = hasPermission("attributes", "update");
  const canDeleteAttribute = hasPermission("attributes", "delete");

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  return (
    <>
      {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}

      {isCheck.length < 2 && (
        <MainDrawer>
          <AttributeDrawer id={serviceId} />
        </MainDrawer>
      )}

      <TableBody>
        {attributes?.map((attribute) => (
          <TableRow key={attribute._id}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name="attribute"
                id={attribute._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(attribute._id)}
              />
            </TableCell>

            <TableCell className="font-semibold uppercase text-xs">
              {attribute?._id?.substring(20, 24)}
            </TableCell>

            <TableCell className="font-medium text-sm">
              {attributeName(attribute)}
            </TableCell>

            <TableCell className="font-medium text-sm text-gray-500">
              {attribute.slug}
            </TableCell>

            <TableCell className="font-medium text-sm">
              {attribute.description}
            </TableCell>

            <TableCell className="text-center font-medium text-sm">
              {attribute.isVariation ? "Yes" : "No"}
            </TableCell>

            <TableCell>
              <div className="flex justify-end items-center">
                <Link
                  to={`/attributes/${attribute._id}/values`}
                  className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 focus:outline-none"
                >
                  <Tooltip
                    id={`configure-${attribute._id}`}
                    Icon={FiSliders}
                    title={t("ConfigureTerms")}
                    bgColor="#10B981"
                  />
                </Link>

                <EditDeleteButton
                  id={attribute._id}
                  isCheck={isCheck}
                  setIsCheck={setIsCheck}
                  handleUpdate={handleUpdate}
                  handleModalOpen={handleModalOpen}
                  title={showingTranslateValue(attribute.title)}
                  showEdit={canUpdateAttribute}
                  showDelete={canDeleteAttribute}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default AttributeTable;
