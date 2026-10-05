import { isCsRequirement } from "@/lib/pathway";
import { cn } from "@/lib/utils";

export function PathwayChips({
  genEd,
  requirements,
  tone = "light",
}: {
  genEd: string[];
  requirements: string[];
  tone?: "light" | "dark";
}) {
  if (genEd.length === 0 && requirements.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {genEd.map((code) => (
        <span
          key={code}
          className={cn(
            "inline-flex h-5 items-center rounded-md px-1.5 font-mono text-[10px] font-medium tracking-wide",
            tone === "dark" ? "bg-white/10 text-stone-100" : "bg-stone-100 text-stone-600",
          )}
        >
          {code}
        </span>
      ))}
      {requirements.map((label) => (
        <span
          key={label}
          className={cn(
            "inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-medium leading-none",
            isCsRequirement(label)
              ? "bg-[#1e3a5f] text-white"
              : tone === "dark"
                ? "border border-white/30 text-stone-100"
                : "border border-stone-300 bg-white text-stone-700",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
