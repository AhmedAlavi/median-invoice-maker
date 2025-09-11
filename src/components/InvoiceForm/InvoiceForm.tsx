import React, { useCallback, useEffect, useState } from "react";
import type { LineItem, Company } from "../../types";
import SectionTitle from "../ui/SectionTitle";
import FieldRow from "../ui/FieldRow";
import Divider from "../ui/Divider";
import Input from "../ui/Input";
import NumberInput from "../ui/NumberInput";
import ItemsEditor from "./ItemsEditor";
import { Upload } from "lucide-react";
import { motion } from "framer-motion";
import type { Agency, Client, InvoiceMeta } from "../../types/invoiceForm";

type Props = {
  // state (lifted from App)
  agency: Agency;
  setAgency: React.Dispatch<React.SetStateAction<Agency>>;
  client: Client;
  setClient: React.Dispatch<React.SetStateAction<Client>>;
  invoiceMeta: InvoiceMeta;
  setInvoiceMeta: React.Dispatch<React.SetStateAction<InvoiceMeta>>;
  taxPct: number | string;
  setTaxPct: (n: number) => void;
  discount: number | string;
  setDiscount: (n: number) => void;
  notes: string;
  setNotes: (s: string) => void;

  items: LineItem[];
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<LineItem>) => void;

  logoDataUrl: string | null;
  setLogoDataUrl: (s: string | null) => void;

  // optional override for fetching company presets
  companiesUrl?: string;
};

const DEFAULT_COMPANIES_URL =
  "https://ahmedalavi.github.io/median_data/invoice_companies.json";

export default function InvoiceForm({
  agency,
  setAgency,
  client,
  setClient,
  invoiceMeta,
  setInvoiceMeta,
  taxPct,
  setTaxPct,
  discount,
  setDiscount,
  notes,
  setNotes,
  items,
  addItem,
  removeItem,
  updateItem,
  logoDataUrl,
  setLogoDataUrl,
  companiesUrl = DEFAULT_COMPANIES_URL,
}: Props) {
  // companies (client presets)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const onLogoChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string); // base64 → works in export
    reader.readAsDataURL(f);
  };

  const applyCompany = useCallback(
    (c: Company) => {
      setClient((prev) => ({
        name: c.name || prev.name,
        email: c.email || prev.email,
        phone: c.phone || prev.phone,
        address: c.address || prev.address,
      }));
      if (c.currency)
        setInvoiceMeta((m) => ({ ...m, currency: c.currency as string }));
      if (c.notes) setNotes(c.notes);
      if (c.website) setAgency((a) => ({ ...a, website: c.website as string }));
      localStorage.setItem("median:lastCompany", c.name);
    },
    [setAgency, setClient, setInvoiceMeta, setNotes]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoadingCompanies(true);
        setCompaniesError(null);

        let data;
        try {
          const res = await fetch(companiesUrl, { cache: "no-store" });
          if (!res.ok) throw new Error("Remote fetch failed");
          data = await res.json();
        } catch {
          const local = await fetch("/data/companies.json").then((r) =>
            r.json()
          );
          data = local;
        }

        const list: Company[] = Array.isArray(data)
          ? data
          : data.companies || [];
        if (cancelled) return;
        setCompanies(list);

        // re-apply last used company automatically
        const last = localStorage.getItem("median:lastCompany");
        if (last) {
          const found = list.find((c) => c.name === last);
          if (found) applyCompany(found);
        }
      } catch (e: any) {
        if (!cancelled)
          setCompaniesError(e?.message || "Failed to load companies");
      } finally {
        if (!cancelled) setIsLoadingCompanies(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [companiesUrl, applyCompany]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md md:p-6"
    >
      {/* Agency */}
      <SectionTitle>Agency</SectionTitle>
      <FieldRow>
        <Input
          label="Name"
          value={agency.name}
          onChange={(e: any) => setAgency({ ...agency, name: e.target.value })}
        />
        <Input
          label="Email"
          value={agency.email}
          onChange={(e: any) => setAgency({ ...agency, email: e.target.value })}
        />
      </FieldRow>
      <FieldRow>
        <Input
          label="Phone"
          value={agency.phone}
          onChange={(e: any) => setAgency({ ...agency, phone: e.target.value })}
        />
        <Input
          label="Website"
          value={agency.website}
          onChange={(e: any) =>
            setAgency({ ...agency, website: e.target.value })
          }
        />
      </FieldRow>
      <Input
        label="Address"
        value={agency.address}
        onChange={(e: any) => setAgency({ ...agency, address: e.target.value })}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-white/70">
            Upload Logo
          </label>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
              <Upload className="h-4 w-4" />
              <span>Choose file</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onLogoChange}
              />
            </label>
            {logoDataUrl && (
              <span className="text-xs text-white/60">Logo ready ✓</span>
            )}
          </div>
        </div>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-xl border border-white/10
               bg-[#111317] text-white px-3 py-2 text-sm
               outline-none focus:ring-2 focus:ring-white/30"
            value={invoiceMeta.currency}
            onChange={(e) =>
              setInvoiceMeta({ ...invoiceMeta, currency: e.target.value })
            }
          >
            {["LKR", "USD", "EUR", "GBP", "AED", "INR"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* chevron */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      <Divider />

      {/* Quick-pick client pills */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {isLoadingCompanies && (
          <span className="text-xs text-white/60">Loading companies…</span>
        )}
        {!isLoadingCompanies &&
          companies.map((c) => (
            <button
              key={c.name}
              onClick={() => applyCompany(c)}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
              title={`Apply ${c.name}`}
            >
              {c.name}
            </button>
          ))}
        {companiesError && (
          <span className="text-xs text-red-300">Failed: {companiesError}</span>
        )}
      </div>

      {/* Client */}
      <SectionTitle>Client</SectionTitle>
      <FieldRow>
        <Input
          label="Name"
          value={client.name}
          onChange={(e: any) => setClient({ ...client, name: e.target.value })}
        />
        <Input
          label="Email"
          value={client.email}
          onChange={(e: any) => setClient({ ...client, email: e.target.value })}
        />
      </FieldRow>
      <FieldRow>
        <Input
          label="Phone"
          value={client.phone}
          onChange={(e: any) => setClient({ ...client, phone: e.target.value })}
        />
        <Input
          label="Address"
          value={client.address}
          onChange={(e: any) =>
            setClient({ ...client, address: e.target.value })
          }
        />
      </FieldRow>

      <Divider />

      {/* Invoice details */}
      <SectionTitle>Invoice Details</SectionTitle>
      <FieldRow>
        <Input
          label="Invoice #"
          value={invoiceMeta.number}
          onChange={(e: any) =>
            setInvoiceMeta({ ...invoiceMeta, number: e.target.value })
          }
        />
        <Input
          label="Date"
          type="date"
          value={invoiceMeta.date}
          onChange={(e: any) =>
            setInvoiceMeta({ ...invoiceMeta, date: e.target.value })
          }
        />
      </FieldRow>
      <FieldRow>
        <Input
          label="Due Date"
          type="date"
          value={invoiceMeta.due}
          onChange={(e: any) =>
            setInvoiceMeta({ ...invoiceMeta, due: e.target.value })
          }
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Tax %"
            value={taxPct}
            onChange={setTaxPct}
            min={0}
          />
          <NumberInput
            label="Discount"
            value={discount}
            onChange={setDiscount}
            min={0}
          />
        </div>
      </FieldRow>

      <div className="mt-4">
        <label className="mb-1 block text-sm text-white/70">Notes</label>
        <textarea
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Divider />

      {/* Line Items */}
      <SectionTitle>Line Items</SectionTitle>
      <ItemsEditor
        items={items}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    </motion.div>
  );
}
