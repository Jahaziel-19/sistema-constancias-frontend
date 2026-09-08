import { KeyRound, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/ui/Button";
import FloatingField from "@/components/ui/FloatingField";
import logoImg from "@/images/logo/logo_hispana.png";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useInstitucionStore } from "@/stores/institucion";

function splitTarget(from: unknown) {
  if (!from || typeof from !== "string") return "/admin/dashboard";
  if (!from.startsWith("/")) return "/admin/dashboard";
  return from;
}

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.accessToken);
  const institucion = useInstitucionStore((s) => s.nombre);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const location = useLocation();

  const redirect = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return splitTarget(state?.from);
  }, [location.state]);

  useEffect(() => {
    if (!token) return;
    nav("/admin/dashboard", { replace: true });
  }, [nav, token]);

  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[2fr_3fr]">
        <div className="relative overflow-hidden bg-uh-navy">
          <div className="absolute inset-0 opacity-70">
            <div className="absolute -left-24 -top-20 h-[340px] w-[340px] rotate-12 rounded-[64px] border border-uh-gold/35" />
            <div className="absolute -right-24 top-24 h-[420px] w-[420px] rotate-12 rounded-[88px] border border-uh-gold/20" />
            <div className="absolute left-10 bottom-16 h-[260px] w-[260px] -rotate-6 rounded-[64px] border border-uh-gold/25" />
          </div>

          <div className="relative flex h-full items-center justify-center px-10 py-12">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-uh-gold/35 bg-white/5">
                <img src={logoImg} alt={`Logo ${institucion}`} className="h-35 w-35 object-contain" />
              </div>
              <div className="uh-title mt-6 text-3xl font-semibold text-white/95">Registro Académico</div>
              <div className="mt-2 text-sm tracking-[0.16em] text-white/60">EMISIÓN DE DOCUMENTOS OFICIALES</div>

              
            </div>
          </div>
        </div>

        <div className="uh-paper flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[420px] rounded-[28px] border border-uh-stone/15 bg-white shadow-paper">
            <div className="px-8 pb-8 pt-7">
              <div className="uh-title text-2xl font-semibold text-uh-ink">Acceso de Operador</div>
              <div className="mt-1 text-sm text-uh-stone/80">Ingresa tu correo institucional y contraseña.</div>

              <div className="mt-8 space-y-4">
                <FloatingField
                  label="Correo institucional"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <FloatingField
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">
                  {error}
                </div>
              ) : null}

              <Button
                className="mt-6 w-full"
                disabled={!username.trim() || !password || loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    await login({ username: username.trim(), password });
                    nav(redirect, { replace: true });
                  } catch {
                    setError("Credenciales inválidas o servidor no disponible.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <KeyRound className={cn("h-4 w-4", loading && "opacity-60")} />
                {loading ? "Iniciando…" : "Iniciar sesión"}
              </Button>

              <div className="mt-6 flex items-center justify-between gap-4">
                <button type="button" className="text-sm font-medium text-uh-gold hover:underline">
                  ¿Olvidó su contraseña?
                </button>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
