import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, LogOut, Search, LayoutDashboard, Users, GraduationCap, FileText, ClipboardList, FolderOpen, ShieldCheck, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { usePuede } from "@/hooks/usePuede";
import { useAuthStore } from "@/stores/auth";
import { useInstitucionStore } from "@/stores/institucion";
import logoImg from "@/images/logo/logo_hispana.png";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; modulo: string };

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, modulo: "dashboard" },
  { to: "/admin/alumnos", label: "Alumnos", icon: Users, modulo: "alumnos" },
  { to: "/admin/calificaciones", label: "Calificaciones", icon: GraduationCap, modulo: "calificaciones" },
  { to: "/admin/ciclos", label: "Ciclos escolares", icon: CalendarDays, modulo: "ciclos" },
  { to: "/admin/emision", label: "Emisión", icon: FileText, modulo: "emision" },
  { to: "/admin/registros", label: "Registros", icon: ClipboardList, modulo: "registros" },
  { to: "/admin/catalogos", label: "Catálogos", icon: FolderOpen, modulo: "catalogos" },
  { to: "/admin/auditoria", label: "Auditoría", icon: ShieldCheck, modulo: "auditoria" },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const clear = useAuthStore((s) => s.clear);
  const puede = usePuede();
  const perfil = useAuthStore((s) => s.perfil);
  const nav = useNavigate();
  const institucion = useInstitucionStore((s) => s.nombre);

  const navVisible = useMemo(() => NAV.filter((item) => puede(item.modulo)), [puede]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return navVisible;
    return navVisible.filter((x) => x.label.toLowerCase().includes(s));
  }, [q, navVisible]);

  return (
    <div className="min-h-screen bg-uh-paper">
      <div className="fixed inset-x-0 top-0 z-30 h-14 border-b border-uh-stone/15 bg-uh-navy">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-3 px-4">
          
          <img src={logoImg} alt={`Logo ${institucion}`} className="h-10 w-10 object-contain" />
          <div className="uh-title text-[18px] font-semibold text-white/95">
            {institucion}
            <span className="ml-2 text-[12px] font-medium tracking-[0.18em] text-white/50">ADMIN</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden w-[360px] md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-[14px] text-white/90 outline-none transition",
                  "placeholder:text-white/40 focus:border-uh-gold/60 focus:ring-2 focus:ring-uh-gold/20",
                )}
                placeholder="Buscar módulo…"
              />
            </div>

            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
              type="button"
              aria-label="Notificaciones"
            >
              <Bell className="h-4 w-4" />
            </button>

            <Button
              variant="ghost"
              className="h-10 border border-white/10 bg-white/5 px-3 text-white/90 hover:bg-white/10"
              onClick={() => {
                clear();
                nav("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </div>

      <div className="flex max-w-[1400px] pt-14">
        <aside
          className={cn(
            "sticky top-14 h-[calc(100vh-56px)] shrink-0 border-r border-uh-stone/15 bg-uh-navy/95",
            collapsed ? "w-[74px]" : "w-[260px]",
          )}
        >
          <div className="flex h-full flex-col">
            <div className={cn("flex items-center justify-between gap-2 px-4 py-3", collapsed && "px-3")}>
              <div className={cn("text-[12px] font-semibold tracking-[0.18em] text-white/55", collapsed && "hidden")}>
                MÓDULOS
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
                onClick={() => setCollapsed((v) => !v)}
                aria-label="Colapsar sidebar"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            <nav className={cn("px-2", collapsed && "px-2")}>
              {filtered.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition",
                      "text-white/75 hover:bg-white/10 hover:text-white",
                      isActive && "bg-white/10 text-uh-gold",
                      collapsed && "justify-center px-2",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto px-4 py-4">
              <div className={cn("rounded-2xl border border-white/10 bg-white/5 p-3", collapsed && "hidden")}>
                
                <div className="mt-1 text-[13px] text-white/85">
                  {perfil?.nombre || "Operador"}
                </div>
                {perfil?.rol ? (
                  <div className="mt-0.5 text-[12px] text-white/55">{perfil.rol}</div>
                ) : null}
                <div className="mt-1 text-[11px] text-white/45">
                  
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className={cn("min-w-0 flex-1 p-6", collapsed ? "pl-6" : "pl-6")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
