export const createCurrencyFormatter = (currency: string = "LKR") => {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
  });

  return (amount: number) => formatter.format(amount);
};
