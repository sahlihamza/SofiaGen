import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Select, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";
import { FiAlertTriangle, FiXCircle } from "react-icons/fi";
import { Button } from "@sofia/ui";

//internal import
import AnalyticsServices from "@/services/AnalyticsServices";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import BrandServices from "@/services/BrandServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const NEVER_SOLD_PREVIEW_COUNT = 15;

const ProductsAnalysis = ({ period, startDate, endDate }) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("quantity");
  const [neverSoldExpanded, setNeverSoldExpanded] = useState(false);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  // Filter option lists â€” fetched once, independent of the period selector.
  // Failures here shouldn't block the rest of the section: the filters just
  // fall back to empty dropdowns (equivalent to "no filter available").
  useEffect(() => {
    ProductCategoryServices.getShowingCategories()
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch(() => setCategories([]));
    BrandServices.getAllBrands()
      .then((res) => setBrands(res?.brands || []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    const params = { period };
    if (period === "custom") {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    if (categoryFilter) params.category = categoryFilter;
    if (brandFilter) params.brand = brandFilter;

    AnalyticsServices.getProducts(params)
      .then((res) => {
        if (cancelled) return;
        setData(res?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || t("AnalyticsFetchError"));
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, startDate, endDate, categoryFilter, brandFilter, t]);

  const topSelling =
    (activeTab === "quantity" ? data?.topSellingByQuantity : data?.topSellingByRevenue) || [];
  const outOfStock = data?.outOfStock || [];
  const lowStock = data?.lowStock || [];
  const neverSold = data?.neverSold || [];
  const visibleNeverSold = neverSoldExpanded ? neverSold : neverSold.slice(0, NEVER_SOLD_PREVIEW_COUNT);

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
          {t("AnalyticsProductsSection")}
        </h3>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant={activeTab === "quantity" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("quantity")}
              className={`pb-2 border-b-2 -mb-px rounded-none ${
                activeTab === "quantity"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t("AnalyticsTopSellingByQuantity")}
            </Button>
            <Button
              type="button"
              variant={activeTab === "revenue" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("revenue")}
              className={`pb-2 border-b-2 -mb-px rounded-none ${
                activeTab === "revenue"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t("AnalyticsTopSellingByRevenue")}
            </Button>
          </div>

          {/* Applies to the whole section (top sellers, stock lists, never-sold),
              not just the table above â€” the backend resolves category/brand into
              a product-id allowlist shared by every query in this endpoint. */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="w-44"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">{t("AnalyticsAllCategories")}</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>

            <Select className="w-44" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="">{t("AnalyticsAllBrands")}</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : topSelling.length === 0 ? (
          !error && <p className="text-gray-500 mb-6">{t("AnalyticsNoTopProducts")}</p>
        ) : (
          <TableContainer className="rounded-lg mb-6">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("AnalyticsProductNameCol")}</TableCell>
                  <TableCell>{t("AnalyticsQuantitySold")}</TableCell>
                  <TableCell>{t("AnalyticsRevenueCol")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {topSelling.map((product, index) => (
                  <TableRow key={product.productId || `${product.title}-${index}`}>
                    <TableCell>{product.title}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      {currency}
                      {getNumberTwo(product.revenue || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <p className="text-xs text-gray-400 mb-2">{t("AnalyticsCurrentState")}</p>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 mb-3">
              <FiXCircle className="text-red-500" />
              {t("AnalyticsOutOfStock")}
              {outOfStock.length > 0 && (
                <span className="ml-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs px-2 py-0.5">
                  {outOfStock.length}
                </span>
              )}
            </h4>
            {loading ? (
              <div className="h-16 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
            ) : outOfStock.length === 0 ? (
              <p className="text-sm text-gray-500">{t("AnalyticsNoOutOfStock")}</p>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {outOfStock.map((product) => (
                  <li
                    key={product.productId}
                    className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>{product.name}</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">0</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 mb-3">
              <FiAlertTriangle className="text-amber-500" />
              {t("AnalyticsLowStock")}
              {lowStock.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs px-2 py-0.5">
                  {lowStock.length}
                </span>
              )}
            </h4>
            {loading ? (
              <div className="h-16 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
            ) : lowStock.length === 0 ? (
              <p className="text-sm text-gray-500">{t("AnalyticsNoLowStock")}</p>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {lowStock.map((product) => (
                  <li
                    key={product.productId}
                    className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>{product.name}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {product.stockQuantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">{t("AnalyticsNeverSold")}</h4>
          {loading ? (
            <div className="h-16 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
          ) : neverSold.length === 0 ? (
            <p className="text-sm text-gray-500">{t("AnalyticsNoNeverSold")}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {visibleNeverSold.map((product) => (
                  <span
                    key={product.productId}
                    className="rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1"
                  >
                    {product.name}
                  </span>
                ))}
              </div>
              {neverSold.length > NEVER_SOLD_PREVIEW_COUNT && (
                <SecondaryButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNeverSoldExpanded((prev) => !prev)}
                  className="mt-3 text-sm text-emerald-600 hover:underline"
                >
                  {neverSoldExpanded
                    ? t("AnalyticsShowLess")
                    : `${t("AnalyticsShowMore")} (${neverSold.length - NEVER_SOLD_PREVIEW_COUNT})`}
                </SecondaryButton>
              )}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default ProductsAnalysis;
