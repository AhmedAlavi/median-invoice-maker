import type { Colors } from "../../types";

export default function Row({
  label,
  value,
  color,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  color: Colors;
}) {
  return (
    <div className="flex items-center justify-between">
      <div style={{ color: color?.subtext }}>{label}</div>
      <div style={{ color: color?.text }}>{value}</div>
    </div>
  );
}
