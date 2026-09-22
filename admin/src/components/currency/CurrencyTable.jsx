import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import React from "react";

//internal import
import CheckBox from "@/components/form/others/CheckBox";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import CurrencyDrawer from "@/components/drawer/CurrencyDrawer";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import ShowHideButton from "@/components/table/ShowHideButton";
import useGetCData from "@/hooks/useGetCData";
// import { SidebarContext } from '../context/SidebarContext';

const CurrencyTable = ({ currency, isCheck, setIsCheck }) => {
  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();
  const { hasPermission } = useGetCData();
  const canUpdateCurrency = hasPermission("settings", "update");
  const canDeleteCurrency = hasPermission("settings", "delete");

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

      <MainDrawer>
        <CurrencyDrawer id={serviceId} />
      </MainDrawer>

      <TableBody>
        {currency?.map((currency) => (
          <TableRow key={currency._id}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name={currency.symbol}
                id={currency._id}
                handleClick={handleClick}
                isChecked={isCheck.includes(currency._id)}
              />
            </TableCell>

            <TableCell className="text-center">
              <div className="inline-flex items-center justify-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {currency.iso_code || currency.symbol || currency.name?.slice(0,2).toUpperCase()}
                </span>
                <span className="font-medium text-sm">{currency.name}</span>
              </div>
            </TableCell>

            {/* <TableCell className="text-center">
              <span className="font-medium text-sm">{currency.iso_code}</span>
            </TableCell> */}

            <TableCell className="text-center">
              <span className="font-medium text-sm">{currency.symbol}</span>
            </TableCell>

            <TableCell className="text-center">
              <ShowHideButton
                id={currency._id}
                status={currency.status}
                currencyStatusName="status"
              />
            </TableCell>

            <TableCell>
              <EditDeleteButton
                title={currency.name}
                id={currency._id}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                showEdit={canUpdateCurrency}
                showDelete={canDeleteCurrency}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default CurrencyTable;
