type Props = {
  colors: any;
  invoiceMeta: { number: string; date: string; due: string };
  logoDataUrl: string | null;
};

export default function InvoiceHeader({
  colors,
  invoiceMeta,
  logoDataUrl,
}: Props) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.2 }}>
          Invoice
        </div>
        <div className="mt-1" style={{ fontSize: 12, color: colors.subtext }}>
          {invoiceMeta.number}
        </div>
        <div className="mt-1" style={{ fontSize: 12, color: colors.subtext }}>
          Date: {invoiceMeta.date || "—"}
        </div>
        {invoiceMeta.due && (
          <div className="mt-1" style={{ fontSize: 12, color: colors.subtext }}>
            Due: {invoiceMeta.due}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt="Logo"
            style={{ height: 48, width: "auto", objectFit: "contain" }}
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
  );
}
