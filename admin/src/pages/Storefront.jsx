import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

const Storefront = () => {
  const { t } = useTranslation();
  const storeUrl = import.meta.env.VITE_APP_STORE_DOMAIN || "http://localhost:3000";

  useEffect(() => {
    window.location.href = storeUrl;
  }, [storeUrl]);

  return (
    <div className="mx-auto w-full">
      <p>{t("RedirectingToStore", { defaultValue: "Redirecting to store..." })}</p>
    </div>
  );
};

export default Storefront;
