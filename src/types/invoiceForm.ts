export type Agency = {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
};

export type Client = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type InvoiceMeta = {
  number: string;
  date: string;
  due: string;
  currency: string;
};
