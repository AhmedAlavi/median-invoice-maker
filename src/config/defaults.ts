export type ClientConfig = {
  defaults: {
    notes: string;
    currency: string;
    companiesUrl?: string;
    logoPath?: string;
  };
  agency: {
    name: string;
    email: string;
    phone: string;
    address: string;
    website: string;
  };
  bank_account: {
    bank_name: string;
    account_name: string;
    account_number: string;
    branch: string;
    swift_bic: string;
  };
  ui: {
    processChips: string[];
  };
};

const CONFIG: ClientConfig = {
  defaults: {
    // choose one of the variants above
    notes:
      "Design. Develop. Maintain. Grow. Thank you for choosing Median. Payment is due within 7 days.",
    currency: "AED",
    companiesUrl:
      "https://ahmedalavi.github.io/median_data/invoice_companies.json",
    logoPath: "/median_logo.svg",
  },
  agency: {
    name: "Median Ltd.",
    email: "hello@median.ltd",
    phone: "+94 777 294 294",
    address: "Kandy, Sri Lanka",
    website: "median.ltd",
  },
  bank_account: {
    bank_name: "Commercial bank of Ceylon PLC",
    account_name: "M M A Alavi",
    account_number: "8265001934",
    branch: "Gelioya",
    swift_bic: "CCEYLKLXXXX",
  },
  ui: {
    processChips: [
      "Plan & Design",
      "Develop & Ship",
      "Maintain & Support",
      "Optimize & Grow",
    ],
  },
};

export default CONFIG;
