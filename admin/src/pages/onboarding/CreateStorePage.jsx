import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useHistory } from "react-router-dom";

import { useTranslation } from "react-i18next";

import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import Error from "@/components/form/others/Error";
import StoreServices from "@/services/StoreServices";
import { useStoreContext } from "@/context/StoreContext";
import { invalidateAuthorizationContext } from "@/hooks/useAuthorizationContext";
import { Button } from "@sofia/ui";

// SO-13/SO-04: the one-field-minimum onboarding form for a user's first
// store â€” storeService.createStore on the backend only requires `name`,
// resolves the caller themselves as the owner, and atomically provisions
// the Subscription/UserStore/store-owner role in one transaction, so there
// is nothing else this form has to orchestrate client-side.
const CreateStorePage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { selectStore, refreshStores } = useStoreContext() || {};
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ name, category, address }) => {
    setSubmitError("");
    setLoading(true);
    try {
      const store = await StoreServices.addStore({ name, category, address });

      // The store was just created with the caller as its owner and an
      // active UserStore already in place (SO-04) â€” select it explicitly
      // rather than waiting on the store list to refetch and auto-pick it,
      // so the redirect below lands in the right store immediately.
      if (selectStore && store?._id) {
        await selectStore(store._id);
      }
      if (refreshStores) {
        await refreshStores();
      }
      invalidateAuthorizationContext();

      history.push("/dashboard");
    } catch (err) {
      const rawMessage = err?.response?.data?.message || err?.message || "";
      const message = rawMessage.includes("platform.store.create")
        ? t(
            "OnlyOneStorePerOwner",
            "You've already created your one free store. Creating additional stores requires approval from a platform administrator â€” please contact support."
          )
        : rawMessage || t("SomethingWentWrong", "Something went wrong. Please try again.");
      setSubmitError(message);
    } finally {
      setLoading(false);
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

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("CreateStore")}</h2>
          <p className="text-sm text-slate-500">
            {t(
              "CreateStoreOnboardingSubtitle",
              "Give your store a name to get started. You can fill in the rest later."
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <LabelArea label={t("StoreName", "Store name")} />
            <InputArea
              required={true}
              register={register}
              label={t("StoreName", "Store name")}
              name="name"
              type="text"
              placeholder={t("StoreNamePlaceholder", "My Store")}
              className="bg-slate-50 border-slate-200"
            />
            <Error errorName={errors.name} />
          </div>

          <div>
            <LabelArea label={t("Category", "Category")} />
            <InputArea
              register={register}
              label={t("Category", "Category")}
              name="category"
              type="text"
              placeholder={t("CategoryPlaceholder", "Fashion, Electronics, ...")}
              className="bg-slate-50 border-slate-200"
            />
          </div>

          <div>
            <LabelArea label={t("Address", "Address")} />
            <InputArea
              register={register}
              label={t("Address", "Address")}
              name="address"
              type="text"
              placeholder={t("AddressPlaceholder", "Optional")}
              className="bg-slate-50 border-slate-200"
            />
          </div>

          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

          <Button
            disabled={loading}
            type="submit"
            className="mt-4 h-12 w-full bg-emerald-700 text-white rounded-2xl hover:bg-emerald-600"
          >
            {loading ? t("Loading", "Please wait...") : t("CreateStore")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateStorePage;
