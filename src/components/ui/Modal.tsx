import { useEffect } from "react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  widthClassName?: string;
};

export default function Modal({ open, onClose, children, title, widthClassName }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className={cn(
          "absolute left-1/2 top-1/2 max-h-[92vh] w-full max-w-[980px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl border border-uh-stone/20 bg-white shadow-float",
          widthClassName,
        )}
      >
        {title && (
          <div className="sticky top-0 flex items-center justify-between border-b border-uh-stone/15 bg-white px-5 py-4">
            <div className="uh-title text-lg font-semibold text-uh-ink">{title}</div>
            <Button variant="secondary" className="h-9 px-3" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
