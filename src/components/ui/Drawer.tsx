import { X } from "lucide-react";
import { useEffect } from "react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
};

export default function Drawer({ open, title, description, onClose, children, footer, widthClassName }: Props) {
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
          "absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-uh-stone/20 bg-uh-paper shadow-paper",
          widthClassName,
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-uh-stone/15 bg-white px-5 py-4">
            <div>
              <div className="uh-title text-lg font-semibold text-uh-ink">{title}</div>
              {description ? <div className="mt-1 text-sm text-uh-stone/80">{description}</div> : null}
            </div>
            <Button variant="secondary" className="h-9 px-3" onClick={onClose}>
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          </div>

          <div className="flex-1 overflow-auto px-5 py-5">{children}</div>

          {footer ? <div className="border-t border-uh-stone/15 bg-white px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

