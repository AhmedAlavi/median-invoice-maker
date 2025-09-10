import type { LineItem } from "../../types";

type Props = {
  items: LineItem[];
  colors: any;
  currencyFmt: (n: number) => string;
};

export default function ItemsTable({ items, colors, currencyFmt }: Props) {
  return (
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
              <td className="py-2 text-right" style={{ color: colors.subtext }}>
                {it.qty || 0}
              </td>
              <td className="py-2 text-right" style={{ color: colors.subtext }}>
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
  );
}
