//internal import
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import SwitchToggle from "@/components/form/switch/SwitchToggle";

const InvoiceSettingsSection = ({ register, errors, enableInvoice, setEnableInvoice }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invoice Settings</h3>
          <a
            href="https://sofiagen-documentation.netlify.app/backend-configuration#invoice-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
          >
            <span>Docs</span>
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure invoice generation and email sending preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative">
        <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
          Enable Invoice Send to Customer by email
        </label>
        <div className="sm:col-span-3">
          <SwitchToggle
            id="enable-invoice"
            processOption={enableInvoice}
            handleProcess={setEnableInvoice}
          />
        </div>
      </div>

      <div
        style={{
          height: enableInvoice ? "auto" : 0,
          transition: "all .6s",
          visibility: !enableInvoice ? "hidden" : "visible",
          opacity: !enableInvoice ? "0" : "1",
        }}
        className={`${enableInvoice ? "mb-2" : "mb-2"}`}
      >
        <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
          <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
            From Email
          </label>
          <div className="sm:col-span-3">
            <InputArea
              required={enableInvoice}
              register={register}
              label="From Email"
              name="from_email"
              type="email"
              placeholder="Enter from email on custom invoice"
            />
            <Error errorName={errors.from_email} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSettingsSection;
