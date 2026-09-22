import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import useProductSubmit from "@/hooks/useProductSubmit";
import useAsync from "@/hooks/useAsync";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import ProductTagServices from "@/services/ProductTagServices";
import BrandServices from "@/services/BrandServices";
import { C, cardStyle, EditorToolbar } from "@/components/Product_components/styles";
import ProductData from "@/components/Product_components/Product Data";
import Publish from "@/components/Product_components/Publish";
import Categories from "@/components/Product_components/categories";
import Brands from "@/components/Product_components/brands";
import Tags from "@/components/Product_components/Tags";
import ProductImage from "@/components/Product_components/Product Image";

// Shared product form body. Rendered both inside the drawer and on the full
// Add / Edit Product pages. `onCancel` runs when Cancel is clicked; `onSuccess`
// runs after a successful add/update (used by the pages to redirect).
// `isPage` tells the hook to load by id immediately (no drawer to wait on).
// `duplicateFrom` pre-fills the form from an existing product while keeping it a
// brand new record: saving creates a copy and leaves the source untouched.
const ProductForm = ({ id, duplicateFrom, onCancel, onSuccess, isPage }) => {
  const { t } = useTranslation();
  const {
    register,
    onSubmit,
    errors,
    mainImage,
    setMainImage,
    extraGallery,
    setExtraGallery,
    selectedTags,
    setSelectedTags,
    selectedCategories,
    setSelectedCategories,
    selectedBrand,
    setSelectedBrand,
    upSells,
    setUpSells,
    crossSells,
    setCrossSells,
    attributes,
    setAttributes,
    variations,
    setVariations,
    handleSubmit,
    isSubmitting,
    watch,
  } = useProductSubmit(id, { onSuccess, isPage, duplicateFrom });

  const { data: categories } = useAsync(
    ProductCategoryServices.getShowingCategories
  );

  const { data: tagsData } = useAsync(() =>
    ProductTagServices.getAllProductTags({ status: "active" })
  );

  // only active brands are offered on the product form
  const { data: brandsData } = useAsync(() =>
    BrandServices.getAllBrands({ status: "true", limit: 200 })
  );

  // local, editable copy of the category list so newly added ones show at once
  const [categoryList, setCategoryList] = useState([]);
  // same for tags (getAllProductTags returns { tags, totalDoc, ... })
  const [tagList, setTagList] = useState([]);
  // same for brands (getAllBrands returns { brands, totalDoc, ... })
  const [brandList, setBrandList] = useState([]);

  useEffect(() => {
    if (Array.isArray(categories)) setCategoryList(categories);
  }, [categories]);

  useEffect(() => {
    if (Array.isArray(tagsData?.tags)) setTagList(tagsData.tags);
  }, [tagsData]);

  useEffect(() => {
    if (Array.isArray(brandsData?.brands)) setBrandList(brandsData.brands);
  }, [brandsData]);

  // load Poppins once (design font)
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="block">
      {/* Page title */}
      <div className="px-8 pt-8 pb-2">
        <h1 style={{ fontSize: 36, fontWeight: 700, color: C.textPrimary }}>
          {duplicateFrom
            ? t("productForm.duplicateProduct")
            : id
              ? t("productForm.updateProduct")
              : t("productForm.addProduct")}
        </h1>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 p-6 xl:p-8">
        {/* =============== MAIN COLUMN =============== */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Product Name */}
          <div>
            <input
              {...register("productName", {
                required: t("productForm.productNameRequired"),
              })}
              // this input has no label to hang the asterisk off, so the
              // required marker rides along with the placeholder
              placeholder={`${t("productForm.productNamePlaceholder")} *`}
              style={{
                width: "100%",
                height: 60,
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                padding: "0 18px",
                fontSize: 18,
                fontWeight: 500,
                color: C.textPrimary,
                background: "var(--wc-card)",
                outline: "none",
              }}
            />
            <Error errorName={errors.productName} />
          </div>

          {/* Product Description Editor */}
          <div style={{ ...cardStyle, borderRadius: 10, overflow: "hidden" }}>
            <EditorToolbar height={50} />
            <textarea
              {...register("description")}
              placeholder={t("productForm.descriptionPlaceholder")}
              style={{
                width: "100%",
                height: 450 - 50,
                padding: 20,
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 14,
                color: C.textPrimary,
                background: "var(--wc-card)",
              }}
            />
          </div>

          {/* Product Data Card */}
          <ProductData
            register={register}
            errors={errors}
            watch={watch}
            currentId={id}
            upSells={upSells}
            setUpSells={setUpSells}
            crossSells={crossSells}
            setCrossSells={setCrossSells}
            attributes={attributes}
            setAttributes={setAttributes}
            variations={variations}
            setVariations={setVariations}
          />

          {/* Product Short Description */}
          <div style={{ ...cardStyle, borderRadius: 10, overflow: "hidden" }}>
            <div
              className="px-4 py-2"
              style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}
            >
              {t("productForm.shortDescription")}
            </div>
            <EditorToolbar height={45} />
            <textarea
              {...register("shortDescription")}
              placeholder={t("productForm.shortDescriptionPlaceholder")}
              style={{
                width: "100%",
                height: 220 - 45 - 36,
                padding: 20,
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 14,
                color: C.textPrimary,
                background: "var(--wc-card)",
              }}
            />
          </div>
        </div>

        {/* =============== RIGHT SIDEBAR =============== */}
        <div className="flex-shrink-0 flex flex-col gap-6" style={{ width: 300 }}>
          {/* Publish Card */}
          <Publish
            register={register}
            toggleDrawer={onCancel}
            isSubmitting={isSubmitting}
            id={id}
          />

          {/* Categories Card */}
          <Categories
            categoryList={categoryList}
            setCategoryList={setCategoryList}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />

          {/* Brands Card */}
          <Brands
            brandList={brandList}
            setBrandList={setBrandList}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
          />

          {/* Tags Card */}
          <Tags
            tagList={tagList}
            setTagList={setTagList}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
          />

          {/* Product Image + Gallery Cards */}
          <ProductImage
            mainImage={mainImage}
            setMainImage={setMainImage}
            extraGallery={extraGallery}
            setExtraGallery={setExtraGallery}
          />
        </div>
      </div>
    </form>
  );
};

export default React.memo(ProductForm);
