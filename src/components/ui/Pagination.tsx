import Button from "@/components/ui/Button";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Pagination({ page, pageSize, total, onPageChange, pageSizeOptions, onPageSizeChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = clamp(page, 1, totalPages);

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-uh-stone/15 bg-white px-4 py-3 text-xs text-uh-stone/70">
      <div className="flex items-center gap-3">
        <div>
          Página <span className="font-semibold text-uh-ink">{safePage}</span> de{" "}
          <span className="font-semibold text-uh-ink">{totalPages}</span>
        </div>
        <div>
          Total: <span className="font-semibold text-uh-ink">{total}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {pageSizeOptions?.length && onPageSizeChange ? (
          <select
            className="h-9 rounded-xl border border-uh-stone/20 bg-white px-3 font-semibold text-uh-ink/80"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}/pág
              </option>
            ))}
          </select>
        ) : null}
        <Button variant="secondary" className="h-9 px-3" disabled={!canPrev} onClick={() => onPageChange(safePage - 1)}>
          Anterior
        </Button>
        <Button variant="secondary" className="h-9 px-3" disabled={!canNext} onClick={() => onPageChange(safePage + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

