import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import InputAreaTwo from "@/components/form/input/InputAreaTwo";

const ContactInfoSection = ({ register, errors }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contact Information</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Provide contact details for customer communication and support.
        </p>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("GlobalContactNumber")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label="Phone"
            name="contact"
            type="text"
            placeholder="Contact Number"
          />
          <Error errorName={errors.contact} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("FooterEmail")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label="Email"
            name="email"
            type="text"
            placeholder="Email"
          />
          <Error errorName={errors.email} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("WebSite")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label="Website"
            name="website"
            type="text"
            placeholder="Web Site"
          />
          <Error errorName={errors.website} />
        </div>
      </div>
    </div>
  );
};

export default ContactInfoSection;
