import { useMemo } from "react";
import { createCurrencyFormatter } from "../utils/currency";

export const useCurrencyFormatter = (currency: string = "LKR") => {
  return useMemo(() => createCurrencyFormatter(currency), [currency]);
};
