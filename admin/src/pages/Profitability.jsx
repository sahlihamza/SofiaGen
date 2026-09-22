import React from "react";
import { useTranslation } from "react-i18next";

import PageTitle from "@/components/Typography/PageTitle";
import ProfitabilityCalculator from "@/components/profitability/ProfitabilityCalculator";
import { useCurrency } from "@/hooks/useCurrency";

const Profitability = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle>{t("ProfitabilityCalculatorTitle", { defaultValue: "Calculateur de Rentabilité" })}</PageTitle>

      <p className="mb-6 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
        {t("ProfitabilityCalculatorDescription", {
          defaultValue:
            "Simulez la rentabilité d'une campagne ou d'un produit en ajustant les coûts, le prix de vente, les taux de confirmation et de livraison. Les résultats sont mis à jour automatiquement.",
        })}
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <ProfitabilityCalculator currency={currency} />
      </div>
    </div>
  );
};

export default Profitability;