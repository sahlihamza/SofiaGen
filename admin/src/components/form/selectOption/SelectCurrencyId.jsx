import { Select } from "@windmill/react-ui";
import useAsync from "@/hooks/useAsync";
import CurrencyServices from "@/services/CurrencyServices";

const SelectCurrencyId = ({ register, name, label, required }) => {
  const { data, loading } = useAsync(CurrencyServices.getShowingCurrency);

  return (
    <>
      {loading ? (
        "Loading..."
      ) : (
        <Select
          name={name}
          {...register(`${name}`, {
            required: required ? `${label} is required!` : false,
          })}
        >
          <option value="" defaultValue hidden>
            {label}
          </option>
          {data?.map((currency) => (
            <option key={currency._id} value={currency._id}>
              {currency?.name} ({currency?.symbol})
            </option>
          ))}
        </Select>
      )}
    </>
  );
};

export default SelectCurrencyId;
