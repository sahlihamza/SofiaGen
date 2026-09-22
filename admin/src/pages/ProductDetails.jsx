import { Badge } from "@windmill/react-ui";
import React from "react";
import { useParams, useHistory } from "react-router-dom";
//internal import

import useAsync from "@/hooks/useAsync";
import ProductServices from "@/services/ProductServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import { getGalleryImages, getPrimaryGalleryImage } from "@/utils/gallery";
import { productCategoryNames } from "@/utils/categoryTree";
import { getEffectivePrice, isSaleActive } from "@/utils/salePrice";
import { Button } from "@sofia/ui";

const placeholderImage =
  "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png";

const ProductDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  // Edit now opens the full-page Edit Product form instead of a drawer.
  const handleUpdate = (pid) => history.push(`/products/${pid}/edit`);

  const { data, loading } = useAsync(() => ProductServices.getProductById(id));

  const { currency, getNumberTwo } = useUtilsFunction();

  const galleryImages = getGalleryImages(data?.productGallery);
  const mainImage = getPrimaryGalleryImage(data) || placeholderImage;
  const secondaryImages = galleryImages.filter(
    (img) => Boolean(img) && img !== mainImage
  );

  return (
    <>
      <PageTitle>Product Details</PageTitle>
      {loading ? (
        <Loading loading={loading} />
      ) : (
        <div className="inline-block overflow-y-auto h-full align-middle transition-all transform">
          <div className="flex flex-col lg:flex-row md:flex-row w-full overflow-hidden">
            <div className="flex-shrink-0 flex flex-col items-center justify-center h-auto">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt="product"
                  className="h-64 w-64 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = placeholderImage;
                  }}
                />
              ) : (
                <img
                  src={placeholderImage}
                  alt="product"
                  className="h-64 w-64 object-contain"
                />
              )}

              {secondaryImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  {secondaryImages.map((img, idx) => (
                    <img
                      key={`${img}-${idx}`}
                      src={img}
                      alt={`secondary-${idx}`}
                      className="h-14 w-14 border rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.src = placeholderImage;
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="w-full flex flex-col p-5 md:p-8 text-left">
              <div className="mb-5 block ">
                <div className="font-serif font-semibold py-1 text-sm">
                  <p className="text-sm text-gray-500 pr-4">
                    Status:{" "}
                    {data?.status === "published" ? (
                      <span className="text-emerald-400">Published</span>
                    ) : data?.status === "archived" ? (
                      <span className="text-red-400">Archived</span>
                    ) : (
                      <span className="text-yellow-500">Draft</span>
                    )}
                  </p>
                </div>
                <h2 className="text-heading text-lg md:text-xl lg:text-2xl font-semibold font-serif dark:text-gray-400">
                  {data?.productName}
                </h2>
                <p className="uppercase font-serif font-medium text-gray-500 dark:text-gray-400 text-sm">
                  Categories :{" "}
                  <span className="font-bold text-gray-500 dark:text-gray-500">
                    {productCategoryNames(data) || "â€”"}

                  </span>
                </p>
              </div>
              <div className="font-serif product-price font-bold dark:text-gray-400">
                <span className="inline-block text-2xl">
                  {currency}
                  {getNumberTwo(getEffectivePrice(data))}
                  {isSaleActive(data) && (
                    <del className="text-gray-400 dark:text-gray-500 text-lg pl-2">
                      {currency}
                      {getNumberTwo(data?.regularPrice)}
                    </del>
                  )}
                </span>
              </div>
              <div className="mb-3 mt-2 flex items-center gap-2">
                <Badge type="neutral">
                  <span className="font-bold capitalize">
                    {data?.productType}
                  </span>
                </Badge>
                <Badge type={data?.visibility === "public" ? "success" : "warning"}>
                  <span className="font-bold capitalize">
                    {data?.visibility}
                  </span>
                </Badge>
              </div>
              <p className="text-sm leading-6 text-gray-500 dark:text-gray-400 md:leading-7">
                {data?.description}
              </p>
              <div className="flex flex-col mt-4">
                <p className="font-serif font-semibold py-1 text-gray-500 text-sm">
                  <span className="text-gray-700 dark:text-gray-400">
                    Tax Status:{" "}
                  </span>{" "}
                  <span className="capitalize">{data?.taxStatus}</span>
                </p>
                <p className="font-serif font-semibold py-1 text-gray-500 text-sm">
                  <span className="text-gray-700 dark:text-gray-400">
                    Tax Class:{" "}
                  </span>{" "}
                  <span className="capitalize">{data?.taxClass}</span>
                </p>
                <p className="font-serif font-semibold py-1 text-gray-500 text-sm">
                  <span className="text-gray-700 dark:text-gray-400">
                    Tags:{" "}
                  </span>{" "}
                  {data?.productTags?.length > 0
                    ? data.productTags.join(", ")
                    : "â€”"}

                </p>
                <p className="font-serif font-semibold py-1 text-gray-500 text-sm">
                  <span className="text-gray-700 dark:text-gray-400">
                    Options:{" "}
                  </span>{" "}
                  {data?.virtual ? "Virtual " : ""}
                  {data?.downloadable ? "Downloadable" : ""}
                  {!data?.virtual && !data?.downloadable ? "â€”" : ""}

                </p>
              </div>
              <div className="mt-6">
                <Button
                  onClick={() => handleUpdate(id)}
                  className="cursor-pointer leading-5 transition-colors duration-150 font-medium text-sm focus:outline-none px-5 py-2 rounded-md text-white bg-emerald-500 border border-transparent active:bg-emerald-600 hover:bg-emerald-600 "
                >
                  Edit Product
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductDetails;
