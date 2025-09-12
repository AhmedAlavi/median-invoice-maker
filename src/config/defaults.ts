type ThemeColors = {
  bg: string;
  surface: string;
  text: string;
  subtext: string;
  line: string;
  lineSoft: string;
  accentA: string;
  accentB: string;
  shadow: string;
};

type Plan = "basic" | "pro" | "admin";

export type ClientConfig = {
  plan: Plan;
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
    colors: {
      dark: ThemeColors;
      light: ThemeColors;
    };
  };
};

const CONFIG: ClientConfig = {
  plan: "basic",
  defaults: {
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
    colors: {
      dark: {
        bg: "#0B0B0E",
        surface: "#111317",
        text: "#E5E7EB",
        subtext: "#A3A3A3",
        line: "#25272B",
        lineSoft: "#1C1F24",
        accentA: "#7c5cff", // Median brand orange
        accentB: "#00e7a7", // Median brand red
        shadow: "0 10px 30px rgba(0,0,0,.45)",
      },
      light: {
        bg: "#FFFFFF",
        surface: "#FFFFFF",
        text: "#111827",
        subtext: "#6B7280",
        line: "#E5E7EB",
        lineSoft: "#F3F4F6",
        accentA: "#7c5cff",
        accentB: "#00e7a7",
        shadow: "0 10px 30px rgba(16,24,40,.1)",
      },
    },
  },
};

export default CONFIG;
