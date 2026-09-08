import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-uh-navy text-uh-gold shadow-paper hover:shadow-float hover:bg-uh-navy/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-gold/70",
  secondary:
    "bg-white text-uh-ink border border-uh-stone/30 hover:border-uh-gold/70 hover:shadow-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-gold/70",
  ghost:
    "bg-transparent text-uh-ink hover:bg-uh-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-gold/70",
  gold:
    "bg-uh-gold text-uh-navy shadow-paper hover:shadow-float hover:bg-uh-gold/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-gold/70",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export default function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}

