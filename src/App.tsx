import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Sun, Moon } from "lucide-react";
import Particles from "react-tsparticles";
import medianLogoUrl from "./assets/median-logo.png";
import type { LineItem } from "./types";
import InvoiceHeader from "./components/InvoicePreview/InvoiceHeader";
import ItemsTable from "./components/InvoicePreview/ItemsTable";
import TotalsPanel from "./components/InvoicePreview/TotalsPanel";
import InvoiceForm from "./components/InvoiceForm/InvoiceForm";
import CONFIG from "./config/defaults";
import { uid } from "./helpers";
import { useCurrencyFormatter } from "./hooks/useCurrencyFormatter";
import { exportPDF } from "./helpers/exportPDF";
import ExportRender from "./components/export/ExportRender";

// ---- Main Component ----
export default function MedianInvoiceCreator() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const colors = useMemo(() => CONFIG.ui.colors[theme], [theme]);
  const processChips = CONFIG.ui.processChips;
  const [agency, setAgency] = useState(CONFIG.agency);

  const [client, setClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [invoiceMeta, setInvoiceMeta] = useState({
    number: `INV-${new Date().toISOString().slice(0, 10)}-${uid()}`,
    date: new Date().toISOString().slice(0, 10),
    due: "",
    currency: "LKR",
  });

  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: "Design & Prototyping", qty: 1, price: 75000 },
  ]);

  const [taxPct, setTaxPct] = useState<number | string>(0);
  const [discount, setDiscount] = useState<number | string>(0);
  const [notes, setNotes] = useState<string>(CONFIG.defaults.notes);

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(medianLogoUrl);

  useEffect(() => {
    async function toBase64(url: string) {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    toBase64(medianLogoUrl).then((base64) => setLogoDataUrl(base64));
  }, []);

  const previewRef = useRef<HTMLDivElement>(null);

  const currencyFmt = useCurrencyFormatter(invoiceMeta.currency || "LKR");

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0),
    [items]
  );
  const tax = useMemo(
    () => subtotal * (Number(taxPct) / 100),
    [subtotal, taxPct]
  );
  const total = useMemo(
    () => Math.max(0, subtotal + tax - (Number(discount) || 0)),
    [subtotal, tax, discount]
  );

  const addItem = () =>
    setItems((p) => [...p, { id: uid(), description: "", qty: 1, price: 0 }]);
  const removeItem = (id: string) =>
    setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

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
            Median{" "}
            <span className="hidden md:inline">— Simple Invoice Creator</span>
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
              onClick={() =>
                exportPDF(
                  colors,
                  theme,
                  agency,
                  client,
                  invoiceMeta,
                  notes,
                  currencyFmt,
                  logoDataUrl,
                  items,
                  taxPct,
                  discount
                )
              }
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black shadow hover:shadow-lg"
            >
              <Download className="h-4 w-4" />{" "}
              <span className="hidden md:inline">Export</span> PDF
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Form */}
          <InvoiceForm
            agency={agency}
            setAgency={setAgency}
            client={client}
            setClient={setClient}
            invoiceMeta={invoiceMeta}
            setInvoiceMeta={setInvoiceMeta}
            taxPct={taxPct}
            setTaxPct={setTaxPct}
            discount={discount}
            setDiscount={setDiscount}
            notes={notes}
            setNotes={setNotes}
            items={items}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            logoDataUrl={logoDataUrl}
            setLogoDataUrl={setLogoDataUrl}
          />

          {/* Right: Preview */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="min-w-0 flex flex-col gap-4"
          >
            <div className="flex flex-wrap text-sm text-white/70">
              <span className="mr-2">Subtotal:</span>
              <strong className="text-white">{currencyFmt(subtotal)}</strong>
              <span className="mx-2">•</span>
              <span className="mr-2">Tax:</span>
              <strong className="text-white">{currencyFmt(tax)}</strong>
              <span className="mx-2">•</span>
              <span className="mr-2">Total:</span>
              <strong className="text-white">{currencyFmt(total)}</strong>
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
              <InvoiceHeader
                colors={colors}
                invoiceMeta={invoiceMeta}
                logoDataUrl={logoDataUrl}
              />

              {/* Feature chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {processChips.map((t) => (
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
              <ItemsTable
                items={items}
                colors={colors}
                currencyFmt={currencyFmt}
              />

              {/* Totals */}
              <TotalsPanel
                colors={colors}
                notes={notes}
                subtotal={subtotal}
                tax={tax}
                total={total}
                taxPct={taxPct}
                discount={discount}
                currencyFmt={currencyFmt}
              />
            </div>
          </motion.div>
        </div>
      </div>
      {/* Hidden container used only for export rendering */}
      <ExportRender />
    </div>
  );
}
