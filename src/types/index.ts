export type LineItem = {
  id: string;
  description: string;
  qty: number;
  price: number;
};

export type Company = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  notes?: string;
  website?: string;
};

export type ThemeMode = "light" | "dark";

export type Colors = {
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

export type Input = {
  label: string;
  type?: string;
  value: number | string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export type NumberInput = {
  label: string;
  value: number | string;
  onChange: (n: number) => void;
  min?: number;
};
