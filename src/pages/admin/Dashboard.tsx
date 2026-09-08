import { FileText, GraduationCap, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { usePuede } from "@/hooks/usePuede";
import { apiGetDashboardStats, type DashboardStats } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="h-[3px] w-full bg-uh-gold" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">{label.toUpperCase()}</div>
            <div className="uh-title mt-2 text-3xl font-semibold text-uh-ink">{value}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-uh-stone/15 bg-uh-paper/70 text-uh-navy">
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const token = useAuthStore((s) => s.accessToken);
  const puede = usePuede();
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await apiGetDashboardStats(token);
      setStats(data);
    } catch {
      setError("No se pudo cargar el resumen. Verifica que el backend esté corriendo y que tu sesión sea válida.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const alumnos = useMemo(() => (stats ? String(stats.alumnos_activos) : "—"), [stats]);
  const docs = useMemo(() => (stats ? String(stats.documentos_mes) : "—"), [stats]);
  const carreras = useMemo(() => (stats ? String(stats.carreras_registradas) : "—"), [stats]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo del sistema y accesos directos a emisión."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Alumnos activos" value={alumnos} icon={<Users className="h-5 w-5" />} />
        <Kpi label="Documentos del mes" value={docs} icon={<FileText className="h-5 w-5" />} />
        <Kpi label="Carreras registradas" value={carreras} icon={<GraduationCap className="h-5 w-5" />} />
      </div>

      {error ? (
        <div className="rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">
          {error}
        </div>
      ) : null}

      <Card>
        <div className="p-6">
          <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">ACCESOS RÁPIDOS</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link
              className="rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4 transition hover:border-uh-gold/50 hover:shadow-paper"
              to="/admin/emision"
            >
              <div className="uh-title text-lg font-semibold text-uh-ink">Emisión rápida</div>
              <div className="mt-1 text-sm text-uh-stone/80">Iniciar el asistente de emisión en 3 pasos.</div>
            </Link>
            <Link
              className="rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4 transition hover:border-uh-gold/50 hover:shadow-paper"
              to="/admin/alumnos"
            >
              <div className="uh-title text-lg font-semibold text-uh-ink">Gestión de alumnos</div>
              <div className="mt-1 text-sm text-uh-stone/80">Consultar y filtrar el padrón de alumnos.</div>
            </Link>
            {puede("auditoria") ? (
              <Link
                className="rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4 transition hover:border-uh-gold/50 hover:shadow-paper"
                to="/admin/auditoria"
              >
                <div className="uh-title text-lg font-semibold text-uh-ink">Auditoría</div>
                <div className="mt-1 text-sm text-uh-stone/80">Revisar trazabilidad de operaciones.</div>
              </Link>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
