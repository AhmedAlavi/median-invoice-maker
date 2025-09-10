export default function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">
      {children}
    </h2>
  );
}
