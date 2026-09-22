import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus } from "react-icons/fi";

//internal import
import BrandServices from "@/services/BrandServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { W, wInput, wButton, MetaBox } from "./styles";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

// Only active brands are listed here â€” brand management (logo, slug,
// description, website...) happens on the dedicated Brands page. "+ Add New
// Brand" only captures a name so the product can be saved right away; the
// rest is filled in later from there.
const Brands = ({
  brandList,
  setBrandList,
  selectedBrand,
  setSelectedBrand,
}) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [brandInput, setBrandInput] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);

  const handleAddBrand = async () => {
    const name = brandInput.trim();
    if (!name) return notifyError(t("productForm.enterBrandName"));
    if (brandList.some((b) => b.name?.toLowerCase() === name.toLowerCase())) {
      return notifyError(t("productForm.brandExists"));
    }
    try {
      setAddingBrand(true);
      const created = await BrandServices.addBrand({ name });
      setBrandList((prev) => [created, ...prev]);
      setSelectedBrand(created._id); // auto-select the new one
      setBrandInput("");
      setIsAdding(false);
      notifySuccess(t("productForm.brandAdded"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setAddingBrand(false);
    }
  };

  return (
    <MetaBox
      title={t("productForm.brands")}
      style={{ height: 320 }}
      collapsible
      collapseLabel={t("productForm.collapse")}
      expandLabel={t("productForm.expand")}
    >
      {/* selectable list (check to select) */}
      <div
        className="flex-1 overflow-y-auto pr-1"
        style={{ borderBottom: `1px solid ${W.border}` }}
      >
        {brandList?.length ? (
          brandList.map((brand) => (
            <label
              key={brand._id}
              className="flex items-center gap-3 py-2 cursor-pointer"
              style={{ fontSize: 14, color: W.text }}
            >
              <input
                type="checkbox"
                style={{ width: 16, height: 16 }}
                checked={selectedBrand === brand._id}
                onChange={() =>
                  setSelectedBrand((prev) =>
                    prev === brand._id ? "" : brand._id
                  )
                }
              />
              {brand.name}
            </label>
          ))
        ) : (
          <p className="pt-2" style={{ fontSize: 14, color: W.textSecondary }}>
            {t("productForm.noBrandsFound")}
          </p>
        )}
      </div>

      {/* "+ Add New Brand" â€” name-only quick add */}
      <div className="pt-3">
        {isAdding ? (
          <div className="flex flex-col gap-2">
            <input
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddBrand();
                }
              }}
              placeholder={t("productForm.newBrand")}
              autoFocus
              style={{ ...wInput, width: "100%" }}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleAddBrand}
                disabled={addingBrand}
                className="flex items-center justify-center gap-1"
                style={{ ...wButton, flex: 1, opacity: addingBrand ? 0.7 : 1 }}
              >
                {addingBrand ? (
                  <LoadingSpinner alt="..." width={16} />
                ) : (
                  t("productForm.add")
                )}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setBrandInput("");
                }}
                disabled={addingBrand}
                style={{ fontSize: 13, color: W.textSecondary }}
              >
                {t("productForm.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1"
            style={{ fontSize: 13, color: W.primary, fontWeight: 500 }}
          >
            <FiPlus /> {t("productForm.addNewBrand")}
          </Button>
        )}
      </div>
    </MetaBox>
  );
};

export default Brands;
