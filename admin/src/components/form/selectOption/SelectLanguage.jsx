import React from "react";

//internal imports
import useUtilsFunction from "@/hooks/useUtilsFunction";

const fallbackLanguages = [
  { _id: "fallback-en", name: "English", iso_code: "en", flag: "US" },
  { _id: "fallback-fr", name: "French", iso_code: "fr", flag: "FR" },
  { _id: "fallback-es", name: "Español", iso_code: "es", flag: "ES" },
  { _id: "fallback-ar", name: "Arabic", iso_code: "ar", flag: "SA" },
];

const SelectLanguage = ({ handleLanguageChange }) => {
  const { languages, langError, langLoading } = useUtilsFunction();
  const languageOptions = !langError && !langLoading && languages?.length
    ? languages
    : fallbackLanguages;

// Filter out duplicates and restrict to allowed languages (en, fr, es, ar)
  const allowedCodes = ["en", "fr", "es", "ar"];
  const uniqueLanguages = [];
  const seenCodes = new Set();
  for (const lang of languageOptions) {
    if (lang?.iso_code) {
      const code = lang.iso_code.toLowerCase();
      if (allowedCodes.includes(code) && !seenCodes.has(code)) {
        seenCodes.add(code);
        uniqueLanguages.push(lang);
      }
    }
  }

const flagMap = {
    en: "us",
    fr: "fr",
    ar: "sa",
  };

  return (
    <ul className="dropdown-content w-full">
      {uniqueLanguages.map((lang) => {
        const flagCode = (lang?.flag || flagMap[lang?.iso_code?.toLowerCase()] || lang?.iso_code || "").toLowerCase();

        return (
          <li
            className="cursor-pointer flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md"
            onClick={() => handleLanguageChange(lang)}
            key={lang._id || lang.iso_code}
          >
            <div className={`flag flex-shrink-0 ${flagCode}`}></div>

            <span className="leading-none text-gray-900 dark:text-gray-600 pr-8 text-right">
              {lang?.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default SelectLanguage;
