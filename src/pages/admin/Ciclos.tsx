import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Drawer from "@/components/ui/Drawer";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import {
  apiCreateCicloEscolar,
  apiDeleteCicloEscolar,
  apiDeletePeriodoAcademico,
  apiGenerarCiclosAutomaticos,
  apiGetCiclosPanel,
  apiGetTiposPeriodo,
  apiUpdateCicloEscolar,
  apiUpdatePeriodoAcademico,
  type CicloEscolar,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { CalendarDays, Plus, RefreshCw, Trash2 } from "lucide-react";
import ExpandIcon from "@/components/ui/ExpandIcon";
import YearPicker from "@/components/ui/YearPicker";

type PanelResponse = {
  anio_actual: number;
  rango: number;
  anio_filtro: number;
  ciclos: CicloEscolar[];
  tipos_periodo: Array<{ id: number; nombre: string }>;
  sugerencias: Array<{ anio_inicio: number; anio_fin: number; clave: string; existe: boolean }>;
  faltantes: Array<{ anio_inicio: number; anio_fin: number; clave: string }>;
  total_faltantes: number;
  mostrar_sugerencia: boolean;
  periodos_por_ciclo: Record<number, Array<{ id: number; ciclo_escolar: number; tipo_periodo: number; tipo_periodo_nombre: string; clave: string; numero: number | null; fecha_inicio: string | null; fecha_fin: string | null }>>;
};

type PeriodoRow = {
  id: number;
  tipo_periodo: number;
  tipo_periodo_nombre: string;
  clave: string;
  numero: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export default function Ciclos() {
  const token = useAuthStore((s) => s.accessToken);

  const [panel, setPanel] = useState<PanelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anioFiltro, setAnioFiltro] = useState<string>(() => String(new Date().getFullYear()));

  const [showSugerenciaModal, setShowSugerenciaModal] = useState(false);
  const [generando, setGenerando] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCiclo, setEditCiclo] = useState<CicloEscolar | null>(null);
  const [formAnioInicio, setFormAnioInicio] = useState("");
  const [formAnioFin, setFormAnioFin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [periodoDrawerOpen, setPeriodoDrawerOpen] = useState(false);
  const [editPeriodo, setEditPeriodo] = useState<PeriodoRow | null>(null);
  const [periodoCicloId, setPeriodoCicloId] = useState<number | null>(null);
  const [formPeriodoNumero, setFormPeriodoNumero] = useState("");
  const [formPeriodoTipo, setFormPeriodoTipo] = useState("");
  const [formPeriodoInicio, setFormPeriodoInicio] = useState("");
  const [formPeriodoFin, setFormPeriodoFin] = useState("");
  const [savingPeriodo, setSavingPeriodo] = useState(false);
  const [savePeriodoError, setSavePeriodoError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const loadPanel = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const anio = anioFiltro.trim();
      const data = await apiGetCiclosPanel(token, { rango: 5, anio: anio ? Number(anio) : undefined });
      setPanel(data);
      setShowSugerenciaModal(data.mostrar_sugerencia);
    } catch {
      setError("No se pudo cargar el panel de ciclos escolares.");
    } finally {
      setLoading(false);
    }
  }, [token, anioFiltro]);

  useEffect(() => {
    void loadPanel();
  }, [loadPanel]);

  const toggleExpand = (cicloId: number) => {
    setExpanded((prev) => ({ ...prev, [cicloId]: !prev[cicloId] }));
  };

  const handleGenerarAutomaticos = async () => {
    if (!token) return;
    setGenerando(true);
    try {
      await apiGenerarCiclosAutomaticos(token, 5);
      await loadPanel();
      setShowSugerenciaModal(false);
    } catch {
      setError("No se pudieron generar los ciclos automáticamente.");
    } finally {
      setGenerando(false);
    }
  };

  const openCreateCiclo = () => {
    setEditCiclo(null);
    setFormAnioInicio("");
    setFormAnioFin("");
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEditCiclo = (ciclo: CicloEscolar) => {
    setEditCiclo(ciclo);
    setFormAnioInicio(String(ciclo.anio_inicio ?? ""));
    setFormAnioFin(String(ciclo.anio_fin ?? ""));
    setSaveError(null);
    setDrawerOpen(true);
  };

  const handleSaveCiclo = async () => {
    if (!token) return;
    const inicio = Number(formAnioInicio);
    const fin = Number(formAnioFin);
    if (!inicio || !fin || fin !== inicio + 1) {
      setSaveError("Los años deben ser consecutivos (ej. 2024-2025).");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editCiclo) {
        await apiUpdateCicloEscolar(token, editCiclo.id, { anio_inicio: inicio, anio_fin: fin });
      } else {
        await apiCreateCicloEscolar(token, { anio_inicio: inicio, anio_fin: fin });
      }
      setDrawerOpen(false);
      await loadPanel();
    } catch {
      setSaveError("No se pudo guardar el ciclo escolar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCiclo = async (ciclo: CicloEscolar) => {
    if (!token) return;
    if (!confirm(`¿Eliminar el ciclo ${ciclo.clave}? Esta acción no se puede deshacer.`)) return;
    try {
      await apiDeleteCicloEscolar(token, ciclo.id);
      await loadPanel();
    } catch {
      setError("No se pudo eliminar el ciclo escolar.");
    }
  };

  const openCreatePeriodo = (cicloId: number) => {
    setEditPeriodo(null);
    setPeriodoCicloId(cicloId);
    setFormPeriodoNumero("");
    setFormPeriodoTipo(panel?.tipos_periodo[0]?.id ? String(panel.tipos_periodo[0].id) : "");
    setFormPeriodoInicio("");
    setFormPeriodoFin("");
    setSavePeriodoError(null);
    setPeriodoDrawerOpen(true);
  };

  const openEditPeriodo = (cicloId: number, periodo: PeriodoRow) => {
    setEditPeriodo(periodo);
    setPeriodoCicloId(cicloId);
    setFormPeriodoNumero(String(periodo.numero ?? ""));
    setFormPeriodoTipo(String(periodo.tipo_periodo));
    setFormPeriodoInicio(periodo.fecha_inicio ?? "");
    setFormPeriodoFin(periodo.fecha_fin ?? "");
    setSavePeriodoError(null);
    setPeriodoDrawerOpen(true);
  };

  const handleSavePeriodo = async () => {
    if (!token || !periodoCicloId) return;
    const numero = Number(formPeriodoNumero);
    if (!numero) {
      setSavePeriodoError("El número de periodo es requerido.");
      return;
    }
    setSavingPeriodo(true);
    setSavePeriodoError(null);
    try {
      const tipoId = Number(formPeriodoTipo);
      const body = {
        ciclo_escolar: periodoCicloId,
        tipo_periodo: tipoId,
        numero,
        clave: "",
        fecha_inicio: formPeriodoInicio || null,
        fecha_fin: formPeriodoFin || null,
      };
      if (editPeriodo) {
        await apiUpdatePeriodoAcademico(token, editPeriodo.id, body);
      } else {
        await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"}/periodos-academicos/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }).then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.ciclo_escolar?.[0] || data?.tipo_periodo?.[0] || data?.numero?.[0] || "No se pudo guardar el periodo.");
          }
        });
      }
      setPeriodoDrawerOpen(false);
      await loadPanel();
    } catch (e) {
      setSavePeriodoError(e instanceof Error ? e.message : "No se pudo guardar el periodo académico.");
    } finally {
      setSavingPeriodo(false);
    }
  };

  const handleDeletePeriodo = async (periodo: PeriodoRow) => {
    if (!token) return;
    if (!confirm(`¿Eliminar el periodo ${periodo.clave}? Esta acción no se puede deshacer.`)) return;
    try {
      await apiDeletePeriodoAcademico(token, periodo.id);
      await loadPanel();
    } catch {
      setError("No se pudo eliminar el periodo académico.");
    }
  };

  const sortedCiclos = useMemo(() => {
    return [...(panel?.ciclos ?? [])].sort((a, b) => (a.anio_inicio ?? 0) - (b.anio_inicio ?? 0));
  }, [panel?.ciclos]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ciclos escolares"
        subtitle="Gestione los ciclos y periodos académicos del sistema."
        right={
          <Button onClick={openCreateCiclo}>
            <Plus className="h-4 w-4" />
            Nuevo ciclo
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">{error}</div>
      )}

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between gap-3">
            <YearPicker
              label="AÑO"
              value={anioFiltro}
              onChange={setAnioFiltro}
              className="w-40"
            />
            <Button variant="secondary" onClick={loadPanel} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-uh-stone/15">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-uh-navy text-left text-xs font-semibold tracking-[0.18em] text-white/90">
                  <th className="px-4 py-3">Ciclo</th>
                  <th className="px-4 py-3">Clave</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
              {sortedCiclos.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-uh-stone/70">
                    No hay ciclos escolares registrados.
                  </td>
                </tr>
              )}
              {sortedCiclos.map((ciclo) => {
                const isOpen = !!expanded[ciclo.id];
                const periodos: PeriodoRow[] = panel?.periodos_por_ciclo?.[ciclo.id] ?? [];
                return (
                  <>
                    <tr key={ciclo.id} className="cursor-pointer border-t border-uh-stone/10 bg-white" onClick={() => openEditCiclo(ciclo)}>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(ciclo.id); }}
                          className="inline-flex items-center gap-2 text-sm font-medium text-uh-ink hover:text-uh-gold"
                        >
                          <ExpandIcon open={isOpen} />
                          {ciclo.anio_inicio} - {ciclo.anio_fin}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-uh-stone/80">{ciclo.clave}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteCiclo(ciclo); }}>
                          <Trash2 className="h-4 w-4 text-uh-red" />
                        </Button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-uh-stone/10 bg-uh-paper/60">
                        <td colSpan={3} className="px-4 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">PERIODOS</div>
                            <Button variant="secondary" size="sm" onClick={() => openCreatePeriodo(ciclo.id)}>
                              <Plus className="h-4 w-4" />
                              Agregar periodo
                            </Button>
                          </div>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="text-left text-xs font-semibold tracking-[0.18em] text-uh-stone/70">
                                <th className="px-3 py-2">#</th>
                                <th className="px-3 py-2">Tipo</th>
                                <th className="px-3 py-2">Clave</th>
                                <th className="px-3 py-2">Inicio</th>
                                <th className="px-3 py-2">Fin</th>
                                <th className="px-3 py-2 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {periodos.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-uh-stone/60">
                                    Sin periodos registrados.
                                  </td>
                                </tr>
                              )}
                              {periodos.map((p) => (
                                <tr key={p.id} className="cursor-pointer border-t border-uh-stone/10 bg-white" onClick={() => openEditPeriodo(ciclo.id, p)}>
                                  <td className="px-3 py-2 text-sm text-uh-ink">{p.numero ?? ""}</td>
                                  <td className="px-3 py-2 text-sm text-uh-ink">{p.tipo_periodo_nombre}</td>
                                  <td className="px-3 py-2 text-sm text-uh-ink">{p.clave}</td>
                                  <td className="px-3 py-2 text-sm text-uh-ink">{p.fecha_inicio ?? ""}</td>
                                  <td className="px-3 py-2 text-sm text-uh-ink">{p.fecha_fin ?? ""}</td>
                                  <td className="px-3 py-2 text-right">
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePeriodo(p); }}>
                                      <Trash2 className="h-4 w-4 text-uh-red" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </Card>

      <Modal
        open={showSugerenciaModal}
        onClose={() => setShowSugerenciaModal(false)}
        title="Ciclos escolares sugeridos"
        widthClassName="max-w-[560px]"
      >
        <div className="space-y-4">
          <p className="text-sm text-uh-stone/80">
            Se detectó que faltan ciclos escolares dentro del rango sugerido (±{panel?.rango ?? 5} años del año actual).
            Se recomienda generarlos automáticamente para mantener la integridad del sistema.
          </p>
          <div className="rounded-2xl border border-uh-stone/15 bg-white p-4">
            <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">Ciclos faltantes</div>
            <ul className="mt-2 space-y-1">
              {panel?.faltantes.map((s) => (
                <li key={s.clave} className="text-sm text-uh-ink">
                  {s.clave}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSugerenciaModal(false)}>Crear manualmente</Button>
            <Button onClick={handleGenerarAutomaticos} disabled={generando}>
              {generando ? "Generando…" : "Generar automáticamente"}
            </Button>
          </div>
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        title={editCiclo ? "Editar ciclo escolar" : "Nuevo ciclo escolar"}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-2">
            {saveError && <div className="text-sm text-uh-red">{saveError}</div>}
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setDrawerOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSaveCiclo} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.18em] text-uh-stone/70">Año inicio</label>
            <Input value={formAnioInicio} onChange={(e) => setFormAnioInicio(e.target.value)} placeholder="2024" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.18em] text-uh-stone/70">Año fin</label>
            <Input value={formAnioFin} onChange={(e) => setFormAnioFin(e.target.value)} placeholder="2025" />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={periodoDrawerOpen}
        title={editPeriodo ? "Editar periodo académico" : "Nuevo periodo académico"}
        onClose={() => setPeriodoDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-2">
            {savePeriodoError && <div className="text-sm text-uh-red">{savePeriodoError}</div>}
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setPeriodoDrawerOpen(false)} disabled={savingPeriodo}>Cancelar</Button>
              <Button onClick={handleSavePeriodo} disabled={savingPeriodo}>
                {savingPeriodo ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.18em] text-uh-stone/70">Tipo de periodo</label>
            <Select value={formPeriodoTipo} onChange={(e) => setFormPeriodoTipo(e.target.value)}>
              <option value="">Seleccione…</option>
              {panel?.tipos_periodo.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.18em] text-uh-stone/70">Número</label>
            <Input value={formPeriodoNumero} onChange={(e) => setFormPeriodoNumero(e.target.value)} placeholder="1" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.18em] text-uh-stone/70">Fecha inicio</label>
            <Input type="date" value={formPeriodoInicio} onChange={(e) => setFormPeriodoInicio(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.18em] text-uh-stone/70">Fecha fin</label>
            <Input type="date" value={formPeriodoFin} onChange={(e) => setFormPeriodoFin(e.target.value)} />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
