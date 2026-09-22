import i18n from "i18next";
import Cookies from "js-cookie";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "@/utils/translation/en.json";
import fr from "@/utils/translation/fr.json";
import es from "@/utils/translation/es.json";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
};

const supportedLanguages = Object.keys(resources);
const detectedLanguage = Cookies.get("i18next")?.split("-")[0];
const defaultLanguage = supportedLanguages.includes(detectedLanguage)
  ? detectedLanguage
  : "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    debug: true,
    lng: defaultLanguage,
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    load: "languageOnly",
    // lag: "en",
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      //order: ['path', 'cookie', 'htmlTag'],
      caches: ["cookie"],
    },
  })

i18n.on("languageChanged", (lng) => {
  const isRtl = ["ar", "he", "fa"].includes(lng?.lng || lng);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
});
