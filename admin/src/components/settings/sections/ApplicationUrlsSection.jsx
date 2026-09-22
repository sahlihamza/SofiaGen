//internal import
import InputAreaTwo from "@/components/form/input/InputAreaTwo";

const ApplicationUrlsSection = ({ register }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Application URLs</h3>
          <a
            href="https://sofiagen-documentation.netlify.app/backend-configuration#application-urls"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
          >
            <span>Docs</span>
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Set the live URLs for your store and admin dashboard.
        </p>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Store URL
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="Store URL" name="store_url" type="text" placeholder="https://your-store.com" />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Admin URL
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="Admin URL" name="admin_url" type="text" placeholder="https://your-admin.com" />
        </div>
      </div>
    </div>
  );
};

export default ApplicationUrlsSection;
