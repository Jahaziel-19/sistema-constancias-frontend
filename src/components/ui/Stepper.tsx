import { cn } from "@/lib/utils";

export default function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items: Array<{ n: 1 | 2 | 3; label: string }> = [
    { n: 1, label: "Tipo" },
    { n: 2, label: "Destinatario" },
    { n: 3, label: "Emisión" },
  ];

  return (
    <div className="flex items-center gap-3">
      {items.map((it, idx) => {
        const active = it.n === step;
        const done = it.n < step;
        return (
          <div key={it.n} className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold",
                done ? "border-uh-gold/40 bg-uh-gold/15 text-uh-navy" : active ? "border-uh-gold bg-white text-uh-ink" : "border-uh-stone/25 bg-white text-uh-stone/70",
              )}
            >
              {it.n}
            </div>
            <div className={cn("text-xs font-semibold tracking-[0.18em]", active ? "text-uh-ink" : "text-uh-stone/70")}>
              {it.label.toUpperCase()}
            </div>
            {idx < items.length - 1 ? <div className={cn("h-px w-10", done ? "bg-uh-gold/60" : "bg-uh-stone/20")} /> : null}
          </div>
        );
      })}
    </div>
  );
}

