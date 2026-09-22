//internal import
import InputAreaTwo from "@/components/form/input/InputAreaTwo";

const SmsConfigSection = ({ register }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SMS / OTP Configuration</h3>
          <a
            href="https://sofiagen-documentation.netlify.app/backend-configuration#sms--phone-otp-configuration"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
          >
            <span>Docs</span>
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure phone verification and SMS sending. Choose a provider and enter your credentials.
        </p>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          App Name
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="App Name" name="app_name" type="text" placeholder="Sofiagen" />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          SMS Sender ID
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="SMS Sender ID" name="sms_sender_id" type="text" placeholder="Sofiagen" />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          SMS Provider
        </label>
        <div className="sm:col-span-3">
          <select
            {...register("sms_provider")}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="mock">Mock</option>
            <option value="twilio">Twilio</option>
            <option value="messagebird">MessageBird</option>
            <option value="vonage">Vonage</option>
            <option value="aws-sns">AWS SNS</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Provider Credentials
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="Provider Credentials" name="sms_credentials" type="text" placeholder="Enter provider-specific credentials" />
        </div>
      </div>
    </div>
  );
};

export default SmsConfigSection;
