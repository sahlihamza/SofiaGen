import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiSettings,
  FiArchive,
  FiTruck,
  FiLink2,
  FiList,
  FiLayers,
  FiSliders,
  FiPlusCircle,
  FiChevronUp,
  FiChevronDown,
  FiMinus,
} from "react-icons/fi";

//internal import
import { W, WFONT, wInput, TabPlaceholder } from "./product_data_components/styles";
import General from "./product_data_components/general";
import Inventory from "./product_data_components/inventory";
import LinkedProduct from "./product_data_components/Linked product";
import Attributs from "./product_data_components/Attributs";
import Variations from "./product_data_components/Variations";
import Shipping from "./product_data_components/Shpping";
import Advanced from "./product_data_components/Advanced";
import { Button } from "@sofia/ui";

// The Variations tab is only relevant to variable products, so it is inserted
// conditionally (right after Attributes) based on the selected product type.
const baseTabs = [
  { key: "general", labelKey: "productForm.general", icon: FiSettings },
  { key: "inventory", labelKey: "productForm.inventory", icon: FiArchive },
  { key: "shipping", labelKey: "productForm.shipping", icon: FiTruck },
  { key: "linked", labelKey: "productForm.linkedProducts", icon: FiLink2 },
  { key: "attributes", labelKey: "productForm.attributes", icon: FiList },
  { key: "advanced", labelKey: "productForm.advanced", icon: FiSliders },
  { key: "getmore", labelKey: "productForm.getMoreOptions", icon: FiPlusCircle, disabled: true },
];

const variationsTab = {
  key: "variations",
  labelKey: "productForm.variations",
  icon: FiLayers,
};

const ProductData = ({
  register,
  errors,
  watch,
  currentId,
  upSells,
  setUpSells,
  crossSells,
  setCrossSells,
  attributes,
  setAttributes,
  variations,
  setVariations,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const [collapsed, setCollapsed] = useState(false);

  const isVariable = watch("productType") === "variable";

  // Show the Variations tab only for variable products (inserted after
  // Attributes). Other product types keep the original tab set.
  const dataTabs = isVariable
    ? [
        ...baseTabs.slice(0, 5),
        variationsTab,
        ...baseTabs.slice(5),
      ]
    : baseTabs;

  // If the product type changes away from "variable" while the Variations tab
  // is open, fall back to the General tab so we never show a hidden tab.
  useEffect(() => {
    if (!isVariable && activeTab === "variations") setActiveTab("general");
  }, [isVariable, activeTab]);

  return (
    <div
      style={{
        background: W.bg,
        border: `1px solid ${W.border}`,
        borderRadius: 4,
        fontFamily: WFONT,
      }}
      className="flex flex-col overflow-hidden"
    >
      {/* ============== HEADER (48px) ============== */}
      <div
        className="flex items-center gap-4 px-4"
        style={{ height: 48, borderBottom: `1px solid ${W.border}` }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: W.text }}>
          {t("productForm.productData")}
        </span>
        <select
          {...register("productType")}
          style={{ ...wInput, width: 220, height: 32 }}
        >
          <option value="simple">{t("productForm.simpleProduct")}</option>
          <option value="variable">{t("productForm.variableProduct")}</option>
          <option value="grouped">{t("productForm.groupedProduct")}</option>
          <option value="external">{t("productForm.externalProduct")}</option>
        </select>

        <label
          className="flex items-center gap-2"
          style={{ fontSize: 14, color: W.text }}
        >
          <input type="checkbox" {...register("virtual")} /> {t("productForm.virtual")}
        </label>
        <label
          className="flex items-center gap-2"
          style={{ fontSize: 14, color: W.text }}
        >
          <input type="checkbox" {...register("downloadable")} /> {t("productForm.downloadable")}
        </label>

        {/* collapse / expand icons on the far right */}
        <div className="flex items-center gap-2 ml-auto" style={{ color: W.textSecondary }}>
          <Button
            type="button"
            title={t("productForm.collapse")}
            onClick={() => setCollapsed(true)}
            className="hover:opacity-70"
          >
            <FiChevronUp size={16} />
          </Button>
          <Button
            type="button"
            title={t("productForm.expand")}
            onClick={() => setCollapsed(false)}
            className="hover:opacity-70"
          >
            <FiChevronDown size={16} />
          </Button>
          <Button
            type="button"
            title={t("productForm.togglePanel")}
            onClick={() => setCollapsed((v) => !v)}
            className="hover:opacity-70"
          >
            <FiMinus size={16} />
          </Button>
        </div>
      </div>

      {/* ============== BODY: sidebar + content ============== */}
      {!collapsed && (
        <div className="flex flex-1">
          {/* Left sidebar */}
          <div
            style={{
              width: 180,
              minWidth: 180,
              background: W.sidebar,
              borderRight: `1px solid ${W.border}`,
            }}
          >
            {dataTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && setActiveTab(tab.key)}
                  className="w-full text-left px-4 flex items-center gap-2"
                  style={{
                    height: 44,
                    fontSize: 14,
                    color: tab.disabled ? "#a7aaad" : active ? W.text : W.textSecondary,
                    background: active ? W.bg : "transparent",
                    borderLeft: active
                      ? `3px solid ${W.primary}`
                      : "3px solid transparent",
                    cursor: tab.disabled ? "default" : "pointer",
                  }}
                >
                  <Icon
                    size={15}
                    style={{ color: tab.disabled ? "#a7aaad" : W.primary }}
                  />
                  {t(tab.labelKey)}
                </Button>
              );
            })}
          </div>

          {/* Right content area */}
          <div className="flex-1" style={{ padding: 24 }}>
            {activeTab === "general" && (
              <General register={register} errors={errors} watch={watch} />
            )}
            {activeTab === "inventory" && (
              <Inventory register={register} watch={watch} />
            )}
            {activeTab === "shipping" && (
              <Shipping register={register} errors={errors} />
            )}
            {activeTab === "linked" && (
              <LinkedProduct
                currentId={currentId}
                upSells={upSells}
                setUpSells={setUpSells}
                crossSells={crossSells}
                setCrossSells={setCrossSells}
              />
            )}
            {activeTab === "attributes" && (
              <Attributs
                attributes={attributes}
                setAttributes={setAttributes}
              />
            )}
            {activeTab === "variations" && (
              <Variations
                currentId={currentId}
                attributes={attributes}
                watch={watch}
                variations={variations}
                setVariations={setVariations}
              />
            )}
            {activeTab === "advanced" && <Advanced register={register} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductData;
