import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-uh-stone/25 bg-white px-4 text-[15px] text-uh-ink outline-none transition",
        "focus:border-uh-gold/80 focus:ring-2 focus:ring-uh-gold/25",
        className,
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";

export default Select;

