import { Select } from "@windmill/react-ui";
import React, { useMemo } from "react";
import Scrollbars from "react-custom-scrollbars-2";
import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import Title from "@/components/form/others/Title";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import useCategorySubmit from "@/hooks/useCategorySubmit";
import DrawerButton from "@/components/form/button/DrawerButton";
import { buildCategoryOptions } from "@/utils/categoryTree";

const CategoryDrawer = ({ id, data }) => {
  const { t } = useTranslation();

  const {
    register,
    onSubmit,
    handleSubmit,
    errors,
    parentId,
    setParentId,
    published,
    setPublished,
    isSubmitting,
  } = useCategorySubmit(id);

  // A category may be neither its own parent nor a child of one of its own
  // descendants  that would detach the branch from the tree (A -> B -> A).
  // Passing the edited id drops its whole subtree from the options.
  const parentOptions = useMemo(
    () => buildCategoryOptions(data || [], id),
    [data, id]
  );

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("UpdateCategory") : t("AddCategoryTitle")}
          description={
            id ? t("UpdateCategoryDescription") : t("AddCategoryDescription")
          }
        />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("Name")} required />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  required={true}
                  register={register}
                  label="Category title"
                  name="name"
                  type="text"
                  placeholder={t("ParentCategoryPlaceholder")}
                />
                <Error errorName={errors.name} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CatTbSlug")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  register={register}
                  label="Slug"
                  name="slug"
                  type="text"
                  placeholder={t("CategorySlugPlaceholder")}
                />
                <Error errorName={errors.slug} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("ParentCategory")} />
              <div className="col-span-8 sm:col-span-4">
                <Select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">{t("NoParentCategory")}</option>
                  {parentOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {/* nbsp indentation: <option> ignores CSS padding */}
                      {"   ".repeat(o.depth)}
                      {o.depth > 0 ? " " : ""}
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("Published")} />
              <div className="col-span-8 sm:col-span-4">
                <SwitchToggle
                  handleProcess={setPublished}
                  processOption={published}
                />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title="Category" isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default CategoryDrawer;
