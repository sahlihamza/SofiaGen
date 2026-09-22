import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import ProductServices from "@/services/ProductServices";
import ProductAttributeServices from "@/services/ProductAttributeServices";
import ProductTagRelationServices from "@/services/ProductTagRelationServices";
import ProductVariationServices from "@/services/ProductVariationServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { buildGalleryPayload, getGalleryImages } from "@/utils/gallery";
import { toVariationPayload } from "@/utils/variationPayload";

// Map the UI attribute blocks to the ProductAttribute link payload.
// Attributes are no longer embedded in the product: they live in the
// many-to-many ProductAttribute table. Only blocks linked to a global
// attribute (with an id) can be persisted.
const buildProductAttributesPayload = (attributes) =>
  attributes
    .filter((a) => a.attribute)
    .map((a) => ({
      attribute: a.attribute,
      values: (a.values || []).filter(Boolean),
      isVisible: a.visible !== false,
      usedForVariation: Boolean(a.usedForVariations),
    }));

// Keep only strictly positive numbers, otherwise send undefined so the
// backend stores nothing (matches the "positive values only" acceptance rule).
const toPositiveNumber = (value) => {
  if (value === "" || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const useProductSubmit = (id, options = {}) => {
  // onSuccess: optional callback fired after a successful add/update.
  // Used by the full-page Add/Edit Product forms to redirect back to the list.
  // When omitted, the drawer keeps its default behaviour (just close).
  // isPage: true when rendered on a full page (Add/Edit Product) instead of the
  // drawer. On a page there is no drawer to gate on, so we load by id directly.
  // duplicateFrom: a source product id. Its data is loaded into the form, but no
  // updatedId is set, so submitting runs the "add" path and creates a new
  // product while the original stays untouched.
  const { onSuccess, isPage, duplicateFrom } = options;
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);

  // Images: everything is persisted in the productGallery array.
  // mainImage is index 0 (also mirrored into productImage for thumbnails).
  const [mainImage, setMainImage] = useState(""); // productGallery[0]
  const [extraGallery, setExtraGallery] = useState([]); // productGallery[1..]

  // Tags + category are managed as state (selectable list UI).
  // Tags now live in the many-to-many ProductTagRelation table, so this holds
  // the selected ProductTag ids (not free-text strings).
  const [selectedTags, setSelectedTags] = useState([]);
  // A product can belong to several categories: this holds their ids only.
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");

  // Linked products (arrays of product ObjectIds)
  const [upSells, setUpSells] = useState([]); // higher-range recommended products
  const [crossSells, setCrossSells] = useState([]); // complementary products

  // Product attributes (color, size, material...) saved with the product
  const [attributes, setAttributes] = useState([]);

  // Variations of a variable product. While editing, the Variations tab
  // persists each variation on its own. While adding a brand-new product there
  // is no product id yet, so variations are generated/buffered here and saved
  // in one bulk call right after the product is created (see onSubmit).
  const [variations, setVariations] = useState([]);

  const [updatedId, setUpdatedId] = useState(id);
  const [resData, setResData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const regularPrice = Number(data.regularPrice) || 0;
      const salePrice = Number(data.salePrice) || 0;

      if (salePrice > 0 && salePrice > regularPrice) {
        setIsSubmitting(false);
        return notifyError(
          "Sale Price must be less than or equal to the regular price!"
        );
      }

      const productGallery = buildGalleryPayload(mainImage, extraGallery);

      const productData = {
        productName: data.productName,
        description: data.description || "",
        shortDescription: data.shortDescription || "",
        // only ids are persisted  the backend mirrors the first one into the
        // legacy `productCategory` field
        productCategories: selectedCategories,
        brand: selectedBrand || undefined,
        productType: data.productType || "simple",
        taxStatus: data.taxStatus || "taxable",
        taxClass: data.taxClass || "standard",
        productImage: mainImage || "",
        productGallery,
        // NOTE: tags are no longer embedded on the product. They are saved
        // separately through the ProductTagRelation API below.
        status: data.status || "draft",
        visibility: data.visibility || "public",
        regularPrice,
        salePrice,
        // Sale schedule  both bounds optional. null clears a previously set
        // date instead of leaving the old one on the record.
        saleStart: data.saleStart || null,
        saleEnd: data.saleEnd || null,
        virtual: Boolean(data.virtual),
        downloadable: Boolean(data.downloadable),
        publishDate: data.publishDate || undefined,
        // Inventory
        sku: data.sku || "",
        manageStock: Boolean(data.manageStock),
        stockQuantity:
          data.stockQuantity === "" || data.stockQuantity == null
            ? undefined
            : Number(data.stockQuantity),
        stockStatus: data.stockStatus || "instock",
        allowBackorders: data.allowBackorders || "no",
        lowStockThreshold:
          data.lowStockThreshold === "" || data.lowStockThreshold == null
            ? undefined
            : Number(data.lowStockThreshold),
        soldIndividually: Boolean(data.soldIndividually),
        // Shipping
        weight: toPositiveNumber(data.weight),
        dimensions: {
          length: toPositiveNumber(data.dimensions?.length),
          width: toPositiveNumber(data.dimensions?.width),
          height: toPositiveNumber(data.dimensions?.height),
        },
        shippingClassId: data.shippingClassId || null,
        // Advanced
        purchaseNote: data.purchaseNote || "",
        enableReviews: data.enableReviews !== false,
        menuOrder:
          data.menuOrder === "" || data.menuOrder == null
            ? 0
            : Number(data.menuOrder),
        // Linked products
        upSells,
        crossSells,
        // NOTE: attributes are no longer part of the product payload.
        // They are saved separately through the ProductAttribute API below.
      };

      // Product-attribute links (replace the whole set for this product)
      const attributesPayload = buildProductAttributesPayload(attributes);

      let productId = updatedId;

      if (updatedId) {
        const res = await ProductServices.updateProduct(updatedId, productData);
        productId = res?._id || res?.data?._id || updatedId;
        await ProductAttributeServices.updateProductAttributes(productId, {
          attributes: attributesPayload,
        });
        await ProductTagRelationServices.setProductTags(productId, selectedTags);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res?.message || "Product updated successfully!");
        if (onSuccess) onSuccess();
        else closeDrawer();
      } else {
        const res = await ProductServices.addProduct(productData);
        productId = res?._id || res?.data?._id;
        if (productId) {
          await ProductAttributeServices.updateProductAttributes(productId, {
            attributes: attributesPayload,
          });
          await ProductTagRelationServices.setProductTags(
            productId,
            selectedTags
          );
          // Persist any variations generated while the product was being added.
          // Only for variable products, and only variations not already saved.
          //
          // This step reports on its own rather than through the outer catch:
          // the product is already created at this point, so a failure here
          // must not read as "the product was not added"  the user would
          // submit again and end up with a duplicate.
          if (data.productType === "variable") {
            const pendingVariations = variations.filter((v) => !v._id);
            if (pendingVariations.length) {
              try {
                await ProductVariationServices.setProductVariations(productId, {
                  // The id is in the URL, and stamped on every item as well:
                  // a backend that validates it per variation rejects the whole
                  // batch otherwise, and not one variation gets through.
                  variations: pendingVariations.map((v) =>
                    toVariationPayload(v, productId)
                  ),
                });
              } catch (varErr) {
                notifyError(
                  `Product created, but its variations could not be saved: ${
                    varErr?.response?.data?.message || varErr?.message
                  }  open the product to add them from the Variations tab.`
                );
              }
            }
          }
        }
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess("Product Added Successfully!");
        if (onSuccess) onSuccess();
        else closeDrawer();
      }
    } catch (err) {
      setIsSubmitting(false);
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    // Reset the form to its default (empty) state.
    const resetForm = () => {
      setValue("productName", "");
      setValue("description", "");
      setValue("shortDescription", "");
      setValue("productType", "simple");
      setValue("taxStatus", "taxable");
      setValue("taxClass", "standard");
      setValue("status", "draft");
      setValue("visibility", "public");
      setValue("regularPrice", 0);
      setValue("salePrice", 0);
      setValue("saleStart", "");
      setValue("saleEnd", "");
      setValue("virtual", false);
      setValue("downloadable", false);
      setValue("publishDate", "");
      setValue("sku", "");
      setValue("manageStock", false);
      setValue("stockQuantity", 0);
      setValue("stockStatus", "instock");
      setValue("allowBackorders", "no");
      setValue("lowStockThreshold", "");
      setValue("soldIndividually", false);
      setValue("weight", "");
      setValue("dimensions.length", "");
      setValue("dimensions.width", "");
      setValue("dimensions.height", "");
      setValue("shippingClassId", "");
      setValue("purchaseNote", "");
      setValue("enableReviews", true);
      setValue("menuOrder", 0);
      clearErrors();

      setMainImage("");
      setExtraGallery([]);
      setSelectedTags([]);
      setSelectedCategories([]);
      setSelectedBrand("");
      setUpSells([]);
      setCrossSells([]);
      setAttributes([]);
      setVariations([]);
      setResData({});
      setUpdatedId(id);
      setIsSubmitting(false);
    };

    // Load an existing product into the form. In edit mode updatedId is set so
    // the submit updates that record. In duplicate mode (isDuplicate) it is left
    // empty on purpose: the same field values are pre-filled, but submitting
    // creates a brand new product instead of overwriting the source.
    const loadProduct = async (pid, isDuplicate = false) => {
      try {
        const res = await ProductServices.getProductById(pid);
        if (res) {
          setResData(isDuplicate ? {} : res);
          if (!isDuplicate) setUpdatedId(res._id);
          setValue("productName", res.productName);
          setValue("description", res.description);
          setValue("shortDescription", res.shortDescription || "");
          setValue("productType", res.productType || "simple");
          setValue("taxStatus", res.taxStatus || "taxable");
          setValue("taxClass", res.taxClass || "standard");
          setValue("status", res.status || "draft");
          setValue("visibility", res.visibility || "public");
          setValue("regularPrice", res.regularPrice ?? 0);
          setValue("salePrice", res.salePrice ?? 0);
          // the API returns full ISO timestamps; the date inputs want the day
          setValue("saleStart", res.saleStart?.substring(0, 10) || "");
          setValue("saleEnd", res.saleEnd?.substring(0, 10) || "");
          setValue("virtual", Boolean(res.virtual));
          setValue("downloadable", Boolean(res.downloadable));
          setValue(
            "publishDate",
            res.publishDate ? res.publishDate.substring(0, 10) : ""
          );
          setValue("sku", res.sku || "");
          setValue("manageStock", Boolean(res.manageStock));
          setValue("stockQuantity", res.stockQuantity ?? 0);
          setValue("stockStatus", res.stockStatus || "instock");
          setValue("allowBackorders", res.allowBackorders || "no");
          setValue("lowStockThreshold", res.lowStockThreshold ?? "");
          setValue("soldIndividually", Boolean(res.soldIndividually));
          setValue("weight", res.weight ?? "");
          setValue("dimensions.length", res.dimensions?.length ?? "");
          setValue("dimensions.width", res.dimensions?.width ?? "");
          setValue("dimensions.height", res.dimensions?.height ?? "");
          setValue(
            "shippingClassId",
            res.shippingClassId?._id || res.shippingClassId || ""
          );
          setValue("purchaseNote", res.purchaseNote || "");
          setValue("enableReviews", res.enableReviews !== false);
          setValue("menuOrder", res.menuOrder ?? 0);

          // productCategories may arrive populated; fall back to the legacy
          // single field for products saved before multi-category.
          const categoryIds = Array.isArray(res.productCategories)
            ? res.productCategories.map((c) => String(c?._id || c))
            : [];
          const legacyId = res.productCategory?._id || res.productCategory;
          setSelectedCategories(
            categoryIds.length
              ? categoryIds
              : legacyId
                ? [String(legacyId)]
                : []
          );
          setSelectedBrand(res.brand?._id || res.brand || "");
          setUpSells(
            Array.isArray(res.upSells) ? res.upSells.map((p) => p?._id || p) : []
          );
          setCrossSells(
            Array.isArray(res.crossSells)
              ? res.crossSells.map((p) => p?._id || p)
              : []
          );
          // Attributes now live in the ProductAttribute table, fetched apart.
          try {
            const productAttributes =
              await ProductAttributeServices.getProductAttributes(res._id);
            const links = Array.isArray(productAttributes)
              ? productAttributes
              : productAttributes?.data || [];
            setAttributes(
              links.map((pa, i) => ({
                uid: pa._id || `attr-${i}-${Date.now()}`,
                linkId: pa._id,
                attribute: pa.attribute?._id || pa.attribute || null,
                name: pa.attribute?.name || "",
                values: Array.isArray(pa.values) ? pa.values : [],
                visible: pa.isVisible !== false,
                usedForVariations: Boolean(pa.usedForVariation),
              }))
            );
          } catch (attrErr) {
            notifyError(attrErr?.response?.data?.message || attrErr?.message);
          }

          // Tags also live in the ProductTagRelation table. Each relation is
          // { _id, productId, tagId } with tagId populated to a ProductTag.
          try {
            const tagLinks =
              await ProductTagRelationServices.getTagsByProduct(res._id);
            const links = Array.isArray(tagLinks)
              ? tagLinks
              : tagLinks?.data || [];
            setSelectedTags(
              links.map((l) => l.tagId?._id || l.tagId).filter(Boolean)
            );
          } catch (tagErr) {
            notifyError(tagErr?.response?.data?.message || tagErr?.message);
          }

          // seed images: gallery[0] is the main image, the rest are extras.
          // productGallery may be strings (legacy) or GalleryProduct objects,
          // so normalize it to plain URL strings first.
          const gallery = getGalleryImages(res.productGallery);
          const main = gallery[0] || res.productImage || "";
          setMainImage(main);
          setExtraGallery(gallery.slice(1));
        }
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      }
    };

    // Full-page mode (Add/Edit/Duplicate Product): there is no drawer to gate
    // on, so load directly. Duplicate pre-fills from the source without binding
    // to it; edit loads by id; add starts from a fresh form.
    if (isPage) {
      if (duplicateFrom) {
        resetForm();
        loadProduct(duplicateFrom, true);
      } else if (id) loadProduct(id);
      else resetForm();
      return;
    }

    // Drawer mode: reset when the drawer is closed, load when it opens for edit.
    if (!isDrawerOpen) {
      resetForm();
      return;
    }
    if (id) loadProduct(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, duplicateFrom, setValue, isDrawerOpen, isPage, clearErrors]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    watch,
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
    isSubmitting,
    resData,
  };
};

export default useProductSubmit;
