const CHIP_COLORS: Record<string, { background: string; color: string }> = {
  SB: { background: "#0f766e", color: "#ffffff" },
  DG: { background: "#b45309", color: "#ffffff" },
  DU: { background: "#be123c", color: "#ffffff" },
  AT: { background: "#6d28d9", color: "#ffffff" },
  HS: { background: "#92400e", color: "#ffffff" },
  R2: { background: "#1d4ed8", color: "#ffffff" },
  SI: { background: "#334155", color: "#ffffff" },
  "CS elective": { background: "#1e3a5f", color: "#ffffff" },
  JYW: { background: "#047857", color: "#ffffff" },
};

function chipColor(label: string) {
  if (CHIP_COLORS[label]) return CHIP_COLORS[label];
  if (label === "IE" || label.startsWith("IE (")) return { background: "#c2410c", color: "#ffffff" };
  return { background: "#44403c", color: "#ffffff" };
}

export function PathwayChips({
  genEd,
  requirements,
}: {
  genEd: string[];
  requirements: string[];
}) {
  if (genEd.length === 0 && requirements.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {[...genEd, ...requirements].map((label) => (
        <span
          key={label}
          className="inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold tracking-wide whitespace-nowrap"
          style={chipColor(label)}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
