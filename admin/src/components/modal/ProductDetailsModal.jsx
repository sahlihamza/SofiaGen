import { Badge, Modal, ModalBody } from "@windmill/react-ui";
import React from "react";
import { FiX } from "react-icons/fi";
import { IconButton } from "@sofia/ui";

//internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { getGalleryImages, getPrimaryGalleryImage } from "@/utils/gallery";
import { productCategoryNames } from "@/utils/categoryTree";
import { getEffectivePrice, isSaleActive } from "@/utils/salePrice";

const placeholderImage =
  "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png";

const statusColor = {
  published: "success",
  draft: "warning",
  archived: "danger",
};

const ProductDetailsModal = ({ isOpen, onClose, product }) => {
  const { currency, getNumberTwo } = useUtilsFunction();

  if (!product) return null;

  const galleryImages = getGalleryImages(product.productGallery);
  const mainImage = getPrimaryGalleryImage(product) || placeholderImage;
  const secondaryImages = galleryImages.filter(
    (img) => Boolean(img) && img !== mainImage
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full overflow-hidden bg-white rounded-lg dark:bg-gray-800 sm:m-4 !max-w-4xl"
      style={{ maxWidth: 960 }}
    >
      <ModalBody className="p-0">
   
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Product Details
          </h2>
          <IconButton
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 focus:outline-none"
          >
            <FiX size={20} />
          </IconButton>
        </div>

        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* image + gallery */}
          <div className="flex-shrink-0 flex flex-col items-center">
            {mainImage ? (
              <img
                src={mainImage}
                alt="product"
                className="h-48 w-48 object-contain border rounded-md border-gray-100 dark:border-gray-700"
                onError={(e) => {
                  e.currentTarget.src = placeholderImage;
                }}
              />
            ) : (
              <img
                src={placeholderImage}
                alt="product"
                className="h-48 w-48 object-contain border rounded-md border-gray-100 dark:border-gray-700"
              />
            )}
            {secondaryImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {secondaryImages.map((img, idx) => (
                  <img
                    key={`${img}-${idx}`}
                    src={img}
                    alt={`secondary-${idx}`}
                    className="h-12 w-12 border rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.src = placeholderImage;
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Badge type={statusColor[product.status] || "neutral"}>
                <span className="capitalize">{product.status}</span>
              </Badge>
              <Badge
                type={product.visibility === "public" ? "success" : "warning"}
              >
                <span className="capitalize">{product.visibility}</span>
              </Badge>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {product.productName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Categories: {productCategoryNames(product) || ""}
            </p>

            <div className="font-bold text-2xl text-gray-800 dark:text-gray-200 mb-3">
              {currency}
              {getNumberTwo(getEffectivePrice(product))}
              {isSaleActive(product) && (
                <del className="text-gray-400 text-lg pl-2">
                  {currency}
                  {getNumberTwo(product.regularPrice)}
                </del>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-6 mb-3">
                {product.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <p className="text-gray-500 dark:text-gray-400">
                <span className="text-gray-700 dark:text-gray-300">Type: </span>
                <span className="capitalize">{product.productType}</span>
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                <span className="text-gray-700 dark:text-gray-300">
                  Tax Status:{" "}
                </span>
                <span className="capitalize">{product.taxStatus}</span>
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                <span className="text-gray-700 dark:text-gray-300">
                  Tax Class:{" "}
                </span>
                <span className="capitalize">{product.taxClass}</span>
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                <span className="text-gray-700 dark:text-gray-300">
                  Options:{" "}
                </span>
                {product.virtual ? "Virtual " : ""}
                {product.downloadable ? "Downloadable" : ""}
                {!product.virtual && !product.downloadable ? "" : ""}
              </p>
              <p className="col-span-2 text-gray-500 dark:text-gray-400">
                <span className="text-gray-700 dark:text-gray-300">Tags: </span>
                {product.productTags?.length > 0
                  ? product.productTags.join(", ")
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ProductDetailsModal;
