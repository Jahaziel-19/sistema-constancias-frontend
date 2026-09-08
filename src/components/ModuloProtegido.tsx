import type { ReactNode } from "react";

import AccesoDenegado from "./AccesoDenegado";
import { usePuede } from "@/hooks/usePuede";

export default function ModuloProtegido({
  modulo,
  children,
}: {
  modulo: string;
  children: ReactNode;
}) {
  const puede = usePuede();

  if (!puede(modulo)) {
    return <AccesoDenegado modulo={modulo} />;
  }

  return <>{children}</>;
}
