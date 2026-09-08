import { useCallback } from "react";

import { useAuthStore } from "@/stores/auth";
import type { Modulo } from "@/lib/api";

export function usePuede() {
  const perfil = useAuthStore((s) => s.perfil);

  return useCallback(
    (modulo: Modulo | string) => {
      if (!perfil) return false;
      if (perfil.is_admin) return true;
      return Boolean(perfil.permisos[modulo as Modulo]);
    },
    [perfil],
  );
}
