import { useState } from "react";
import CurrencyServices from "@/services/CurrencyServices";
import useDrawerFormSubmit from "./useDrawerFormSubmit";

const useCurrencySubmit = (id) => {
  const [status, setStatus] = useState(true);

  const { onSubmit, ...rest } = useDrawerFormSubmit({
    id,
    services: CurrencyServices,
    add: "addCurrency",
    update: "updateCurrency",
    getById: "getCurrencyById",
    pickFields: ({ name, symbol }) => ({ name, symbol, status: status ? "show" : "hide" }),
    toFormValues: (entity) => ({ name: entity.name, symbol: entity.symbol }),
    reset: ["name", "symbol"],
    successMessages: { add: "Currency added successfully!", update: "Currency updated successfully!" },
  });

  return { onSubmit, status, setStatus, ...rest };
};

export default useCurrencySubmit;
