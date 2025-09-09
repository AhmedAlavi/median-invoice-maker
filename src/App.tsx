import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { Download, Plus, Trash2, Upload, Sun, Moon } from "lucide-react";
import Particles from "react-tsparticles";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import medianLogoUrl from "./assets/median-logo.png";

// Fixed A4 page "content" width in px for capture, tuned for crispness
const A4_PAGE_WIDTH_PX = 794; // ~210mm at ~96dpi
const A4_PAGE_HEIGHT_PX = 1123; // ~297mm at ~96dpi

// Rough safety padding for top+bottom inside the page frame (in px)
const PAGE_VERTICAL_PADDING = 48;

// Fallback average row height for a line item in the printed table (px).
const FALLBACK_ROW_HEIGHT = 32;

// Split line items into pages based on how many rows fit per page
function paginateItems(
  items: LineItem[],
  rowsPerFirstPage: number,
  rowsPerOtherPages: number
) {
  const pages: LineItem[][] = [];
  let start = 0;

  // first page
  const firstEnd = Math.min(items.length, start + rowsPerFirstPage);
  pages.push(items.slice(start, firstEnd));
  start = firstEnd;

  // next pages
  while (start < items.length) {
    const end = Math.min(items.length, start + rowsPerOtherPages);
    pages.push(items.slice(start, end));
    start = end;
  }
  return pages;
}

// ---- Helper Types ----
type LineItem = {
  id: string;
  description: string;
  qty: number;
  price: number;
};

type Company = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string; // optional default currency
  notes?: string; // optional default notes
  website?: string; // optional override for agency site
};

const COMPANIES_URL =
  "https://ahmedalavi.github.io/median_data/invoice_companies.json";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ---- Main Component ----
export default function MedianInvoiceCreator() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const colors = useMemo(
    () =>
      theme === "dark"
        ? {
            bg: "#0B0B0E",
            surface: "#111317",
            text: "#E5E7EB",
            subtext: "#A3A3A3",
            line: "#25272B",
            lineSoft: "#1C1F24",
            accentA: "#7c5cff", // Median brand orange
            accentB: "#00e7a7", // Median brand red
            shadow: "0 10px 30px rgba(0,0,0,.45)",
          }
        : {
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
    [theme]
  );

  const [agency, setAgency] = useState({
    name: "Median Ltd.",
    email: "hello@median.ltd",
    phone: "+94 7X XXX XXXX",
    address: "Colombo, Sri Lanka",
    website: "median.ltd",
  });

  const [client, setClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [invoiceMeta, setInvoiceMeta] = useState({
    number: "INV-1001",
    date: new Date().toISOString().slice(0, 10),
    due: "",
    currency: "LKR",
  });

  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: "Design & Prototyping", qty: 1, price: 75000 },
  ]);

  const [taxPct, setTaxPct] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState(
    "Fast, collaborative, motion‑first. Thank you for choosing Median. Payments are due within 7 days."
  );

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(medianLogoUrl);

  // Companies (client presets)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  const currencyFmt = useCallback(
    (n: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: invoiceMeta.currency || "LKR",
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 2,
      }).format(n),
    [invoiceMeta.currency]
  );

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0),
    [items]
  );
  const tax = useMemo(() => subtotal * (taxPct / 100), [subtotal, taxPct]);
  const total = useMemo(
    () => Math.max(0, subtotal + tax - (discount || 0)),
    [subtotal, tax, discount]
  );

  const addItem = () =>
    setItems((p) => [...p, { id: uid(), description: "", qty: 1, price: 0 }]);
  const removeItem = (id: string) =>
    setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const onLogoChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const applyCompany = useCallback((c: Company) => {
    setClient((prev) => ({
      name: c.name || prev.name,
      email: c.email || prev.email,
      phone: c.phone || prev.phone,
      address: c.address || prev.address,
    }));
    if (c.currency) setInvoiceMeta((m) => ({ ...m, currency: c.currency! }));
    if (c.notes) setNotes(c.notes);
    if (c.website) setAgency((a) => ({ ...a, website: c.website! }));
    localStorage.setItem("median:lastCompany", c.name);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoadingCompanies(true);
        setCompaniesError(null);
        const res = await fetch(COMPANIES_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list: Company[] = Array.isArray(data)
          ? data
          : data.companies || [];
        if (cancelled) return;
        setCompanies(list);
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
  }, [applyCompany]);

  const exportPDF = async () => {
    // ----- 1) Figure out how many rows fit -----
    // We’ll quickly render one temporary page with a few rows to measure heights.
    const staging = document.getElementById("export-staging");
    if (!staging) return;

    // Minimal page with 6 rows to measure row height and available space
    const testItems: LineItem[] = Array.from({ length: 6 }).map((_, i) => ({
      id: uid(),
      description: `Measure row ${i + 1}`,
      qty: 1,
      price: 1000,
    }));

    const testPage = buildExportPageNode({
      colors,
      theme,
      agency,
      client,
      invoiceMeta,
      notes,
      currencyFmt,
      logoDataUrl,
      pageItems: testItems,
    });

    staging.appendChild(testPage);

    // Measure the table pieces
    const tableEl = testPage.querySelector("table") as HTMLTableElement | null;
    const theadEl = testPage.querySelector("thead") as HTMLElement | null;
    const rowEls = Array.from(
      testPage.querySelectorAll("tbody tr")
    ) as HTMLElement[];

    const headHeight = theadEl?.getBoundingClientRect().height || 0;
    const rowHeight =
      rowEls.length > 0
        ? rowEls[0].getBoundingClientRect().height
        : FALLBACK_ROW_HEIGHT;

    // More reliable: measure everything above the table.
    const tableTop = tableEl?.getBoundingClientRect().top || 0;
    const pageTop = testPage.getBoundingClientRect().top || 0;
    const usedTop = tableTop - pageTop;

    // Keep some bottom padding for footer/totals/notes
    const usableHeightFirst =
      A4_PAGE_HEIGHT_PX - usedTop - PAGE_VERTICAL_PADDING;
    const usableHeightOther = A4_PAGE_HEIGHT_PX - PAGE_VERTICAL_PADDING - 32; // no chips/intro usually, but keep safe pad

    // Rows we can fit (minus header height)
    const rowsPerFirstPage = Math.max(
      1,
      Math.floor((usableHeightFirst - headHeight - 16) / rowHeight)
    );
    const rowsPerOtherPages = Math.max(
      1,
      Math.floor((usableHeightOther - headHeight - 16) / rowHeight)
    );

    staging.removeChild(testPage);

    // ----- 2) Paginate items -----
    const pagesOfItems = paginateItems(
      items,
      rowsPerFirstPage,
      rowsPerOtherPages
    );

    // ----- 3) Build real pages -----
    const realPages: HTMLDivElement[] = pagesOfItems.map(
      (pageItems) =>
        buildExportPageNode({
          colors,
          theme,
          agency,
          client,
          invoiceMeta,
          notes, // notes appear later on last page; adding here doesn’t hurt but we’ll render totals later
          currencyFmt,
          logoDataUrl,
          pageItems,
        }) as HTMLDivElement
    );

    // Append totals/notes on the **last page only**
    const isMulti = realPages.length > 0;
    if (isMulti) {
      const lastPage = realPages[realPages.length - 1];

      // Totals block (mirrors preview)
      const totalsWrap = document.createElement("div");
      totalsWrap.style.display = "grid";
      totalsWrap.style.gridTemplateColumns = "1fr 1fr";
      totalsWrap.style.gap = "16px";
      totalsWrap.style.marginTop = "24px";
      totalsWrap.style.fontSize = "12px";

      const notesCol = document.createElement("div");
      const notesH = document.createElement("h4");
      notesH.textContent = "Notes";
      Object.assign(notesH.style, {
        fontSize: "12px",
        fontWeight: "700",
        letterSpacing: "1px",
        color: colors.subtext,
        margin: "0",
      });
      const notesP = document.createElement("p");
      notesP.textContent = notes;
      Object.assign(notesP.style, {
        marginTop: "8px",
        whiteSpace: "pre-wrap",
        lineHeight: "1.6",
        color: colors.subtext,
      });
      notesCol.appendChild(notesH);
      notesCol.appendChild(notesP);

      const totalsCol = document.createElement("div");
      totalsCol.style.marginLeft = "auto";
      totalsCol.style.width = "100%";
      totalsCol.style.maxWidth = "260px";
      totalsCol.style.fontSize = "13px";

      const mkRow = (label: string, value: string, strong?: boolean) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.marginTop = "6px";
        const l = document.createElement("div");
        l.textContent = label;
        l.style.color = colors.subtext;
        const v = document.createElement("div");
        v.textContent = value;
        v.style.color = colors.text;
        if (strong) v.style.fontWeight = "700";
        row.appendChild(l);
        row.appendChild(v);
        return row;
      };

      const subtotalVal = items.reduce(
        (s, it) => s + (it.qty || 0) * (it.price || 0),
        0
      );
      const taxVal = subtotalVal * (taxPct / 100);
      const totalVal = Math.max(0, subtotalVal + taxVal - (discount || 0));

      totalsCol.appendChild(mkRow("Subtotal", currencyFmt(subtotalVal)));
      totalsCol.appendChild(
        mkRow(`Tax (${taxPct || 0}%)`, currencyFmt(taxVal))
      );
      totalsCol.appendChild(
        mkRow("Discount", `- ${currencyFmt(discount || 0)}`)
      );
      const sep = document.createElement("div");
      sep.style.borderTop = `1px solid ${colors.line}`;
      sep.style.marginTop = "8px";
      sep.style.paddingTop = "8px";
      totalsCol.appendChild(sep);
      totalsCol.appendChild(mkRow("Total", currencyFmt(totalVal), true));

      totalsWrap.appendChild(notesCol);
      totalsWrap.appendChild(totalsCol);
      lastPage.appendChild(totalsWrap);

      // Footer (bank + thanks)
      const footer = document.createElement("div");
      footer.style.display = "grid";
      footer.style.gridTemplateColumns = "1fr 1fr";
      footer.style.gap = "16px";
      footer.style.marginTop = "24px";
      footer.style.fontSize = "11px";
      footer.style.color = colors.subtext;

      const f1 = document.createElement("div");
      f1.innerHTML = `
        <div>Bank Transfer</div>
        <div>Account Name: ${agency.name}</div>
        <div>Bank: — | IBAN: — | SWIFT: —</div>
      `;
      const f2 = document.createElement("div");
      f2.style.textAlign = "right";
      f2.innerHTML = `
        <div>Thank you for your business.</div>
        <div>Questions? ${agency.email}</div>
      `;

      footer.appendChild(f1);
      footer.appendChild(f2);
      lastPage.appendChild(footer);
    }

    // Mount all pages in staging for html-to-image to read computed styles
    realPages.forEach((p) => staging.appendChild(p));

    // ----- 4) Render each page and build the PDF -----
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    for (let i = 0; i < realPages.length; i++) {
      const node = realPages[i];

      // Render to PNG
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: colors.bg,
        pixelRatio: 2, // crisp
        width: A4_PAGE_WIDTH_PX,
        height: A4_PAGE_HEIGHT_PX,
      });

      // Fit to PDF page
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(dataUrl);
      let imgW = pageWidth;
      let imgH = (imgProps.height * imgW) / imgProps.width;
      if (imgH > pageHeight) {
        imgH = pageHeight;
        imgW = (imgProps.width * imgH) / imgProps.height;
      }

      if (i > 0) pdf.addPage();
      pdf.addImage(
        dataUrl,
        "PNG",
        (pageWidth - imgW) / 2,
        (pageHeight - imgH) / 2,
        imgW,
        imgH
      );
    }

    // Cleanup
    realPages.forEach((p) => staging.removeChild(p));

    // Save
    pdf.save(`${invoiceMeta.number || "invoice"}.pdf`);
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden text-white"
      style={{ backgroundColor: "#000" }}
    >
      {/* Particles background */}
      <Particles
        id="tsparticles"
        className="absolute inset-0"
        options={{
          background: { color: { value: "#000000" } },
          fullScreen: { enable: false },
          fpsLimit: 60,
          particles: {
            number: { value: 40, density: { enable: true, area: 800 } },
            color: { value: ["#ffffff", colors.accentA, colors.accentB] },
            opacity: { value: 0.25 },
            size: { value: { min: 1, max: 3 } },
            links: {
              enable: true,
              opacity: 0.15,
              distance: 130,
              color: "#ffffff",
            },
            move: { enable: true, speed: 0.8 },
          },
          detectRetina: true,
        }}
      />

      {/* Page content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-semibold tracking-tight text-white/90 md:text-3xl"
          >
            Median — Simple Invoice Creator
          </motion.h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black shadow hover:shadow-lg"
            >
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Form */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md md:p-6"
          >
            <SectionTitle>Agency</SectionTitle>
            <FieldRow>
              <Input
                label="Name"
                value={agency.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAgency({ ...agency, name: e.target.value })
                }
              />
              <Input
                label="Email"
                value={agency.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAgency({ ...agency, email: e.target.value })
                }
              />
            </FieldRow>
            <FieldRow>
              <Input
                label="Phone"
                value={agency.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAgency({ ...agency, phone: e.target.value })
                }
              />
              <Input
                label="Website"
                value={agency.website}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAgency({ ...agency, website: e.target.value })
                }
              />
            </FieldRow>
            <Input
              label="Address"
              value={agency.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAgency({ ...agency, address: e.target.value })
              }
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
              <div>
                <label className="mb-1 block text-sm text-white/70">
                  Currency
                </label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
                  value={invoiceMeta.currency}
                  onChange={(e) =>
                    setInvoiceMeta({ ...invoiceMeta, currency: e.target.value })
                  }
                >
                  {["LKR", "USD", "EUR", "GBP", "AED", "INR"].map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Divider />

            {/* Quick-pick client pills */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {isLoadingCompanies && (
                <span className="text-xs text-white/60">
                  Loading companies…
                </span>
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
                <span className="text-xs text-red-300">
                  Failed: {companiesError}
                </span>
              )}
            </div>

            <SectionTitle>Client</SectionTitle>
            <FieldRow>
              <Input
                label="Name"
                value={client.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setClient({ ...client, name: e.target.value })
                }
              />
              <Input
                label="Email"
                value={client.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setClient({ ...client, email: e.target.value })
                }
              />
            </FieldRow>
            <FieldRow>
              <Input
                label="Phone"
                value={client.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setClient({ ...client, phone: e.target.value })
                }
              />
              <Input
                label="Address"
                value={client.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setClient({ ...client, address: e.target.value })
                }
              />
            </FieldRow>

            <Divider />

            <SectionTitle>Invoice Details</SectionTitle>
            <FieldRow>
              <Input
                label="Invoice #"
                value={invoiceMeta.number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setInvoiceMeta({ ...invoiceMeta, number: e.target.value })
                }
              />
              <Input
                label="Date"
                type="date"
                value={invoiceMeta.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setInvoiceMeta({ ...invoiceMeta, date: e.target.value })
                }
              />
            </FieldRow>
            <FieldRow>
              <Input
                label="Due Date"
                type="date"
                value={invoiceMeta.due}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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

            <SectionTitle>Line Items</SectionTitle>
            <div className="space-y-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="grid grid-cols-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <input
                    className="col-span-6 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) =>
                      updateItem(it.id, { description: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    className="col-span-2 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Qty"
                    value={it.qty}
                    min={0}
                    onChange={(e) =>
                      updateItem(it.id, { qty: Number(e.target.value) })
                    }
                  />
                  <input
                    type="number"
                    className="col-span-3 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Unit price"
                    value={it.price}
                    min={0}
                    onChange={(e) =>
                      updateItem(it.id, { price: Number(e.target.value) })
                    }
                  />
                  <button
                    onClick={() => removeItem(it.id)}
                    className="col-span-1 inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <button
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              >
                <Plus className="h-4 w-4" /> Add line
              </button>
            </div>
          </motion.div>

          {/* Right: Preview */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/70">
                <span className="mr-2">Subtotal:</span>
                <strong className="text-white">{currencyFmt(subtotal)}</strong>
                <span className="mx-2">•</span>
                <span className="mr-2">Tax:</span>
                <strong className="text-white">{currencyFmt(tax)}</strong>
                <span className="mx-2">•</span>
                <span className="mr-2">Total:</span>
                <strong className="text-white">{currencyFmt(total)}</strong>
              </div>
            </div>

            <div
              ref={previewRef}
              id="invoice-preview"
              className="relative rounded-2xl p-8 shadow-2xl"
              style={{
                width: "100%",
                aspectRatio: "1/1.414",
                backgroundColor: colors.bg,
                color: colors.text,
                boxShadow: colors.shadow,
              }}
            >
              {/* Accent bars */}
              <div
                style={{
                  position: "absolute",
                  insetInline: 0,
                  top: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${colors.accentA}, ${colors.accentB})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  insetInline: 0,
                  bottom: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${colors.accentB}, ${colors.accentA})`,
                }}
              />

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: -0.2,
                    }}
                  >
                    Invoice
                  </div>
                  <div
                    className="mt-1"
                    style={{ fontSize: 12, color: colors.subtext }}
                  >
                    {invoiceMeta.number}
                  </div>
                  <div
                    className="mt-1"
                    style={{ fontSize: 12, color: colors.subtext }}
                  >
                    Date: {invoiceMeta.date || "—"}
                  </div>
                  {invoiceMeta.due && (
                    <div
                      className="mt-1"
                      style={{ fontSize: 12, color: colors.subtext }}
                    >
                      Due: {invoiceMeta.due}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt="Logo"
                      style={{
                        height: 48,
                        width: "auto",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 48,
                        width: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px dashed ${colors.line}`,
                        color: colors.subtext,
                        fontSize: 10,
                      }}
                    >
                      LOGO
                    </div>
                  )}
                </div>
              </div>

              {/* Feature chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Discovery & goals",
                  "Prototype & motion",
                  "Build & integrate",
                  "Launch & optimize",
                ].map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      color: colors.text,
                      background: theme === "dark" ? "#15171C" : "#F3F4F6",
                      border: `1px solid ${
                        theme === "dark" ? colors.line : colors.line
                      }`,
                      padding: "6px 10px",
                      borderRadius: 9999,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Agency / Client */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <h3
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: colors.subtext,
                    }}
                  >
                    From
                  </h3>
                  <div
                    className="mt-1"
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    {agency.name}
                  </div>
                  <div style={{ fontSize: 12, color: colors.subtext }}>
                    {agency.address}
                  </div>
                  <div style={{ fontSize: 12, color: colors.subtext }}>
                    {agency.email} · {agency.phone}
                  </div>
                  <div style={{ fontSize: 12, color: colors.subtext }}>
                    {agency.website}
                  </div>
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: colors.subtext,
                    }}
                  >
                    Bill To
                  </h3>
                  <div
                    className="mt-1"
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    {client.name || "Client Name"}
                  </div>
                  <div style={{ fontSize: 12, color: colors.subtext }}>
                    {client.address || "Address"}
                  </div>
                  <div style={{ fontSize: 12, color: colors.subtext }}>
                    {client.email || "email@example.com"} · {client.phone || ""}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mt-6">
                <table className="w-full" style={{ fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.line}` }}>
                      <th
                        className="py-2 text-left"
                        style={{
                          color: colors.subtext,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Description
                      </th>
                      <th
                        className="py-2 text-right"
                        style={{
                          color: colors.subtext,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Qty
                      </th>
                      <th
                        className="py-2 text-right"
                        style={{
                          color: colors.subtext,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Unit
                      </th>
                      <th
                        className="py-2 text-right"
                        style={{
                          color: colors.subtext,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr
                        key={it.id}
                        style={{ borderBottom: `1px solid ${colors.lineSoft}` }}
                      >
                        <td
                          className="py-2 pr-2"
                          style={{ color: colors.text, fontWeight: 500 }}
                        >
                          {it.description || "Item"}
                        </td>
                        <td
                          className="py-2 text-right"
                          style={{ color: colors.subtext }}
                        >
                          {it.qty || 0}
                        </td>
                        <td
                          className="py-2 text-right"
                          style={{ color: colors.subtext }}
                        >
                          {currencyFmt(it.price || 0)}
                        </td>
                        <td
                          className="py-2 text-right"
                          style={{ color: colors.text, fontWeight: 600 }}
                        >
                          {currencyFmt((it.qty || 0) * (it.price || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: colors.subtext,
                    }}
                  >
                    Notes
                  </h4>
                  <p
                    className="mt-2"
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: colors.subtext,
                    }}
                  >
                    {notes}
                  </p>
                </div>
                <div className="ml-auto w-full max-w-xs">
                  <div className="space-y-2" style={{ fontSize: 13 }}>
                    <Row
                      label="Subtotal"
                      value={currencyFmt(subtotal)}
                      color={colors}
                    />
                    <Row
                      label={`Tax (${taxPct || 0}%)`}
                      value={currencyFmt(tax)}
                      color={colors}
                    />
                    <Row
                      label="Discount"
                      value={`- ${currencyFmt(discount || 0)}`}
                      color={colors}
                    />
                    <div
                      style={{
                        borderTop: `1px solid ${colors.line}`,
                        paddingTop: 8,
                      }}
                    >
                      <Row
                        label={<strong>Total</strong>}
                        value={<strong>{currencyFmt(total)}</strong>}
                        color={colors}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer bar */}
              <div
                className="mt-8 grid grid-cols-2 gap-4"
                style={{ fontSize: 11, color: colors.subtext }}
              >
                <div>
                  <div>Bank Transfer</div>
                  <div>Account Name: {agency.name}</div>
                  <div>Bank: — | IBAN: — | SWIFT: —</div>
                </div>
                <div className="text-right">
                  <div>Thank you for your business.</div>
                  <div>Questions? {agency.email}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      {/* Hidden container used only for export rendering */}
      <div
        id="export-staging"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
          opacity: 0,
        }}
      />
    </div>
  );
}

// ---- UI bits ----
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">
      {children}
    </h2>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
  );
}

function Divider() {
  return <div className="my-4 h-px w-full bg-white/10" />;
}

function Input({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: any;
  onChange: any;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
      />
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  color: any;
}) {
  return (
    <div className="flex items-center justify-between">
      <div style={{ color: color.subtext }}>{label}</div>
      <div style={{ color: color.text }}>{value}</div>
    </div>
  );
}

function buildExportPageNode({
  colors,
  theme,
  agency,
  client,
  invoiceMeta,
  // notes,
  currencyFmt,
  logoDataUrl,
  pageItems,
}: {
  colors: any;
  theme: "light" | "dark";
  agency: any;
  client: any;
  invoiceMeta: any;
  notes: string;
  currencyFmt: (n: number) => string;
  logoDataUrl: string | null;
  pageItems: LineItem[];
}) {
  const page = document.createElement("div");
  page.style.width = `${A4_PAGE_WIDTH_PX}px`;
  page.style.height = `${A4_PAGE_HEIGHT_PX}px`;
  page.style.background = colors.bg;
  page.style.color = colors.text;
  page.style.boxShadow = colors.shadow;
  page.style.borderRadius = "16px";
  page.style.padding = "32px";
  page.style.boxSizing = "border-box";
  page.style.position = "relative";
  page.style.fontFamily =
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, 'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji'";

  // Top accent
  const topBar = document.createElement("div");
  topBar.style.position = "absolute";
  topBar.style.left = "0";
  topBar.style.right = "0";
  topBar.style.top = "0";
  topBar.style.height = "4px";
  topBar.style.background = `linear-gradient(90deg, ${colors.accentA}, ${colors.accentB})`;
  page.appendChild(topBar);

  // Bottom accent
  const bottomBar = document.createElement("div");
  bottomBar.style.position = "absolute";
  bottomBar.style.left = "0";
  bottomBar.style.right = "0";
  bottomBar.style.bottom = "0";
  bottomBar.style.height = "4px";
  bottomBar.style.background = `linear-gradient(90deg, ${colors.accentB}, ${colors.accentA})`;
  page.appendChild(bottomBar);

  // Header row
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "flex-start";

  const left = document.createElement("div");
  const title = document.createElement("div");
  title.textContent = "Invoice";
  Object.assign(title.style, {
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "-0.2px",
  });

  const invNo = document.createElement("div");
  invNo.textContent = invoiceMeta.number;
  Object.assign(invNo.style, {
    marginTop: "4px",
    fontSize: "12px",
    color: colors.subtext,
  });

  const date = document.createElement("div");
  date.textContent = `Date: ${invoiceMeta.date || "—"}`;
  Object.assign(date.style, {
    marginTop: "4px",
    fontSize: "12px",
    color: colors.subtext,
  });

  left.appendChild(title);
  left.appendChild(invNo);
  left.appendChild(date);

  if (invoiceMeta.due) {
    const due = document.createElement("div");
    due.textContent = `Due: ${invoiceMeta.due}`;
    Object.assign(due.style, {
      marginTop: "4px",
      fontSize: "12px",
      color: colors.subtext,
    });
    left.appendChild(due);
  }

  const right = document.createElement("div");
  if (logoDataUrl) {
    const img = document.createElement("img");
    img.src = logoDataUrl;
    img.alt = "Logo";
    Object.assign(img.style, {
      height: "48px",
      width: "auto",
      objectFit: "contain",
    });
    right.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.textContent = "LOGO";
    Object.assign(ph.style, {
      height: "48px",
      width: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: `1px dashed ${colors.line}`,
      color: colors.subtext,
      fontSize: "10px",
    });
    right.appendChild(ph);
  }

  header.appendChild(left);
  header.appendChild(right);
  page.appendChild(header);

  // Chips (small)
  const chips = document.createElement("div");
  chips.style.display = "flex";
  chips.style.flexWrap = "wrap";
  chips.style.gap = "8px";
  chips.style.marginTop = "16px";
  [
    "Discovery & goals",
    "Prototype & motion",
    "Build & integrate",
    "Launch & optimize",
  ].forEach((t) => {
    const chip = document.createElement("span");
    chip.textContent = t;
    Object.assign(chip.style, {
      fontSize: "11px",
      color: colors.text,
      background: theme === "dark" ? "#15171C" : "#F3F4F6",
      border: `1px solid ${colors.line}`,
      padding: "6px 10px",
      borderRadius: "9999px",
    });
    chips.appendChild(chip);
  });
  page.appendChild(chips);

  // From / Bill To
  const twoCols = document.createElement("div");
  twoCols.style.display = "grid";
  twoCols.style.gridTemplateColumns = "1fr 1fr";
  twoCols.style.gap = "16px";
  twoCols.style.marginTop = "24px";

  const from = document.createElement("div");
  const fromH = document.createElement("h3");
  fromH.textContent = "From";
  Object.assign(fromH.style, {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: colors.subtext,
    margin: "0 0 4px 0",
  });
  const fromName = document.createElement("div");
  fromName.textContent = agency.name;
  Object.assign(fromName.style, { fontSize: "14px", fontWeight: "600" });
  const fromAddr = document.createElement("div");
  fromAddr.textContent = agency.address;
  Object.assign(fromAddr.style, { fontSize: "12px", color: colors.subtext });
  const fromEP = document.createElement("div");
  fromEP.textContent = `${agency.email} · ${agency.phone}`;
  Object.assign(fromEP.style, { fontSize: "12px", color: colors.subtext });
  const fromWeb = document.createElement("div");
  fromWeb.textContent = agency.website;
  Object.assign(fromWeb.style, { fontSize: "12px", color: colors.subtext });
  from.appendChild(fromH);
  from.appendChild(fromName);
  from.appendChild(fromAddr);
  from.appendChild(fromEP);
  from.appendChild(fromWeb);

  const bill = document.createElement("div");
  const billH = document.createElement("h3");
  billH.textContent = "Bill To";
  Object.assign(billH.style, {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: colors.subtext,
    margin: "0 0 4px 0",
  });
  const billName = document.createElement("div");
  billName.textContent = client.name || "Client Name";
  Object.assign(billName.style, { fontSize: "14px", fontWeight: "600" });
  const billAddr = document.createElement("div");
  billAddr.textContent = client.address || "Address";
  Object.assign(billAddr.style, { fontSize: "12px", color: colors.subtext });
  const billEP = document.createElement("div");
  billEP.textContent = `${client.email || "email@example.com"} · ${
    client.phone || ""
  }`;
  Object.assign(billEP.style, { fontSize: "12px", color: colors.subtext });
  bill.appendChild(billH);
  bill.appendChild(billName);
  bill.appendChild(billAddr);
  bill.appendChild(billEP);

  twoCols.appendChild(from);
  twoCols.appendChild(bill);
  page.appendChild(twoCols);

  // ITEMS TABLE (always repeats header on new page)
  const tableWrap = document.createElement("div");
  tableWrap.style.marginTop = "24px";
  tableWrap.style.fontSize = "13px";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const thead = document.createElement("thead");
  const trH = document.createElement("tr");
  trH.style.borderBottom = `1px solid ${colors.line}`;

  const th1 = document.createElement("th");
  th1.textContent = "Description";
  Object.assign(th1.style, {
    textAlign: "left",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  const th2 = document.createElement("th");
  th2.textContent = "Qty";
  Object.assign(th2.style, {
    textAlign: "right",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  const th3 = document.createElement("th");
  th3.textContent = "Unit";
  Object.assign(th3.style, {
    textAlign: "right",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  const th4 = document.createElement("th");
  th4.textContent = "Amount";
  Object.assign(th4.style, {
    textAlign: "right",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  trH.appendChild(th1);
  trH.appendChild(th2);
  trH.appendChild(th3);
  trH.appendChild(th4);
  thead.appendChild(trH);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  pageItems.forEach((it) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = `1px solid ${colors.lineSoft}`;

    const td1 = document.createElement("td");
    td1.textContent = it.description || "Item";
    Object.assign(td1.style, {
      padding: "8px 8px 8px 0",
      color: colors.text,
      fontWeight: "500",
    });

    const td2 = document.createElement("td");
    td2.textContent = String(it.qty || 0);
    Object.assign(td2.style, {
      textAlign: "right",
      padding: "8px 0",
      color: colors.subtext,
    });

    const td3 = document.createElement("td");
    td3.textContent = currencyFmt(it.price || 0);
    Object.assign(td3.style, {
      textAlign: "right",
      padding: "8px 0",
      color: colors.subtext,
    });

    const td4 = document.createElement("td");
    td4.textContent = currencyFmt((it.qty || 0) * (it.price || 0));
    Object.assign(td4.style, {
      textAlign: "right",
      padding: "8px 0",
      color: colors.text,
      fontWeight: "600",
    });

    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  page.appendChild(tableWrap);

  // Notes and total block only on the **last** page — caller can append totals later if needed.
  // We'll append totals externally when we build the *last* page.

  return page;
}
