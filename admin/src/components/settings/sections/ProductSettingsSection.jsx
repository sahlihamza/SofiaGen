import { Input } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import Uploader from "@/components/image-uploader/Uploader";
import { Button } from "@sofia/ui";

const ProductSettingsSection = ({
  register,
  errors,
  redirectToCartAfterAdd,
  setRedirectToCartAfterAdd,
  enableAjaxAddToCart,
  setEnableAjaxAddToCart,
  placeholderImage,
  setPlaceholderImage,
  enableReviews,
  setEnableReviews,
  showVerifiedOwnerBadge,
  setShowVerifiedOwnerBadge,
  reviewsRequireVerifiedOwner,
  setReviewsRequireVerifiedOwner,
  enableProductRatings,
  setEnableProductRatings,
  onSave,
  isSaving,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("ProductSettingsTitle")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("ProductSettingsDesc")}
          </p>
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-shrink-0 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t("Processing") : t("UpdateBtn")}
        </Button>
      </div>

      <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t("ShopPages")}
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("ShopPage")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <Input
            {...register("shop_page", {
              required: t("ShopPageRequired"),
            })}
            type="text"
            name="shop_page"
            placeholder={t("ShopPagePlaceholder")}
            autoComplete="new-password"
            className="mr-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
          <Error errorName={errors?.shop_page} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-3">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("AddToCartBehavior")}
        </label>
        <div className="sm:col-span-3">
          <SwitchToggle
            id="redirect-to-cart-after-add"
            processOption={redirectToCartAfterAdd}
            handleProcess={setRedirectToCartAfterAdd}
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {t("RedirectToCartAfterAdd")}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2" />
        <div className="sm:col-span-3">
          <SwitchToggle
            id="enable-ajax-add-to-cart"
            processOption={enableAjaxAddToCart}
            handleProcess={setEnableAjaxAddToCart}
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {t("EnableAjaxAddToCart")}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("PlaceholderImage")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <Uploader
            imageUrl={placeholderImage}
            setImageUrl={setPlaceholderImage}
            folder="product-settings"
          />
        </div>
      </div>

      <div className="mb-3 mt-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t("Reviews")}
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-3">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("EnableReviews")}
        </label>
        <div className="sm:col-span-3">
          <SwitchToggle
            id="enable-reviews"
            processOption={enableReviews}
            handleProcess={setEnableReviews}
          />
        </div>
      </div>

      <div
        style={{
          height: enableReviews ? "auto" : 0,
          transition: "all .6s",
          visibility: !enableReviews ? "hidden" : "visible",
          opacity: !enableReviews ? "0" : "1",
        }}
        className={`${enableReviews ? "mb-6" : "mb-2"}`}
      >
        <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-3">
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
            {t("ShowVerifiedOwnerBadge")}
          </label>
          <div className="sm:col-span-3">
            <SwitchToggle
              id="show-verified-owner-badge"
              processOption={showVerifiedOwnerBadge}
              handleProcess={setShowVerifiedOwnerBadge}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
            {t("ReviewsRequireVerifiedOwner")}
          </label>
          <div className="sm:col-span-3">
            <SwitchToggle
              id="reviews-require-verified-owner"
              processOption={reviewsRequireVerifiedOwner}
              handleProcess={setReviewsRequireVerifiedOwner}
            />
          </div>
        </div>
      </div>

      <div className="mb-3 mt-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t("ProductRatings")}
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("EnableProductRatings")}
        </label>
        <div className="sm:col-span-3">
          <SwitchToggle
            id="enable-product-ratings"
            processOption={enableProductRatings}
            handleProcess={setEnableProductRatings}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductSettingsSection;
