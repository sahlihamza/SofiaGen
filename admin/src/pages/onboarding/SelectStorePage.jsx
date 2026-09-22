import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar } from "@windmill/react-ui";
import { FiCheck, FiShoppingBag } from "react-icons/fi";

import { useStoreContext } from "@/context/StoreContext";
import PageSpinner from "@/components/theme/PageSpinner";
import { getLogoUrl } from "@/utils/getLogoUrl";
import { Button } from "@sofia/ui";

// SO-13: an explicit "pick which store" screen â€” separate from the header
// dropdown's silent auto-select-the-first-one behavior (StoreContext keeps
// that as-is for the normal day-to-day case). This page is for a deliberate
// switch: reachable from the header, or as a fallback if a user somehow has
// stores but no current one selected.
const SelectStorePage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { stores, currentStoreId, selectStore, loading } = useStoreContext() || {};
  const [selectingId, setSelectingId] = useState(null);
  const [error, setError] = useState("");

  if (loading && !stores?.length) {
    return <PageSpinner />;
  }

  const handleSelect = async (storeId) => {
    setError("");
    setSelectingId(storeId);
    try {
      await selectStore(storeId);
      history.push("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("SomethingWentWrong", "Something went wrong. Please try again.")
      );
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 md:p-10">
        <div className="flex items-center gap-2 mb-8">
          <span
            className="material-symbols-outlined text-emerald-700 text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            dataset
          </span>
          <span className="text-2xl font-semibold tracking-tighter">SofiaGen</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("SelectStore")}</h2>
          <p className="text-sm text-slate-500">
            {t("SelectStoreSubtitle", "Choose which store you want to work in.")}
          </p>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {(stores || []).map((store) => (
            <li key={store._id}>
              <Button
                type="button"
                disabled={selectingId === store._id}
                onClick={() => handleSelect(store._id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="flex items-center gap-3 min-w-0">
                  {store.logo ? (
                    <Avatar
                      className="w-8 h-8 flex-shrink-0 bg-slate-50 border border-slate-200"
                      src={getLogoUrl(store.logo)}
                      alt={store.name}
                    />
                  ) : (
                    <span className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center">
                      <FiShoppingBag className="w-4 h-4 text-slate-400" />
                    </span>
                  )}
                  <span className="text-sm font-medium truncate">{store.name}</span>
                </span>
                {store._id === currentStoreId && (
                  <FiCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SelectStorePage;
