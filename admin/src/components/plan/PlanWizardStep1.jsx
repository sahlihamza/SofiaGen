import { useTranslation } from "react-i18next";

// Internal imports
import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import Error from "@/components/form/others/Error";
import useGetCData from "@/hooks/useGetCData";

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PlanWizardStep1 = ({ data, errors, onUpdate, isEditing = false }) => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();

  const canEditSlug = hasPermission("plans", "edit_slug");
  const isSlugLocked = isEditing && !canEditSlug;

  const hasStores = (data.storesCount || 0) > 0;

  const handleChange = (field, value) => {
const nextData = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      badge: data.badge,
      color: data.color,
      icon: data.icon,
      visibility: data.visibility,
      versionNote: data.versionNote,
    };

    if (field === "name") {
      nextData.name = value;
      // Only update slug if it was never manually edited (still matches initial name-based slug)
      // This is a simplified check - if slug is empty, always sync
      if (!data.slug) {
        nextData.slug = slugify(value);
      }
    } else if (field === "slug") {
      nextData.slug = value;
    } else if (field === "description") {
      nextData.description = value;
    } else if (field === "badge") {
      nextData.badge = value;
    } else if (field === "color") {
      nextData.color = value;
    } else if (field === "icon") {
      nextData.icon = value;
    } else if (field === "visibility") {
      nextData.visibility = value;
    } else if (field === "versionNote") {
      nextData.versionNote = value;
    }

    onUpdate(nextData);
  };

  return (
    <div className="space-y-6">
      {hasStores && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-sm font-medium text-yellow-800">
{t("PlanUsedByStoresWarning", { count: data.storesCount })}
          </p>
        </div>
      )}

      {/* Plan Name */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanName")} required />
        <div className="col-span-8 sm:col-span-4">
          <InputArea
            register={() => {}}
            name="name"
            type="text"
            placeholder="e.g. Professional"
            value={data.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
          <Error errorName={errors.name} />
        </div>
      </div>

      {/* Plan Slug */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanSlug")} />
        <div className="col-span-8 sm:col-span-4">
          <InputArea
            register={() => {}}
            name="slug"
            type="text"
            placeholder="e.g. professional (auto-generated)"
            value={data.slug}
            onChange={(e) => !isEditing && handleChange("slug", e.target.value)}
            disabled={isSlugLocked}
            readOnly={isSlugLocked}
          />
          <Error errorName={errors.slug} />
          {isSlugLocked ? (
            <small className="text-gray-500 dark:text-gray-400">
              {t("SlugLockedNote") ||
                "Slug is locked for existing plans to preserve API links."}
            </small>
          ) : (
            <small className="text-gray-500 dark:text-gray-400">
              {t("SlugHelp") || "Unique identifier for the plan (URL friendly)"}
            </small>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanDescription")} />
        <div className="col-span-8 sm:col-span-4">
          <textarea
            name="description"
            placeholder="Describe your plan features and benefits..."
            value={data.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows="4"
            className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      </div>

{/* Visibility */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanVisibility") || "Visibility"} />
        <div className="col-span-8 sm:col-span-4">
          <select
            name="visibility"
            value={data.visibility || "public"}
            onChange={(e) => handleChange("visibility", e.target.value)}
            className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          >
            <option value="public">
              {t("VisibilityPublic") || "Public"}
            </option>
            <option value="private">
              {t("VisibilityPrivate") || "Private"}
            </option>
            <option value="invitation">
              {t("VisibilityInvitation") || "Invitation"}
            </option>
            <option value="internal">
              {t("VisibilityInternal") || "Internal"}
            </option>
            <option value="deprecated">
              {t("VisibilityDeprecated") || "Deprecated"}
            </option>
          </select>
          <small className="text-gray-500 dark:text-gray-400">
            {t("PlanVisibilityHelp") ||
              "Controls who can see and subscribe to this plan."}
          </small>
        </div>
      </div>

      {/* Badge */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanBadge")} />
        <div className="col-span-8 sm:col-span-4">
          <InputArea
            register={() => {}}
            name="badge"
            type="text"
            placeholder="e.g. Most Popular"
            value={data.badge}
            onChange={(e) => handleChange("badge", e.target.value)}
          />
        </div>
      </div>

      {/* Color */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanColor")} />
        <div className="col-span-8 sm:col-span-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="h-10 w-16 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {data.color}
            </span>
          </div>
        </div>
      </div>

      {/* Icon */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanIcon")} />
        <div className="col-span-8 sm:col-span-4">
          <InputArea
            register={() => {}}
            name="icon"
            type="text"
            placeholder="e.g. FiStar or icon URL"
            value={data.icon}
            onChange={(e) => handleChange("icon", e.target.value)}
          />
        </div>
      </div>

      {/* Version Note */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanVersionNote")} />
        <div className="col-span-8 sm:col-span-4">
          <InputArea
            register={() => {}}
            name="versionNote"
            type="text"
            placeholder={t("PlanVersionNotePlaceholder") || "e.g. Price increase effective next month"}
            value={data.versionNote || ""}
            onChange={(e) => handleChange("versionNote", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default PlanWizardStep1;
