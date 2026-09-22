import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "@windmill/react-ui";
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";

const Payments = () => {
  const { t } = useTranslation();

  const heading = t("ComingSoonTitle", { defaultValue: "Bientît disponible" });
  const message = t("ComingSoonMessage", {
    defaultValue: "Cette fonctionnalité est actuellement en cours de développement.",
  });

  return (
    <>
      <PageTitle>{t("PaymentsPageTitle")}</PageTitle>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody>
            <div className="px-6 py-16 lg:py-20 h-screen flex flex-wrap content-center">
              <div className="block justify-items-stretch mx-auto items-center text-center">
                <h2 className="font-bold font-serif font-2xl lg:text-4xl leading-7 mb-4">
                  {heading}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {message}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default Payments;