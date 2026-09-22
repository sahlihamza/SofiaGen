import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";

/**
 * useDrawerFormSubmit — factory that produces the standard

 * "edit-an-entity-in-a-drawer" hook shared by ~35 `use*Submit` hooks
 * (useCategorySubmit, useCurrencySubmit, useAttributeSubmit, etc.).
 *
 * Replaces the ~90-line boilerplate of:
 *   - useContext(SidebarContext) + useForm() + isSubmitting
 *   - onSubmit: if (id) update else add, with notifySuccess / notifyError
 *   - useEffect: clear form on drawer close, fetchById + setValue on open
 *
 * Usage:
 *   const useCurrencySubmit = (id) => useDrawerFormSubmit({
 *     id,
 *     services: CurrencyServices,
 *     add: "addCurrency",
 *     update: "updateCurrency",
 *     getById: "getCurrencyById",
 *     pickFields: (formValues) => ({ name: formValues.name, symbol: formValues.symbol }),
 *     toFormValues: (entity) => ({ name: entity.name, symbol: entity.symbol }),
 *     reset: ["name", "symbol"],
 *     successMessages: { add: "Currency added successfully!", update: "Currency updated successfully!" },
 *   });
 *
 * For hooks that need extra state (parentId, published, status, ...), just
 * keep that state outside the factory and pass a `transformPayload` that
 * injects it. The factory returns the full surface you need to wire the
 * form: `{ register, handleSubmit, onSubmit, errors, isSubmitting }`.
 *
 * @param {Object} opts
 * @param {string} [opts.id] - existing entity id; when present the hook enters update mode
 * @param {Object} opts.services - service module exposing add/update/getById
 * @param {string} opts.add - method name on `services` for create
 * @param {string} opts.update - method name on `services` for update
 * @param {string} opts.getById - method name on `services` to fetch by id
 * @param {Function} [opts.pickFields] - map react-hook-form values to the entity payload (defaults to identity)
 * @param {Function} [opts.toFormValues] - map fetched entity to form values for setValue
 * @param {string[]} [opts.reset] - field names to clear when the drawer closes (auto-detected if omitted)
 * @param {Object} [opts.successMessages] - { add, update } toast messages; defaults: "Item added!" / "Item updated!"
 * @param {Function} [opts.onAfterSubmit] - hook called after a successful save
 * @param {Function} [opts.transformPayload] - last transform applied to the payload (after pickFields); useful for adding extra state
 */
export const useDrawerFormSubmit = (opts) => {
  const {
    id,
    services,
    add,
    update,
    getById,
    pickFields = (v) => v,
    toFormValues = (e) => e || {},
    reset = [],
    successMessages = { add: "Item added successfully!", update: "Item updated successfully!" },
    onAfterSubmit,
    transformPayload,
  } = opts;

  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    reset: resetForm,
    formState: { errors },
  } = useForm();

  const onSubmit = async (formValues) => {
    try {
      setIsSubmitting(true);
      let payload = pickFields(formValues);
      if (transformPayload) payload = transformPayload(payload, formValues);

      let res;
      if (id) {
        res = await services[update](id, payload);
        notifySuccess(res?.message || successMessages.update);
      } else {
        res = await services[add](payload);
        notifySuccess(res?.message || successMessages.add);
      }

      setIsUpdate(true);
      setIsSubmitting(false);
      if (onAfterSubmit) onAfterSubmit(res, formValues);
      closeDrawer();
      resetForm();
    } catch (err) {
      setIsSubmitting(false);
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      for (const field of reset) setValue(field, "");
      for (const field of reset) clearErrors(field);
      return;
    }
    if (id && services[getById]) {
      (async () => {
        try {
          const res = await services[getById](id);
          if (res) {
            const formValues = toFormValues(res);
            for (const [k, v] of Object.entries(formValues)) {
              if (v !== undefined && v !== null) setValue(k, v);
            }
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isDrawerOpen, setValue, clearErrors]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    setValue,
    clearErrors,
    resetForm,
  };
};

export default useDrawerFormSubmit;
