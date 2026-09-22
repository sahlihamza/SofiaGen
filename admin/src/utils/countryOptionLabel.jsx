import { FiGlobe } from "react-icons/fi";
import { getCountryFlagIcon } from "@/utils/getCountryFlagIcon";
export const EVERYWHERE_ISO2 = "__EVERYWHERE__";
export const countryOptionLabel = (displayValue, option) => {
  if (option?.iso2 === EVERYWHERE_ISO2) {
    return (
      <span className="flex items-center gap-2 font-semibold">
        <FiGlobe style={{ width: "1.1em", height: "1.1em", flexShrink: 0 }} />
        <span>{displayValue}</span>
      </span>
    );
  }

  const FlagIcon = getCountryFlagIcon(option?.iso2);
  return (
    <span className="flex items-center gap-2">
      {FlagIcon && <FlagIcon style={{ width: "1.1em", height: "1.1em", flexShrink: 0 }} />}
      <span>{displayValue}</span>
    </span>
  );
};
