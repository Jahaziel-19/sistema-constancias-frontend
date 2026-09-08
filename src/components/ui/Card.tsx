import { cn } from "@/lib/utils";

export default function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("rounded-3xl border border-uh-stone/15 bg-white shadow-paper", className)}>{children}</div>;
}

