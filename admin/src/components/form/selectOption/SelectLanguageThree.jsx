import { Select } from "@windmill/react-ui";
import { useContext, useEffect } from "react";

//internal imports
import { SidebarContext } from "@/context/SidebarContext";

const SelectLanguageThree = ({
  register,
  name,
  label,
  required,
  setValue,
  watch,
}) => {
  const { defaultInterfaceLanguages } = useContext(SidebarContext);
  const selectedLanguage = watch(name); // Get the current value of the field

  useEffect(() => {
    if (!selectedLanguage && defaultInterfaceLanguages?.length) {
      // Set default value if none exists
      setValue(name, defaultInterfaceLanguages[0]?.iso_code);
    }
  }, [defaultInterfaceLanguages, selectedLanguage, name, setValue]);

  const allowedLanguages = (defaultInterfaceLanguages || []).filter(
    (language) => ["en", "fr"].includes(language?.iso_code)
  );

  return (
    <>
      <Select
        className="mb-3"
        name={name}
        value={selectedLanguage || ""}
        {...register(name, {
          required: required ? false : `${label} is required!`,
        })}
        onChange={(e) => {
          setValue(name, e.target.value); // Update the value in React Hook Form
        }}
      >
        <option value="" hidden>
          Select Language
        </option>

        {allowedLanguages.map((language, i) => (
          <option key={i + 1} value={language.iso_code}>
            {language.name}
          </option>
        ))}
      </Select>
    </>
  );
};

export default SelectLanguageThree;
