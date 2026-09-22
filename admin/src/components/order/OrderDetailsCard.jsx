import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiRotateCcw, FiSave, FiShoppingBag, FiTrash2 } from "react-icons/fi";

//internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import OrderProductPicker from "@/components/order/OrderProductPicker";
import OrderCard, {
  OrderCardSection,
  fieldClass,
  labelClass,
  primaryButton,
  secondaryButton,
  tableHeadCell,
} from "@/components/order/OrderCard";
import { PAYMENT_METHOD_KEYS, getPaymentMethodLabel } from "@/utils/orderStatus";
import { lineNetTotal, lineTotal, previewAmounts } from "@/utils/orderAmounts";
import { Button } from "@sofia/ui";

const ADDRESS_FIELDS = [
  { name: "name", labelKey: "OrderAddressName" },
  { name: "email", labelKey: "OrderAddressEmail", type: "email" },
  { name: "contact", labelKey: "OrderAddressPhone" },
  { name: "company", labelKey: "OrderAddressCompany" },
  { name: "address", labelKey: "OrderAddressStreet", wide: true },
  { name: "zipCode", labelKey: "OrderAddressZip" },
  { name: "city", labelKey: "OrderAddressCity" },
  { name: "state", labelKey: "OrderAddressState" },
  { name: "country", labelKey: "OrderAddressCountry" },
];

const emptyAddress = () =>
  ADDRESS_FIELDS.reduce((address, { name }) => ({ ...address, [name]: "" }), {});

const toAddress = (info) =>
  ADDRESS_FIELDS.reduce(
    (address, { name }) => ({ ...address, [name]: info?.[name] ?? "" }),
    {}
  );

// The lines the API sent, as the form works with them: the amounts stay
// strings while they are being typed, so a half-erased price does not snap
// back to 0 under the cursor.
const toDraftLine = (item) => ({
  key: `${item.productId || "line"}-${item.variationId || ""}-${item._id || Math.random().toString(36).slice(2)}`,
  productId: item.productId || "",
  variationId: item.variationId || null,
  productName: item.productName || "",
  sku: item.sku || "",
  quantity: String(item.quantity ?? 1),
  unitPrice: String(item.unitPrice ?? 0),
  discount: String(item.discount ?? 0),
});

const seedDraft = (order) => ({
  lines: (order?.items || []).map(toDraftLine),
  shippingCost: String(order?.shippingCost ?? 0),
  paymentMethod: order?.paymentMethod || "",
  shipping: toAddress(order?.user_info),
  billing: toAddress(order?.billing_info || order?.user_info),
});

const AddressFields = ({ legend, value, onChange, disabled }) => {
  const { t } = useTranslation();

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold text-[#1d2327] dark:text-gray-200">
        {legend}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {ADDRESS_FIELDS.map(({ name, labelKey, type = "text", wide }) => (
          <div key={name} className={wide ? "sm:col-span-2" : ""}>
            <label className={labelClass} htmlFor={`${legend}-${name}`}>
              {t(labelKey)}
            </label>
            <input
              id={`${legend}-${name}`}
              type={type}
              value={value[name]}
              onChange={(e) => onChange(name, e.target.value)}
              className={fieldClass}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
};

const TotalRow = ({ label, hint, value, strong }) => (
  <div
    className={`flex items-start justify-between gap-6 py-2 text-sm ${
      strong ? "border-t border-[#dcdcde] pt-3 dark:border-gray-700" : ""
    }`}
  >
    <span
      className={
        strong
          ? "font-semibold text-[#1d2327] dark:text-gray-200"
          : "text-[#646970] dark:text-gray-400"
      }
    >
      {label}
      {hint && (
        <span className="mt-0.5 block text-xs text-[#8c8f94] dark:text-gray-500">
          {hint}
        </span>
      )}
    </span>
    <span
      className={`shrink-0 tabular-nums ${
        strong
          ? "text-lg font-bold text-[#1d2327] dark:text-gray-100"
          : "font-medium text-[#1d2327] dark:text-gray-300"
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * "DÃ©tails de la commande" â€” the lines, the amounts and the two addresses.
 *
 * The card owns its draft and is never re-seeded from props: the parent
 * remounts it (via `key`) once a save has come back. That is what lets a status
 * change or a new note refresh the order underneath without throwing away edits
 * that are still being typed.
 */
const OrderDetailsCard = ({ order, canUpdate = true, isSaving = false, onSave }) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();

  const [draft, setDraft] = useState(() => seedDraft(order));
  const [sameAsShipping, setSameAsShipping] = useState(
    () => order?.billingSameAsShipping !== false
  );

  const readOnly = !canUpdate || isSaving;

  const amounts = useMemo(
    () => previewAmounts(order, draft.lines, Number(draft.shippingCost) || 0),
    [order, draft.lines, draft.shippingCost]
  );

  const setLine = (key, field, value) =>
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.key === key ? { ...line, [field]: value } : line
      ),
    }));

  const removeLine = (key) =>
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.key !== key),
    }));

  const addLine = (product) =>
    setDraft((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        toDraftLine({ ...product, _id: `new-${prev.lines.length}` }),
      ],
    }));

  const setAddress = (which, field, value) =>
    setDraft((prev) => ({
      ...prev,
      [which]: { ...prev[which], [field]: value },
    }));

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      items: draft.lines.map((line) => ({
        productId: line.productId,
        variationId: line.variationId,
        productName: line.productName,
        sku: line.sku,
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        discount: Number(line.discount) || 0,
      })),
      shippingCost: Number(draft.shippingCost) || 0,
      paymentMethod: draft.paymentMethod,
      user_info: draft.shipping,
      billing_info: sameAsShipping ? draft.shipping : draft.billing,
    });
  };

  const amountInput = (value, onChange, extra = {}) => (
    <input
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      className={`${fieldClass} text-right tabular-nums`}
      {...extra}
    />
  );

  return (
    <form onSubmit={handleSubmit}>
      <OrderCard
        icon={<FiShoppingBag size={18} />}
        title={t("OrderDetailsTitle")}
        description={t("OrderDetailsDescription")}
        aside={
          canUpdate && <OrderProductPicker onPick={addLine} disabled={readOnly} />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="border-b border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
              <tr>
                <th scope="col" className={tableHeadCell}>
                  {t("OrderDetailsColProduct")}
                </th>
                <th scope="col" className={tableHeadCell}>
                  {t("OrderDetailsColSku")}
                </th>
                <th scope="col" className={`${tableHeadCell} text-right`}>
                  {t("OrderDetailsColPrice")}
                </th>
                <th scope="col" className={`${tableHeadCell} text-right`}>
                  {t("OrderDetailsColQuantity")}
                </th>
                <th scope="col" className={`${tableHeadCell} text-right`}>
                  {t("OrderDetailsColDiscount")}
                </th>
                <th scope="col" className={`${tableHeadCell} text-right`}>
                  {t("OrderDetailsColTotal")}
                </th>
                <th scope="col" className={`${tableHeadCell} text-right`}>
                  {t("OrderColActions")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f1] dark:divide-gray-700">
              {draft.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-[#8c8f94] dark:text-gray-500"
                  >
                    {t("OrderDetailsNoLines")}
                  </td>
                </tr>
              ) : (
                draft.lines.map((line) => (
                  <tr key={line.key}>
                    <td className="px-4 py-3 align-middle">
                      <span className="font-medium text-[#1d2327] dark:text-gray-200">
                        {line.productName}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-[#646970] dark:text-gray-400">
                      {line.sku || "â€”"}
                    </td>
                    <td className="w-32 px-4 py-3 align-middle">
                      {amountInput(line.unitPrice, (v) =>
                        setLine(line.key, "unitPrice", v)
                      )}
                    </td>
                    <td className="w-24 px-4 py-3 align-middle">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(e) =>
                          setLine(line.key, "quantity", e.target.value)
                        }
                        disabled={readOnly}
                        className={`${fieldClass} text-right tabular-nums`}
                      />
                    </td>
                    <td className="w-32 px-4 py-3 align-middle">
                      {amountInput(
                        line.discount,
                        (v) => setLine(line.key, "discount", v),
                        { max: lineTotal(line) }
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle font-semibold tabular-nums text-[#1d2327] dark:text-gray-200">
                      {currency}
                      {getNumberTwo(lineNetTotal(line))}
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={readOnly}
                        title={t("OrderDetailsRemoveLine")}
                        aria-label={`${t("OrderDetailsRemoveLine")} : ${line.productName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#646970] transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      >
                        <FiTrash2 size={15} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <OrderCardSection>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
              <div>
                <label className={labelClass} htmlFor="order-shipping-cost">
                  {t("OrderDetailsShippingCost")}
                </label>
                <input
                  id="order-shipping-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={draft.shippingCost}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, shippingCost: e.target.value }))
                  }
                  disabled={readOnly}
                  className={`${fieldClass} text-right tabular-nums`}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="order-payment-method">
                  {t("OrderDetailsPaymentMethod")}
                </label>
                <select
                  id="order-payment-method"
                  value={draft.paymentMethod}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value,
                    }))
                  }
                  disabled={readOnly}
                  className={`${fieldClass} cursor-pointer`}
                >
                  {/* An older order can hold a free-text method that is not a
                      gateway key â€” it stays selectable so saving the card
                      never silently changes how the order was paid. */}
                  {!PAYMENT_METHOD_KEYS.includes(draft.paymentMethod) &&
                    draft.paymentMethod && (
                      <option value={draft.paymentMethod}>
                        {getPaymentMethodLabel(draft.paymentMethod, t)}
                      </option>
                    )}
                  {PAYMENT_METHOD_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {getPaymentMethodLabel(key, t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full rounded-lg bg-[#f6f7f7] p-4 lg:max-w-sm dark:bg-gray-900/40">
              <TotalRow
                label={t("OrderDetailsSubTotal")}
                value={`${currency}${getNumberTwo(amounts.subTotal)}`}
              />
              <TotalRow
                label={t("OrderDetailsDiscount")}
                hint={t("OrderDetailsDiscountHint")}
                value={`âˆ’ ${currency}${getNumberTwo(amounts.discount)}`}
              />
              <TotalRow
                label={t("OrderDetailsShippingCost")}
                value={`${currency}${getNumberTwo(Number(draft.shippingCost) || 0)}`}
              />
              {amounts.tax > 0 && (
                <TotalRow
                  label={t("OrderDetailsTax")}
                  hint={t("OrderDetailsTaxHint")}
                  value={`${currency}${getNumberTwo(amounts.tax)}`}
                />
              )}
              <TotalRow
                strong
                label={t("OrderDetailsTotal")}
                value={`${currency}${getNumberTwo(amounts.total)}`}
              />
            </div>
          </div>
        </OrderCardSection>

        <OrderCardSection>
          <div className="grid gap-8 lg:grid-cols-2">
            <AddressFields
              legend={t("OrderDetailsShippingAddress")}
              value={draft.shipping}
              onChange={(field, value) => setAddress("shipping", field, value)}
              disabled={readOnly}
            />

            <div>
              <label className="mb-3 flex items-center gap-2 text-sm text-[#646970] dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => setSameAsShipping(e.target.checked)}
                  disabled={readOnly}
                  className="h-4 w-4 cursor-pointer rounded border-[#8c8f94] accent-[#2271b1] dark:border-gray-600"
                />
                {t("OrderDetailsSameAsShipping")}
              </label>

              {!sameAsShipping && (
                <AddressFields
                  legend={t("OrderDetailsBillingAddress")}
                  value={draft.billing}
                  onChange={(field, value) => setAddress("billing", field, value)}
                  disabled={readOnly}
                />
              )}
            </div>
          </div>
        </OrderCardSection>

        {canUpdate && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[#f0f0f1] bg-[#f6f7f7] px-5 py-4 dark:border-gray-700 dark:bg-gray-900/40">
            <Button
              type="button"
              onClick={() => {
                setDraft(seedDraft(order));
                setSameAsShipping(order?.billingSameAsShipping !== false);
              }}
              disabled={isSaving}
              className={secondaryButton}
            >
              <FiRotateCcw size={15} />
              {t("OrderDetailsReset")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || draft.lines.length === 0}
              className={primaryButton}
            >
              <FiSave size={15} />
              {t("OrderDetailsSave")}
            </Button>
          </footer>
        )}
      </OrderCard>
    </form>
  );
};

export default OrderDetailsCard;
