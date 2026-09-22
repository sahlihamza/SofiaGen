import React from "react";
import useAsync from "@/hooks/useAsync";
import CurrencyServices from "@/services/CurrencyServices";
import SelectField from "@/components/form/selectOption/SelectField";

const SelectCurrency = ({ register, name = "currency", label = "Currency", required = false }) => {
  const { data, loading } = useAsync(CurrencyServices.getShowingCurrency);

  const options = (data || []).map((currency) => ({
    value: currency.symbol,
    label: currency.name,
  }));

  return (
    <SelectField
      label={label}
      name={name}
      register={register}
      required={required}
      options={options}
      placeholder={label}
      disabled={loading}
    />
  );
};

export default SelectCurrency;
