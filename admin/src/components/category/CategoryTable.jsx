import { TableBody, TableCell, TableRow } from "@windmill/react-ui";

//internal import

import CheckBox from "@/components/form/others/CheckBox";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import CategoryDrawer from "@/components/drawer/CategoryDrawer";
import ShowHideButton from "@/components/table/ShowHideButton";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import useGetCData from "@/hooks/useGetCData";

// Indentation per nesting level, matching the product-form category panel.
const INDENT = 18;

const CategoryTable = ({
  data,
  lang,
  isCheck,
  categories,
  setIsCheck,
  useParamId,
}) => {
  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();
  const { hasPermission } = useGetCData();
  const canUpdateCategory = hasPermission("categories", "update");
  const canDeleteCategory = hasPermission("categories", "delete");

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  return (
    <>
      {isCheck?.length < 1 && (
        <DeleteModal useParamId={useParamId} id={serviceId} title={title} />
      )}

      <MainDrawer>
        <CategoryDrawer id={serviceId} data={data} lang={lang} />
      </MainDrawer>

      <TableBody>
        {categories?.map((category) => {
          // `depth` is set by flattenCategoryTree; the page decides which rows
          // are in the list (roots only, or the whole tree).
          const depth = category?.depth || 0;
          const hasChildren = category?.childCount > 0;

          return (
            <TableRow key={category._id}>
              <TableCell>
                <CheckBox
                  type="checkbox"
                  name="category"
                  id={category._id}
                  handleClick={handleClick}
                  isChecked={isCheck?.includes(category._id)}
                />
              </TableCell>

              <TableCell className="font-semibold uppercase text-xs">
                {category?._id?.substring(20, 24)}
              </TableCell>

              <TableCell className="font-medium text-sm">
                <div
                  className="flex items-center"
                  style={{ paddingLeft: depth * INDENT }}
                >
                  <span className={hasChildren ? "font-semibold" : ""}>
                    {category?.name}
                  </span>
                </div>
              </TableCell>

              <TableCell className="text-sm text-gray-500">
                {category?.slug}
              </TableCell>

              <TableCell className="text-center">
                <ShowHideButton
                  id={category._id}
                  category
                  status={category.status}
                />
              </TableCell>

              <TableCell>
                <EditDeleteButton
                  id={category?._id}
                  parent={category}
                  isCheck={isCheck}
                  handleUpdate={handleUpdate}
                  handleModalOpen={handleModalOpen}
                  title={category?.name}
                  showEdit={canUpdateCategory}
                  showDelete={canDeleteCategory}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </>
  );
};

export default CategoryTable;
