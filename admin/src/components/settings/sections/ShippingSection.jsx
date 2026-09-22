import { useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import ShippingZonesSection from "./ShippingZonesSection";
import ShippingClassesSection from "./ShippingClassesSection";
import ShippingSettingsSection from "./ShippingSettingsSection";
import LocalPickupSection from "./LocalPickupSection";
import { Button } from "@sofia/ui";

const SUB_TABS = [
  { id: "zones", label: "ShippingZonesSubTab", available: true },
  { id: "settings", label: "ShippingSettingsSubTab", available: true },
  { id: "classes", label: "ShippingClassesSubTab", available: true },
  { id: "local-pickup", label: "ShippingLocalPickupSubTab", available: true },
];

const ShippingSection = ({ countries, ...zoneProps }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS[0].id);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-gray-200 pb-2 dark:border-gray-700">
        {SUB_TABS.map((subTab, index) => (
          <div key={subTab.id} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
            )}
            <Button
              type="button"
              disabled={!subTab.available}
              onClick={() => subTab.available && setActiveSubTab(subTab.id)}
              className={`text-sm font-medium transition ${
                !subTab.available
                  ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                  : activeSubTab === subTab.id
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
              }`}
              title={!subTab.available ? t("ShippingComingSoon") : undefined}
            >
              {t(subTab.label)}
            </Button>
          </div>
        ))}
      </div>

      {activeSubTab === "zones" && (
        <ShippingZonesSection countries={countries} {...zoneProps} />
      )}

      {activeSubTab === "classes" && <ShippingClassesSection />}

      {activeSubTab === "settings" && <ShippingSettingsSection />}

      {activeSubTab === "local-pickup" && <LocalPickupSection countries={countries} />}
    </div>
  );
};

export default ShippingSection;
