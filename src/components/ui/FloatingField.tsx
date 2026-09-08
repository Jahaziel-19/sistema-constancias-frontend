import { useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function FloatingField({ label, className, id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label className={cn("group relative block", className)} htmlFor={inputId}>
      <input
        id={inputId}
        className={cn(
          "peer h-12 w-full rounded-xl border border-uh-stone/25 bg-white px-4 pt-4 text-[15px] text-uh-ink outline-none transition",
          "placeholder:text-transparent focus:border-uh-gold/80 focus:ring-2 focus:ring-uh-gold/25",
        )}
        placeholder={label}
        {...props}
      />
      <span
        className={cn(
          "pointer-events-none absolute left-4 top-3 text-xs font-semibold tracking-[0.14em] text-uh-stone/80 transition",
          "peer-placeholder-shown:top-4 peer-placeholder-shown:text-[13px] peer-placeholder-shown:font-medium peer-placeholder-shown:tracking-[0.08em] peer-placeholder-shown:text-uh-stone/60",
          "peer-focus:top-3 peer-focus:text-xs peer-focus:font-semibold peer-focus:tracking-[0.14em] peer-focus:text-uh-gold",
        )}
      >
        {label.toUpperCase()}
      </span>
    </label>
  );
}

