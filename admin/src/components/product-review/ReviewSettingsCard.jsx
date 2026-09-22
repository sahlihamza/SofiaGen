import React, { useEffect, useState } from "react";
import { Card, CardBody, Input, Label } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiChevronUp, FiSettings } from "react-icons/fi";

//internal import
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import ProductReviewServices from "@/services/ProductReviewServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

// store_settings.products.reviews from the ticket â€” per-store toggles that
// govern how the review pipeline behaves (approval, guests, verified-only...).
const ReviewSettingsCard = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || settings) return;
    (async () => {
      try {
        setLoading(true);
        const res = await ProductReviewServices.getReviewSettings();
        setSettings(res.data);
      } catch (err) {
        notifyError(err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, settings]);

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await ProductReviewServices.updateReviewSettings(settings);
      setSettings(res.data);
      notifySuccess(t("ReviewsSettingsSaved"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
      <CardBody>
        <Button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 font-semibold">
            <FiSettings />
            {t("ReviewsSettingsTitle")}
          </span>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </Button>

        {isOpen && (
          <div className="mt-4">
            {loading || !settings ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner alt="Loading" width={30} height={15} />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <SwitchToggle
                  id="reviews-enabled"
                  title={t("ReviewsSettingEnabled")}
                  handleProcess={() => toggle("enabled")}
                  processOption={settings.enabled}
                />
                <SwitchToggle
                  id="reviews-require-approval"
                  title={t("ReviewsSettingRequireApproval")}
                  handleProcess={() => toggle("requireApproval")}
                  processOption={settings.requireApproval}
                />
                <SwitchToggle
                  id="reviews-verified-only"
                  title={t("ReviewsSettingVerifiedOnly")}
                  handleProcess={() => toggle("verifiedOwnersOnly")}
                  processOption={settings.verifiedOwnersOnly}
                />
                <SwitchToggle
                  id="reviews-allow-guests"
                  title={t("ReviewsSettingAllowGuests")}
                  handleProcess={() => toggle("allowGuestReviews")}
                  processOption={settings.allowGuestReviews}
                />
                <SwitchToggle
                  id="reviews-show-rating"
                  title={t("ReviewsSettingShowRating")}
                  handleProcess={() => toggle("showRating")}
                  processOption={settings.showRating}
                />
                <SwitchToggle
                  id="reviews-show-count"
                  title={t("ReviewsSettingShowCount")}
                  handleProcess={() => toggle("showCount")}
                  processOption={settings.showCount}
                />
                <div>
                  <Label>{t("ReviewsSettingMaxImages")}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={settings.maxImages}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, maxImages: Number(e.target.value) }))
                    }
                    className="mt-1 w-32"
                  />
                </div>
              </div>
            )}

            {settings && (
              <div className="mt-5">
                <Button disabled={isSaving} onClick={handleSave} className="h-11">
                  {isSaving ? t("Processing") : t("SaveBtn")}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ReviewSettingsCard;
