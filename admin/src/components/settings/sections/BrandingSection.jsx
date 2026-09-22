//internal import
import InputAreaTwo from "@/components/form/input/InputAreaTwo";
import Uploader from "@/components/image-uploader/Uploader";

const BrandingSection = ({
  register,
  siteLogoDark,
  setSiteLogoDark,
  siteLogoLight,
  setSiteLogoLight,
  invoiceLogo,
  setInvoiceLogo,
  faviconUrl,
  setFaviconUrl,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Branding & Identity</h3>
          <a
            href="https://sofiagen-documentation.netlify.app/backend-configuration#branding--identity"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
          >
            <span>Docs</span>
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload your brand logos, favicon, and site description.
        </p>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Site Logo (Dark)
        </label>
        <div className="sm:col-span-3">
          <Uploader
            imageUrl={siteLogoDark}
            setImageUrl={setSiteLogoDark}
            folder="branding"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Site Logo (Light)
        </label>
        <div className="sm:col-span-3">
          <Uploader
            imageUrl={siteLogoLight}
            setImageUrl={setSiteLogoLight}
            folder="branding"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Invoice Logo
        </label>
        <div className="sm:col-span-3">
          <Uploader
            imageUrl={invoiceLogo}
            setImageUrl={setInvoiceLogo}
            folder="branding"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Favicon
        </label>
        <div className="sm:col-span-3">
          <Uploader
            imageUrl={faviconUrl}
            setImageUrl={setFaviconUrl}
            folder="branding"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Site Description
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label="Site Description"
            name="site_description"
            type="text"
            placeholder="A short description of your store"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Copyright Text
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label="Copyright Text"
            name="copyright_text"
            type="text"
            placeholder=" 2026 Your Company. All rights reserved."
          />
        </div>
      </div>
    </div>
  );
};

export default BrandingSection;
