import Row from "../ui/Row";
import type { Colors } from "../../types";
import CONFIG from "../../config/defaults";

type Props = {
  colors: Colors;
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  taxPct: number | string;
  discount: number | string;
  currencyFmt: (n: number) => string;
};

export default function TotalsPanel({
  colors,
  notes,
  subtotal,
  tax,
  total,
  taxPct,
  discount,
  currencyFmt,
}: Props) {
  return (
    <>
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
              value={`- ${currencyFmt(Number(discount) || 0)}`}
              color={colors}
            />
            <div
              style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 8 }}
            >
              <div className="flex items-center justify-between">
                <strong>Total</strong>
                <strong>{currencyFmt(total)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-8 grid grid-cols-2 gap-4"
        style={{ fontSize: 11, color: colors.subtext }}
      >
        <div>
          <div>Bank Name: ${CONFIG.bank_account.bank_name}</div>
          <div>Account Name: ${CONFIG.bank_account.account_name}</div>
          <div>Account Number: ${CONFIG.bank_account.account_number}</div>
          <div>Branch: ${CONFIG.bank_account.branch}</div>
          <div>SWIFT/BIC: ${CONFIG.bank_account.swift_bic}</div>
        </div>
        <div className="text-right">
          <div>Thank you for your business.</div>
          <div>Questions? {CONFIG.agency.email}</div>
        </div>
      </div>
    </>
  );
}
