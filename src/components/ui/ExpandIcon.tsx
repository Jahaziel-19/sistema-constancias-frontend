import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  className?: string;
};

export default function ExpandIcon({ open, className }: Props) {
  return open ? (
    <ChevronDown className={cn("h-4 w-4", className)} />
  ) : (
    <ChevronRight className={cn("h-4 w-4", className)} />
  );
}
