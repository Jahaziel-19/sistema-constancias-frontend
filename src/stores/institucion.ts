import { create } from "zustand";

import { http } from "@/lib/http";
import type { ConfiguracionInstitucional } from "@/lib/api";

type InstitucionState = {
  nombre: string;
  cargando: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_NOMBRE = "Colegio Universitario Hispana";

export const useInstitucionStore = create<InstitucionState>((set, get) => {
  const load = async () => {
    try {
      const data = await http<ConfiguracionInstitucional>("/configuracion-institucional/1/");
      set({ nombre: data.nombre_institucion || DEFAULT_NOMBRE, cargando: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("401") || msg.includes("403")) {
        set({ nombre: DEFAULT_NOMBRE, cargando: false, error: "NO_AUTH" });
      } else {
        set({ nombre: DEFAULT_NOMBRE, cargando: false, error: msg });
      }
    }
  };

  if (typeof window !== "undefined") {
    setTimeout(() => {
      load();
    }, 0);
  }

  return {
    nombre: DEFAULT_NOMBRE,
    cargando: true,
    error: null,
    refresh: load,
  };
});
