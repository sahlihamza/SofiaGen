import * as CountryFlags from "react-flags-select";
export const getCountryFlagIcon = (iso2) => {
  if (!iso2) return null;
  const key = iso2.charAt(0).toUpperCase() + iso2.slice(1).toLowerCase();
  return CountryFlags[key] || null;
};
