import { Avatar, Badge, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { FiCheckCircle } from "react-icons/fi";

// internal import
import CheckBox from "@/components/form/others/CheckBox";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import StoreDrawer from "@/components/drawer/StoreDrawer";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import { useStoreContext } from "@/context/StoreContext";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

const StoreTable = ({ stores, isCheck, setIsCheck }) => {
  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  const { selectStore } = useStoreContext();

  const handleSelectStore = async (id) => {
    try {
      await selectStore(id);
      notifySuccess("Store selected successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      notifyError("Failed to select store.");
    }
  };

  return (
    <>
      {isCheck?.length < 1 && (
        <DeleteModal id={serviceId} title={title} />
      )}

      <MainDrawer>
        <StoreDrawer id={serviceId} />
      </MainDrawer>

      <TableBody>
        {stores?.map((store) => (
          <TableRow key={store._id}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name="store"
                id={store._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(store._id)}
              />
            </TableCell>

            <TableCell className="font-semibold uppercase text-xs">
              {store?._id?.substring(20, 24)}
            </TableCell>

            <TableCell>
              <Avatar
                className="hidden mr-3 md:block bg-gray-50 p-1"
                src={
                  store?.logo ||
                  "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                }
                alt={store?.name}
              />
            </TableCell>

            <TableCell className="font-medium text-sm">
              {store?.name}
            </TableCell>

            <TableCell className="text-sm text-gray-700 dark:text-gray-300">
              {store?.ownerId?.name || store?.ownerName || "â€”"}
            </TableCell>

            <TableCell className="text-sm text-gray-500">
              {store?.address || "â€”"}
            </TableCell>

            <TableCell className="text-sm">
              {store?.currency || "USD"}
            </TableCell>

            <TableCell className="text-center">
              <Badge
                type={store?.status === "deleted" ? "default" : store?.isActive ? "success" : "danger"}
                className={`px-3 py-1 text-xs ${store?.status === "deleted" ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" : ""}`}
              >
                {store?.status === "deleted" ? "Deleted" : store?.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>

            <TableCell className="text-center">
              <Button
                onClick={() => handleSelectStore(store._id)}
                title="Select this store"
                className={`p-2 rounded-full focus:outline-none transition-colors ${
                  store?.isSelected
                    ? "text-emerald-600"
                    : "text-gray-300 hover:text-emerald-500"
                }`}
              >
                <FiCheckCircle size={20} />
              </Button>
            </TableCell>

            <TableCell>
              <EditDeleteButton
                id={store?._id}
                isCheck={isCheck}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={store?.name}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default StoreTable;