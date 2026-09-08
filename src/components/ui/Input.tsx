import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-uh-stone/25 bg-white px-4 text-[15px] text-uh-ink outline-none transition",
        "placeholder:text-uh-stone/60 focus:border-uh-gold/80 focus:ring-2 focus:ring-uh-gold/25",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export default Input;

