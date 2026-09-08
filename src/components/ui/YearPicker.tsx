import Select, { type SelectProps } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

type YearPickerProps = Omit<SelectProps, "value" | "onChange"> & {
  value: number | string;
  onChange: (value: string) => void;
  startYear?: number;
  endYear?: number;
  label?: string;
  className?: string;
};

const DEFAULT_START_YEAR = 1980;
const DEFAULT_END_YEAR = 2050;

function getDefaultRange(): { start: number; end: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  return { start: Math.min(DEFAULT_START_YEAR, currentYear - 10), end: Math.max(DEFAULT_END_YEAR, currentYear + 10) };
}

export default function YearPicker({
  value,
  onChange,
  startYear,
  endYear,
  label,
  className,
  ...props
}: YearPickerProps) {
  const { start, end } = getDefaultRange();
  const from = startYear ?? start;
  const to = endYear ?? end;

  const years: number[] = [];
  for (let y = from; y <= to; y++) years.push(y);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">
          {label}
        </label>
      )}
      <Select value={String(value)} onChange={(e) => onChange(e.target.value)} {...props}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
