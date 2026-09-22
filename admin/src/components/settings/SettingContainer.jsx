
import { FiSettings } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

//internal import

const SettingContainer = ({ isSave, title, children, isSubmitting, hideButton = false }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-12 font-sans pr-4">
      <div className="col-span-12 md:col-span-12 lg:col-span-12">
        {!hideButton && (
          <div className="sticky top-0 z-20 flex justify-end">
            {isSubmitting ? (
              <Button disabled={true} type="button" className="h-10 px-6">
                <LoadingSpinner alt="Loading" width={20} height={10} />
                <span className="font-serif ml-2 font-light">
                  {t("Processing")}
                </span>
              </Button>
            ) : (
              <Button type="submit" className="h-10 px-6 ">
                {isSave ? t("SaveBtn") : t("UpdateBtn")}
              </Button>
            )}
          </div>
        )}

        <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 md:mb-3 mb-1">
          <FiSettings className="mt-1 mr-2" />
          {title}
        </div>

        <hr className="md:mb-12 mb-3" />
        {children}
      </div>
    </div>
  );
};

export default SettingContainer;
