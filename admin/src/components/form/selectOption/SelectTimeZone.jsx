import React from "react";
import SelectField from "@/components/form/selectOption/SelectField";
import { timeZones } from "@/utils/timezones";

const SelectTimeZone = ({ register, name = "timezone", label = "Timezone", required = false }) => {
  const options = (timeZones || []).map((tz) => ({ value: tz.tzCode, label: tz.label }));

  return (
    <SelectField
      label={label}
      name={name}
      register={register}
      required={required}
      options={options}
      placeholder="Select Timezone"
    />
  );
};

export default SelectTimeZone;
