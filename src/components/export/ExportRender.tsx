export default function ExportRender() {
  return (
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
  );
}
