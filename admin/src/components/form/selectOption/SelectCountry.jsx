import { useEffect, useMemo } from "react";
import ReactFlagsSelect from "react-flags-select";
import useAsync from "@/hooks/useAsync";
import CountryServices from "@/services/CountryServices";
const DEFAULT_COUNTRY_ISO2 = "TN";

const SelectCountry = ({ register, watch, setValue, name, label, required }) => {
  const { data, loading } = useAsync(CountryServices.getAllCountries);
  const countries = useMemo(() => data?.data || [], [data]);

  useEffect(() => {
    register(name, {
      required: required ? `${label} is required!` : false,
    });
  }, [register, name]);

  const iso2ToId = useMemo(() => {
    const map = {};
    countries.forEach((country) => {
      map[country.iso2] = country._id;
    });
    return map;
  }, [countries]);

  const idToIso2 = useMemo(() => {
    const map = {};
    countries.forEach((country) => {
      map[country._id] = country.iso2;
    });
    return map;
  }, [countries]);

  const countryCodes = useMemo(
    () => countries.map((country) => country.iso2).filter(Boolean),
    [countries]
  );

  const customLabels = useMemo(() => {
    const labels = {};
    countries.forEach((country) => {
      labels[country.iso2] = { primary: country.name };
    });
    return labels;
  }, [countries]);

  const currentId = watch ? watch(name) : undefined;
  const selected = (currentId && idToIso2[currentId]) || "";

  // Runs once countries have loaded; only fills the field when nothing has
  // been chosen yet, so it never overrides an existing record's country.
  useEffect(() => {
    if (currentId || countries.length === 0 || !setValue) return;
    const defaultId = iso2ToId[DEFAULT_COUNTRY_ISO2];
    if (defaultId) {
      setValue(name, defaultId, { shouldValidate: true, shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, currentId]);

  const handleSelect = (code) => {
    setValue(name, iso2ToId[code] || "", {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  if (loading) {
    return "Loading...";
  }

  return (
    <ReactFlagsSelect
      selected={selected}
      onSelect={handleSelect}
      countries={countryCodes}
      customLabels={customLabels}
      placeholder={label}
      searchable
      fullWidth
    />
  );
};

export default SelectCountry;
