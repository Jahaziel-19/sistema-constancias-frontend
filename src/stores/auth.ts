import { create } from "zustand";

import { http } from "@/lib/http";
import { apiGetMe, type PerfilUsuario } from "@/lib/api";
import type { JwtTokenPair } from "@/lib/types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  perfil: PerfilUsuario | null;
  setTokens: (tokens: JwtTokenPair) => void;
  clear: () => void;
  login: (payload: { username: string; password: string }) => Promise<void>;
  cargarPerfil: () => Promise<void>;
  puede: (modulo: string) => boolean;
};

const STORAGE_KEY = "uh.tokens.v1";

function readStoredTokens(): JwtTokenPair | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JwtTokenPair;
  } catch {
    return null;
  }
}

function writeStoredTokens(tokens: JwtTokenPair | null) {
  try {
    if (!tokens) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    return;
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  const stored = typeof window === "undefined" ? null : readStoredTokens();

  return {
    accessToken: stored?.access ?? null,
    refreshToken: stored?.refresh ?? null,
    perfil: null,
    setTokens: (tokens) => {
      writeStoredTokens(tokens);
      set({ accessToken: tokens.access, refreshToken: tokens.refresh });
    },
    clear: () => {
      writeStoredTokens(null);
      set({ accessToken: null, refreshToken: null, perfil: null });
    },
    login: async ({ username, password }) => {
      const tokens = await http<JwtTokenPair>("/auth/token/", { method: "POST", body: { username, password } });
      writeStoredTokens(tokens);
      set({ accessToken: tokens.access, refreshToken: tokens.refresh });
      await get().cargarPerfil();
    },
    cargarPerfil: async () => {
      const token = get().accessToken;
      if (!token) return;
      try {
        const perfil = await apiGetMe(token);
        set({ perfil });
      } catch {
        set({ perfil: null });
      }
    },
    puede: (modulo) => {
      const p = get().perfil;
      if (!p) return false;
      if (p.is_admin) return true;
      return Boolean((p.permisos as Record<string, boolean>)[modulo]);
    },
  };
});
