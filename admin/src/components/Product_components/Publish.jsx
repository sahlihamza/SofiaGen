import React from "react";
import { useTranslation } from "react-i18next";

//internal import
import { W, wInput, wButton, MetaBox, FieldRow } from "./styles";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const Publish = ({ register, toggleDrawer, isSubmitting, id }) => {
  const { t } = useTranslation();
  return (
    <MetaBox title={t("productForm.publish")}>
      <FieldRow label={t("productForm.status")}>
        <select {...register("status")} style={{ ...wInput, width: "100%" }}>
          <option value="draft">{t("productForm.draft")}</option>
          <option value="published">{t("productForm.published")}</option>
          <option value="archived">{t("productForm.archived")}</option>
        </select>
      </FieldRow>
      <FieldRow label={t("productForm.visibility")}>
        <select {...register("visibility")} style={{ ...wInput, width: "100%" }}>
          <option value="public">{t("productForm.public")}</option>
          <option value="private">{t("productForm.private")}</option>
          <option value="hidden">{t("productForm.hidden")}</option>
        </select>
      </FieldRow>
      <FieldRow label={t("productForm.publishDate")}>
        <input
          type="date"
          style={{ ...wInput, width: "82%" }}
          {...register("publishDate")}
        />
      </FieldRow>

      <div className="flex items-center gap-3 mt-2">
        <Button
          type="button"
          onClick={toggleDrawer}
          style={{
            ...wButton,
            width: 110,
            background: "var(--w-bg)",
            color: W.textSecondary,
            border: `1px solid ${W.inputBorder}`,
          }}
        >
          {t("productForm.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center"
          style={{
            ...wButton,
            width: 110,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <LoadingSpinner alt="..." width={18} />
          ) : id ? (
            t("productForm.update")
          ) : (
            t("productForm.publish")
          )}
        </Button>
      </div>
    </MetaBox>
  );
};

export default Publish;
