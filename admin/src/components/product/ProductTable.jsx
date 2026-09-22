import { Avatar, Badge, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { FiEye } from "react-icons/fi";

//internal import
import CheckBox from "@/components/form/others/CheckBox";
import DeleteModal from "@/components/modal/DeleteModal";
import ProductDetailsModal from "@/components/modal/ProductDetailsModal";
import ActionMenu from "@/components/table/ActionMenu";
import ShowHideButton from "@/components/table/ShowHideButton";
import Tooltip from "@/components/tooltip/Tooltip";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useGetCData from "@/hooks/useGetCData";
import { getPrimaryGalleryImage } from "@/utils/gallery";
import { productCategoryNames } from "@/utils/categoryTree";
import { Button } from "@sofia/ui";

const placeholderImage =
  "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png";

const statusColor = {
  published: "success",
  draft: "warning",
  archived: "danger",
};

// Use the primary gallery image when present; otherwise fall back to legacy productImage.
const getProductThumb = (product) =>
  getPrimaryGalleryImage(product) || placeholderImage;

const ProductTable = ({ products, isCheck, setIsCheck }) => {
  const { title, serviceId, handleModalOpen } = useToggleDrawer();
  const history = useHistory();
  // Editing a product now opens the full-page Edit Product form instead of a
  // drawer, mirroring the Add Product page.
  const handleUpdate = (id) => history.push(`/products/${id}/edit`);
  // Duplicating opens the full-page form pre-filled from the source product.
  // Nothing is persisted until the user reviews and saves, which creates a new
  // product and leaves the original untouched.
  const handleDuplicate = (id) => history.push(`/products/${id}/duplicate`);
  const { currency, getNumberTwo } = useUtilsFunction();
  const { hasPermission } = useGetCData();
  const canUpdateProduct = hasPermission("products", "update");
  const canDeleteProduct = hasPermission("products", "delete");
  // duplicating creates a new product, so it needs the "create" right
  const canDuplicateProduct = hasPermission("products", "create");

  // product details popup
  const [detailProduct, setDetailProduct] = useState(null);

  const handleClick = (e) => {
    const { id, checked } = e.target;

    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  return (
    <>
      {isCheck?.length < 1 && <DeleteModal id={serviceId} title={title} />}

      <ProductDetailsModal
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        product={detailProduct}
      />

      <TableBody>
        {products?.map((product, i) => (
          <TableRow key={i + 1}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name={product?.productName}
                id={product._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(product._id)}
              />
            </TableCell>

            <TableCell>
              <div className="flex items-center">
                <Avatar
                  className="hidden p-1 mr-2 md:block bg-gray-50 shadow-none"
                  src={getProductThumb(product)}
                  alt="product"
                />
                <div>
                  <h2
                    className={`text-sm font-medium ${
                      product?.productName?.length > 30 ? "wrap-long-title" : ""
                    }`}
                  >
                    {product?.productName?.substring(0, 28)}
                  </h2>
                </div>
              </div>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {productCategoryNames(product) || "â€”"}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm font-semibold">
                {currency}
                {getNumberTwo(product?.regularPrice)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm font-semibold">
                {currency}
                {getNumberTwo(product?.salePrice)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm capitalize">{product?.productType}</span>
            </TableCell>

            <TableCell>
              <Badge type={statusColor[product?.status] || "neutral"}>
                <span className="capitalize">{product?.status}</span>
              </Badge>
            </TableCell>

            <TableCell>
              <Button
                onClick={() => setDetailProduct(product)}
                className="flex mx-auto justify-center text-gray-400 hover:text-emerald-600 focus:outline-none"
              >
                <Tooltip
                  id="view"
                  Icon={FiEye}
                  title="Details"
                  bgColor="#10B981"
                />
              </Button>
            </TableCell>

            <TableCell className="text-center">
              <ShowHideButton id={product._id} status={product.status} />
            </TableCell>

            <TableCell>
              <ActionMenu
                id={product._id}
                product={product}
                isCheck={isCheck}
                handleUpdate={handleUpdate}
                handleDuplicate={handleDuplicate}
                handleModalOpen={handleModalOpen}
                title={product?.productName}
                showEdit={canUpdateProduct}
                showDuplicate={canDuplicateProduct}
                showDelete={canDeleteProduct}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default ProductTable;
