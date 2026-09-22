import { Input, Select, Textarea } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";

//internal import
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import useSupportTicketSubmit from "@/hooks/useSupportTicketSubmit";
import DrawerButton from "@/components/form/button/DrawerButton";

// SFG-80 Phase 1 (frontend): no ticket-category management UI exists yet, so
// this select is a static placeholder list until that CRUD lands  swap for
// a live fetch (TicketCategoryServices) once it does.
const CATEGORY_OPTIONS = [];

const PRIORITIES = [
  { value: "low", label: "SupportTicketPriorityLow" },
  { value: "normal", label: "SupportTicketPriorityNormal" },
  { value: "high", label: "SupportTicketPriorityHigh" },
  { value: "critical", label: "SupportTicketPriorityCritical" },
];

const SupportTicketDrawer = () => {
  const { t } = useTranslation();
  const { register, handleSubmit, onSubmit, errors, isSubmitting } = useSupportTicketSubmit();

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={t("AddSupportTicket")}
          description={t("AddSupportTicketDescription")}
        />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("SupportTicketSubjectLabel")} required />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("subject", {
                    required: t("SupportTicketSubjectRequired"),
                    minLength: {
                      value: 10,
                      message: t("SupportTicketSubjectMinLength"),
                    },
                  })}
                  type="text"
                  name="subject"
                  placeholder={t("SupportTicketSubjectPlaceholder")}
                  className="mr-2 h-12 p-2"
                />
                <Error errorName={errors.subject} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("SupportTicketDescriptionLabel")} required />
              <div className="col-span-8 sm:col-span-4">
                <Textarea
                  {...register("description", {
                    required: t("SupportTicketDescriptionRequired"),
                    minLength: {
                      value: 50,
                      message: t("SupportTicketDescriptionMinLength"),
                    },
                  })}
                  name="description"
                  rows="6"
                  placeholder={t("SupportTicketDescriptionPlaceholder")}
                />
                <Error errorName={errors.description} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("SupportTicketCategoryLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Select {...register("categoryId")} name="categoryId">
                  <option value="">{t("SupportTicketCategoryNone")}</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("SupportTicketPriorityLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Select {...register("priority")} name="priority">
                  {PRIORITIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* TODO(SFG-80): attachments  no generic file uploader exists yet in
                this project (only the image-specific Uploader/UploaderThree
                components). Wire this up once one is available. */}
          </div>

          <DrawerButton title={t("SupportTicketspageTitle")} isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default SupportTicketDrawer;
