import React from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";

//internal import
import Error from "@/components/form/others/Error";
import Title from "@/components/form/others/Title";
import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import Uploader from "@/components/image-uploader/Uploader";
import useAttributeValueSubmit from "@/hooks/useAttributeValueSubmit";

// Add / edit a single value (a "term") that belongs to `attributeId`.
const AttributeValueDrawer = ({ attributeId, id }) => {
  const {
    handleSubmit,
    onSubmit,
    register,
    errors,
    imageUrl,
    setImageUrl,
    isSubmitting,
  } = useAttributeValueSubmit(attributeId, id);

  const { t } = useTranslation();

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title title={t("UpdateValue")} description={t("UpdateValueDesc")} />
        ) : (
          <Title title={t("AddValue")} description={t("AddValueDesc")} />
        )}
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label="Label" required />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  required={true}
                  register={register}
                  label="Label"
                  name="label"
                  type="text"
                  placeholder="Red, Small, Cotton, ..."
                />
                <Error errorName={errors.label} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label="Slug" />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  register={register}
                  label="Slug"
                  name="slug"
                  type="text"
                  placeholder="red, small, ... (auto si vide)"
                />
                <Error errorName={errors.slug} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label="Value" />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  register={register}
                  label="Value"
                  name="value"
                  type="text"
                  placeholder="Optional raw value (e.g. #FF0000, XL)"
                />
                <Error errorName={errors.value} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label="Color" />
              <div className="col-span-8 sm:col-span-4">
                <input
                  {...register("color")}
                  type="color"
                  className="h-12 w-16 p-1 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label="Image" />
              <div className="col-span-8 sm:col-span-4">
                <Uploader
                  imageUrl={imageUrl}
                  setImageUrl={setImageUrl}
                  folder="attribute"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label="Sort order" />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  register={register}
                  label="Sort order"
                  name="sortOrder"
                  type="number"
                  placeholder="0"
                />
                <Error errorName={errors.sortOrder} />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title="Value" isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default AttributeValueDrawer;
