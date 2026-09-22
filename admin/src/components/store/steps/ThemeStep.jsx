import React from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiLock } from "react-icons/fi";
import { Button } from "@sofia/ui";

const themes = [
  {
    id: "none",
    title: "Default",
    description: "No theme â€” use the default storefront appearance.",
    font: "Default",
    colors: ["rgb(5, 150, 105)", "rgb(241, 245, 249)", "rgb(236, 253, 245)", "rgb(239, 68, 68)", "rgb(241, 245, 249)"],
  },
  {
    id: "emerald-default",
    title: "Emerald Default",
    description: "The signature Sofiagen theme with a fresh emerald green accent.",
    font: "Inter",
    colors: ["rgb(5, 150, 105)", "rgb(241, 245, 249)", "rgb(236, 253, 245)", "rgb(239, 68, 68)", "rgb(241, 245, 249)"],
  },
  {
    id: "defu",
    title: "defu",
    description: "A minimal, clean theme with a neutral palette.",
    font: "Inter",
    colors: ["rgb(0, 0, 0)", "rgb(241, 245, 249)", "rgb(241, 245, 249)", "rgb(239, 68, 68)", "rgb(241, 245, 249)"],
  },
  {
    id: "slate-minimal",
    title: "Slate Minimal",
    description: "A sleek monochrome theme for a minimal, distraction-free experience.",
    font: "Geist",
    colors: ["rgb(15, 23, 42)", "rgb(241, 245, 249)", "rgb(241, 245, 249)", "rgb(239, 68, 68)", "rgb(241, 245, 249)"],
  },
  {
    id: "indigo-night",
    title: "Indigo Night",
    description: "A deep, focused indigo palette for power users who prefer contrast.",
    font: "Space Grotesk",
    colors: ["rgb(15, 23, 42)", "rgb(238, 242, 255)", "rgb(238, 242, 255)", "rgb(239, 68, 68)", "rgb(241, 245, 249)"],
  },
  {
    id: "ocean-blue",
    title: "Ocean Blue",
    description: "A professional blue palette with crisp lines and clear contrast.",
    font: "Plus Jakarta Sans",
    colors: ["rgb(37, 99, 235)", "rgb(239, 246, 255)", "rgb(239, 246, 255)", "rgb(239, 68, 68)", "rgb(243, 244, 246)"],
  },
  {
    id: "sunset-amber",
    title: "Sunset Amber",
    description: "Warm amber and orange tones that feel friendly and energetic.",
    font: "Inter",
    colors: ["rgb(217, 119, 6)", "rgb(255, 247, 237)", "rgb(255, 251, 235)", "rgb(239, 68, 68)", "rgb(245, 245, 245)"],
  },
  {
    id: "royal-violet",
    title: "Royal Violet",
    description: "A luxurious purple palette that conveys elegance and creativity.",
    font: "Outfit",
    colors: ["rgb(124, 58, 237)", "rgb(245, 243, 255)", "rgb(245, 243, 255)", "rgb(239, 68, 68)", "rgb(244, 244, 245)"],
  },
  {
    id: "teal-breeze",
    title: "Teal Breeze",
    description: "A refreshing teal palette inspired by nature and clarity.",
    font: "Source Sans 3",
    colors: ["rgb(13, 148, 136)", "rgb(240, 253, 250)", "rgb(240, 253, 250)", "rgb(239, 68, 68)", "rgb(243, 244, 246)"],
  },
  {
    id: "rose-petal",
    title: "Rose Petal",
    description: "A soft, warm pink palette that feels modern and inviting.",
    font: "Nunito Sans",
    colors: ["rgb(244, 63, 94)", "rgb(255, 241, 242)", "rgb(255, 241, 242)", "rgb(239, 68, 68)", "rgb(241, 245, 249)"],
  },
];

const ThemePreview = ({ colors, size = "sm" }) => {
  const [accent, surface, panel, sale, muted] = colors;
  const height = size === "lg" ? "h-56 sm:h-64" : "h-36";

  return (
    <div
      className={`relative w-full ${height} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700`}
      style={{ backgroundColor: surface }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white/70 dark:bg-gray-800/70 border-b border-black/5 dark:border-white/5">
        <span className="w-1.5 h-1.5 rounded-full bg-black/15 dark:bg-white/15" />
        <span className="w-1.5 h-1.5 rounded-full bg-black/15 dark:bg-white/15" />
        <span className="w-1.5 h-1.5 rounded-full bg-black/15 dark:bg-white/15" />
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
        <div className="flex gap-1.5">
          <span className="h-1 w-4 rounded-full bg-black/10 dark:bg-white/10" />
          <span className="h-1 w-4 rounded-full bg-black/10 dark:bg-white/10" />
          <span className="h-1 w-4 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
      </div>
      <div className="mx-3 mb-2 rounded-md px-3 py-3" style={{ backgroundColor: panel }}>
        <span className="block h-2 w-2/3 rounded-full mb-1.5" style={{ backgroundColor: accent }} />
        <span className="block h-1 w-1/2 rounded-full mb-1 bg-black/10 dark:bg-white/10" />
        <span className="block h-1 w-1/3 rounded-full mb-2 bg-black/10 dark:bg-white/10" />
        <span className="inline-block h-2.5 w-10 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative rounded-sm" style={{ backgroundColor: muted, height: 22 }}>
            {i === 0 && (
              <span
                className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: sale }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Field = ({ label, required, hint, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {hint && (
      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    )}
    {error}
  </div>
);

const ThemeStep = ({ formData, onDataChange, register, errors }) => {
  const { t } = useTranslation();

  const handleSelect = (themeId) => {
    onDataChange({ theme: themeId });
  };

  return (
    <div className="space-y-6 w-full">
      <Field
        label={t("Theme") || "Theme"}
        required
        hint={t("ThemeSmallText") || "Selected theme will be shown in the storefront."}
        error={<span className="text-xs text-red-500">{errors?.theme?.message}</span>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const isSelected = formData.theme === theme.id;
            return (
              <Button
                key={theme.id}
                type="button"
                onClick={() => handleSelect(theme.id)}
                className={`relative flex flex-col h-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20 shadow-md shadow-emerald-200/60 dark:shadow-emerald-900/40"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <FiCheck size={12} className="text-white" strokeWidth={3} />
                  </div>
                )}
                <ThemePreview colors={theme.colors} />
                <div className="mt-3 flex-1 flex flex-col">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {theme.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 flex-1">
                    {theme.description}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {theme.font}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </Field>

      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 px-4 py-3">
        <div className="flex items-start gap-2">
          <FiLock className="text-gray-400 mt-0.5 shrink-0" size={16} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("ThemeNote") || "You can change the theme later in store settings. The theme affects the storefront appearance only."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThemeStep;