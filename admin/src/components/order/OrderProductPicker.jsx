import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FiPlus, FiSearch } from "react-icons/fi";

//internal import
import ProductServices from "@/services/ProductServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { Button } from "@sofia/ui";

// Adding a line to an order means picking a real product: the API needs a
// productId to write the order_items row, so free text is not an option here.
const OrderProductPicker = ({ onPick, disabled = false }) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();

  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  // The request follows the typing at a distance, so a search is one call per
  // pause rather than one per keystroke.
  const [debounced, setDebounced] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    const onEscape = (e) => e.key === "Escape" && setIsOpen(false);

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const { data, isFetching } = useQuery({
    queryKey: ["orderProductPicker", debounced],
    queryFn: () =>
      ProductServices.getAllProducts({
        page: 1,
        limit: 8,
        productName: debounced,
      }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const products = data?.products || [];

  // A sale that is running is what the customer would have paid, so it is the
  // price the line starts at. The admin can still overwrite it afterwards.
  const priceOf = (product) =>
    Number(product?.salePrice) > 0
      ? Number(product.salePrice)
      : Number(product?.regularPrice) || 0;

  const handlePick = (product) => {
    onPick({
      productId: product._id,
      variationId: null,
      productName: product.productName || "",
      sku: product.sku || "",
      quantity: 1,
      unitPrice: priceOf(product),
      discount: 0,
    });
    setTerm("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex h-9 items-center gap-2 rounded-md border border-dashed border-[#2271b1] px-3 text-sm font-medium text-[#2271b1] transition-colors hover:bg-[#f0f6fc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <FiPlus size={15} />
        {t("OrderDetailsAddProduct")}
      </Button>

      {isOpen && (
        <div className="absolute left-0 z-20 mt-2 w-80 overflow-hidden rounded-lg border border-[#dcdcde] bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div className="flex items-center gap-2 border-b border-[#f0f0f1] px-3 py-2 dark:border-gray-700">
            <FiSearch size={15} className="shrink-0 text-[#8c8f94]" />
            <input
              ref={inputRef}
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("OrderDetailsSearchProduct")}
              className="w-full bg-transparent text-sm text-[#1d2327] placeholder-[#8c8f94] focus:outline-none dark:text-gray-200"
            />
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {isFetching && products.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-[#646970] dark:text-gray-400">
                {t("OrderDetailsSearching")}
              </li>
            ) : products.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-[#646970] dark:text-gray-400">
                {t("OrderDetailsNoProductFound")}
              </li>
            ) : (
              products.map((product) => (
                <li key={product._id}>
                  <Button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => handlePick(product)}
                    className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f6f7f7] dark:hover:bg-gray-700/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#1d2327] dark:text-gray-200">
                        {product.productName}
                      </span>
                      {product.sku && (
                        <span className="block truncate text-xs text-[#8c8f94] dark:text-gray-500">
                          {product.sku}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#1d2327] dark:text-gray-300">
                      {currency}
                      {getNumberTwo(priceOf(product))}
                    </span>
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OrderProductPicker;
