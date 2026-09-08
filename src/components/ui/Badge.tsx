import { cn } from "@/lib/utils";

type Variant = "emerald" | "blue" | "red" | "stone";

const map: Record<Variant, string> = {
  emerald: "border-uh-emerald/25 bg-uh-emerald/10 text-uh-emerald",
  blue: "border-uh-navy/15 bg-uh-navy/5 text-uh-navy",
  red: "border-uh-red/25 bg-uh-red/5 text-uh-red",
  stone: "border-uh-stone/25 bg-uh-paper/70 text-uh-stone",
};

export default function Badge({ children, variant = "stone" }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-[0.12em]",
        map[variant],
      )}
    >
      {children}
    </span>
  );
}

