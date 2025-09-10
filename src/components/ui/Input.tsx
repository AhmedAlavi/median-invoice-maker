import { type Input } from "../../types";
export default function Input({
  label,
  type = "text",
  value,
  onChange,
}: Input) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full min-w-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
      />
    </div>
  );
}
