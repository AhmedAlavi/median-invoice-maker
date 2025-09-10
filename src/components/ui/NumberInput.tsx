import { type NumberInput } from "../../types";
export default function NumberInput({
  label,
  value,
  onChange,
  min = 0,
}: NumberInput) {
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
