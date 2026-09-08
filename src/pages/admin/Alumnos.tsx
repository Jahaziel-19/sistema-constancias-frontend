import { Download, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Drawer from "@/components/ui/Drawer";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import {
  apiCreateTrayectoria,
  apiGetAlumnos,
  apiGetAlumnoKardex,
  apiGetCarreras,
  apiGetEstatus,
  apiGetPlanteles,
  apiGetTrayectorias,
  apiUpdateAlumno,
  apiUpdateTrayectoria,
} from "@/lib/api";
import { API_BASE_URL } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import BulkUploadWizard from "@/components/bulk/BulkUploadWizard";
import { alumnoColumns } from "@/components/bulk/columns";

type Option = { value: string; label: string };

function fullName(a: { nombres: string; primer_apellido: string; segundo_apellido: string }) {
  return [a.nombres, a.primer_apellido, a.segundo_apellido].filter(Boolean).join(" ");
}

function photoUrl(rel?: string | null) {
  if (!rel) return null;
  if (rel.startsWith("http")) return rel;
  const base = API_BASE_URL.replace(/\/api$/, "");
  return `${base}${rel.startsWith("/") ? "" : "/"}${rel}`;
}

export default function Alumnos() {
  const token = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [plantelId, setPlantelId] = useState<string>("");
  const [carreraId, setCarreraId] = useState<string>("");
  const [estatusId, setEstatusId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [planteles, setPlanteles] = useState<Array<{ id: number; nombre: string; clave_plantel: string }>>([]);
  const [carreras, setCarreras] = useState<Array<{ id: number; nombre: string; plantel_id: number }>>([]);
  const [estatus, setEstatus] = useState<Array<{ id: number; nombre: string }>>([]);
  const [alumnos, setAlumnos] = useState<Array<{ id: number; matricula: string; curp: string; nombres: string; primer_apellido: string; segundo_apellido: string; foto?: string | null; nivel_actual?: string }>>([]);
  const [trayectorias, setTrayectorias] = useState<
    Array<{
      id: number;
      alumno: number;
      carrera: number;
      estatus_academico: number;
      nivel_actual: string;
      es_actual: boolean;
    }>
  >([]);

  const carreraOptions = useMemo<Option[]>(() => {
    const list = carreras
      .filter((c) => (!plantelId ? true : String(c.plantel_id) === plantelId))
      .map((c) => ({ value: String(c.id), label: c.nombre }));
    return [{ value: "", label: "Todas las carreras" }, ...list];
  }, [carreras, plantelId]);

  const plantelOptions = useMemo<Option[]>(
    () => [{ value: "", label: "Todos los planteles" }, ...planteles.map((p) => ({ value: String(p.id), label: p.nombre }))],
    [planteles],
  );

  const estatusOptions = useMemo<Option[]>(
    () => [{ value: "", label: "Todos los estatus" }, ...estatus.map((e) => ({ value: String(e.id), label: e.nombre }))],
    [estatus],
  );

  const trayectoriaByAlumno = useMemo(() => {
    const map = new Map<number, (typeof trayectorias)[number]>();
    for (const t of trayectorias) {
      const existing = map.get(t.alumno);
      if (!existing) {
        map.set(t.alumno, t);
        continue;
      }
      if (t.es_actual && !existing.es_actual) map.set(t.alumno, t);
    }
    return map;
  }, [trayectorias]);

  const carreraById = useMemo(() => new Map(carreras.map((c) => [c.id, c.nombre])), [carreras]);
  const carreraPlantelByCarreraId = useMemo(() => new Map(carreras.map((c) => [c.id, c.plantel_id])), [carreras]);
  const estatusById = useMemo(() => new Map(estatus.map((e) => [e.id, e.nombre])), [estatus]);
  const plantelNameById = useMemo(() => new Map(planteles.map((p) => [p.id, p.nombre])), [planteles]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return alumnos
      .map((a) => {
        const t = trayectoriaByAlumno.get(a.id) ?? null;
        return { alumno: a, trayectoria: t };
      })
      .filter(({ alumno, trayectoria }) => {
        const tPlantelId = trayectoria ? carreraPlantelByCarreraId.get(trayectoria.carrera) : undefined;
        if (plantelId && (!trayectoria || !tPlantelId || String(tPlantelId) !== plantelId)) return false;
        if (carreraId && (!trayectoria || String(trayectoria.carrera) !== carreraId)) return false;
        if (estatusId && (!trayectoria || String(trayectoria.estatus_academico) !== estatusId)) return false;
        if (!s) return true;
        const hay = `${alumno.matricula} ${alumno.curp} ${fullName(alumno)}`.toLowerCase();
        return hay.includes(s);
      });
  }, [alumnos, carreraId, carreraPlantelByCarreraId, estatusId, plantelId, q, trayectoriaByAlumno]);

  useEffect(() => {
    setPage(1);
  }, [q, plantelId, carreraId, estatusId]);

  const safePage = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize)));
    return Math.max(1, Math.min(page, totalPages));
  }, [filtered.length, page, pageSize]);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAlumnoId, setEditAlumnoId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<"info" | "calificaciones">("info");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [kardexData, setKardexData] = useState<{
    materias: Array<{
      _periodo_separador: boolean;
      _periodo_label?: string;
      materia_id: number;
      ciclo_numero: number;
      clave_materia: string;
      nombre_materia: string;
      creditos: number | null;
      calificacion_ordinaria: number | null;
      extraordinario_1: number | null;
      extraordinario_2: number | null;
      calificacion_final: number | null;
      calificacion_letra: string;
    }>;
    plan: { clave_plan: string } | null;
    nivel_actual?: string;
    periodo_academico?: {
      id: number | null;
      tipo: string;
      nombre: string;
    } | null;
  } | null>(null);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [formMatricula, setFormMatricula] = useState("");
  const [formNombres, setFormNombres] = useState("");
  const [formPrimerApellido, setFormPrimerApellido] = useState("");
  const [formSegundoApellido, setFormSegundoApellido] = useState("");
  const [formCurp, setFormCurp] = useState("");
  const [formCarreraId, setFormCarreraId] = useState("");
  const [formEstatusId, setFormEstatusId] = useState("");
  const [formNivelActual, setFormNivelActual] = useState("");
  const [formFoto, setFormFoto] = useState<File | null>(null);
  const [formFotoPreview, setFormFotoPreview] = useState<string | null>(null);
  const [formFotoName, setFormFotoName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editContext = useMemo(() => {
    if (!editAlumnoId) return null;
    const alumno = alumnos.find((a) => a.id === editAlumnoId) ?? null;
    const trayectoria = trayectoriaByAlumno.get(editAlumnoId) ?? null;
    return alumno ? { alumno, trayectoria } : null;
  }, [alumnos, editAlumnoId, trayectoriaByAlumno]);

  const derivedPlantelName = useMemo(() => {
    const carrera = formCarreraId ? Number(formCarreraId) : null;
    if (!carrera) return "—";
    const pid = carreraPlantelByCarreraId.get(carrera);
    if (!pid) return "—";
    return plantelNameById.get(pid) ?? `Plantel #${pid}`;
  }, [carreraPlantelByCarreraId, formCarreraId, plantelNameById]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, c, e, a, t] = await Promise.all([
        apiGetPlanteles(token),
        apiGetCarreras(token),
        apiGetEstatus(token),
        apiGetAlumnos(token),
        apiGetTrayectorias(token),
      ]);
      setPlanteles(p);
      setCarreras(c);
      setEstatus(e);
      setAlumnos(a);
      setTrayectorias(t);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = useCallback(
    (alumnoId: number) => {
      const alumno = alumnos.find((a) => a.id === alumnoId);
      if (!alumno) return;
      const trayectoria = trayectoriaByAlumno.get(alumnoId) ?? null;

      setEditAlumnoId(alumnoId);
      setDrawerTab("info");
      setKardexData(null);
      setFormMatricula(alumno.matricula ?? "");
      setFormNombres(alumno.nombres ?? "");
      setFormPrimerApellido(alumno.primer_apellido ?? "");
      setFormSegundoApellido(alumno.segundo_apellido ?? "");
      setFormCurp(alumno.curp ?? "");
      setFormCarreraId(trayectoria ? String(trayectoria.carrera) : "");
      setFormEstatusId(trayectoria ? String(trayectoria.estatus_academico) : "");
      setFormNivelActual((alumno as any).nivel_actual ?? trayectoria?.nivel_actual ?? "");
      setFormFoto(null);
      setFormFotoPreview(photoUrl(alumno.foto));
      setFormFotoName(null);
      setSaveError(null);
      setDrawerOpen(true);

      if (token) {
        setKardexLoading(true);
        apiGetAlumnoKardex(token, alumnoId)
          .then((data) => {
            setKardexData(data);
            if (typeof data.nivel_actual === "string") {
              setFormNivelActual(data.nivel_actual);
            }
          })
          .catch(() => setKardexData(null))
          .finally(() => setKardexLoading(false));
      }
    },
    [alumnos, token, trayectoriaByAlumno],
  );

  const onSave = useCallback(async () => {
    if (!token || !editContext) return;
    if (!formCarreraId || !formEstatusId) {
      setSaveError("Selecciona carrera y estatus académico.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("matricula", formMatricula.trim());
      fd.append("nombres", formNombres.trim());
      fd.append("primer_apellido", formPrimerApellido.trim());
      fd.append("segundo_apellido", formSegundoApellido.trim());
      fd.append("curp", formCurp.trim());
      if (formFoto) {
        fd.append("foto", formFoto);
      }

      await apiUpdateAlumno(token, editContext.alumno.id, fd);

      const trayectoriaPayload = {
        alumno: editContext.alumno.id,
        carrera: Number(formCarreraId),
        estatus_academico: Number(formEstatusId),
        nivel_actual: formNivelActual.trim(),
        promedio_general: null,
        creditos_acumulados: null,
        es_actual: true,
        titulacion_en_proceso: false,
      };

      if (editContext.trayectoria) {
        await apiUpdateTrayectoria(token, editContext.trayectoria.id, {
          carrera: trayectoriaPayload.carrera,
          estatus_academico: trayectoriaPayload.estatus_academico,
          es_actual: true,
        });
      } else {
        await apiCreateTrayectoria(token, trayectoriaPayload);
      }

      setDrawerOpen(false);
      setEditAlumnoId(null);
      await load();
    } catch (e) {
      const err = e as { message?: string; details?: unknown };
      setSaveError(err?.message || "No se pudo guardar el alumno.");
    } finally {
      setSaving(false);
    }
  }, [
    editContext,
    formCarreraId,
    formCurp,
    formEstatusId,
    formFoto,
    formMatricula,
    formNivelActual,
    formNombres,
    formPrimerApellido,
    formSegundoApellido,
    load,
    token,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumnos"
        subtitle="Consulta el padrón, filtra por plantel/carrera/estatus y busca por matrícula o CURP."
        right={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              {loading ? "Actualizando…" : "Actualizar"}
            </Button>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              <Download className="h-4 w-4" />
              Carga masiva
            </Button>
            <Button disabled>
              <Plus className="h-4 w-4" />
              Añadir alumno
            </Button>
          </>
        }
      />

      <Card>
        <div className="p-6">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr_1.1fr]">
            <Select value={plantelId} onChange={(e) => setPlantelId(e.target.value)}>
              {plantelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select value={carreraId} onChange={(e) => setCarreraId(e.target.value)}>
              {carreraOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select value={estatusId} onChange={(e) => setEstatusId(e.target.value)}>
              {estatusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-uh-stone/70" />
              <Input className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por matrícula o CURP" />
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-uh-stone/15">
            <div className="overflow-auto">
              <table className="min-w-[1100px] w-full border-collapse">
                <thead className="bg-uh-navy">
                  <tr className="text-left text-xs font-semibold tracking-[0.18em] text-white/90">
                    <th className="px-4 py-3">FOTO</th>
                    <th className="px-4 py-3">MATRÍCULA</th>
                    <th className="px-4 py-3">NOMBRE</th>
                    <th className="px-4 py-3">CURP</th>
                    <th className="px-4 py-3">CARRERA</th>
                    <th className="px-4 py-3">ESTATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-uh-stone/80">
                        {loading ? "Cargando…" : "Sin resultados. Pulsa “Actualizar” para cargar datos."}
                      </td>
                    </tr>
                  ) : (
                    paged.map(({ alumno, trayectoria }, idx) => {
                      const carrera = trayectoria ? carreraById.get(trayectoria.carrera) : "-";
                      const est = trayectoria ? estatusById.get(trayectoria.estatus_academico) : "-";
                      const rowBg = idx % 2 === 0 ? "bg-white" : "bg-uh-paper/50";
                      const badgeVariant: "emerald" | "blue" | "red" | "stone" = est?.toLowerCase().includes("activo")
                        ? "emerald"
                        : est?.toLowerCase().includes("egres")
                          ? "blue"
                          : est?.toLowerCase().includes("baja")
                            ? "red"
                            : "stone";
                      const fotoSrc = photoUrl(alumno.foto);

                      return (
                        <tr key={alumno.id} className={cn("cursor-pointer text-sm", rowBg)} onClick={() => openEdit(alumno.id)}>
                          <td className="px-4 py-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-uh-stone/15 bg-uh-paper/60">
                              {fotoSrc ? (
                                <img src={fotoSrc} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-semibold tracking-[0.18em] text-uh-stone/60">SIN</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-uh-ink">{alumno.matricula}</td>
                          <td className="px-4 py-3 text-uh-ink">{fullName(alumno)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-uh-ink/80">{alumno.curp}</td>
                          <td className="px-4 py-3 text-uh-ink">{carrera ?? "-"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={badgeVariant}>{(est ?? "—").toString()}</Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={safePage}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      <Drawer
        open={drawerOpen}
        title="Editar alumno"
        description={editContext ? `Matrícula: ${editContext.alumno.matricula}` : undefined}
        onClose={() => {
          setDrawerOpen(false);
          setEditAlumnoId(null);
          setDrawerTab("info");
          setKardexData(null);
          setFormFoto(null);
          setFormFotoPreview(null);
          setFormFotoName(null);
        }}
        footer={
          <div className="flex items-center justify-between gap-2">
            {saveError ? <div className="text-sm text-uh-red">{saveError}</div> : <div />}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setDrawerOpen(false);
                  setEditAlumnoId(null);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={() => void onSave()} disabled={saving || !editContext}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerTab("info")}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.18em] transition",
                drawerTab === "info"
                  ? "border-uh-gold/40 bg-white text-uh-ink"
                  : "border-uh-stone/20 bg-white/60 text-uh-stone/80",
              )}
            >
              INFORMACIÓN
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab("calificaciones")}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.18em] transition",
                drawerTab === "calificaciones"
                  ? "border-uh-gold/40 bg-white text-uh-ink"
                  : "border-uh-stone/20 bg-white/60 text-uh-stone/80",
              )}
            >
              CALIFICACIONES
            </button>
          </div>

          {drawerTab === "info" ? (
            <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">MATRÍCULA</div>
              <div className="mt-2">
                <Input value={formMatricula} onChange={(e) => setFormMatricula(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">CURP</div>
              <div className="mt-2">
                <Input value={formCurp} onChange={(e) => setFormCurp(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">NOMBRES</div>
              <div className="mt-2">
                <Input value={formNombres} onChange={(e) => setFormNombres(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">PRIMER APELLIDO</div>
                <div className="mt-2">
                  <Input value={formPrimerApellido} onChange={(e) => setFormPrimerApellido(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">SEGUNDO APELLIDO</div>
                <div className="mt-2">
                  <Input value={formSegundoApellido} onChange={(e) => setFormSegundoApellido(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-uh-stone/15 bg-white p-4">
            <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">FOTO</div>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-uh-stone/15 bg-uh-paper/60">
                {formFotoPreview ? (
                  <img src={formFotoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-uh-stone/60">SIN</span>
                )}
              </div>
              <div className="grid gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-uh-stone/15 bg-white px-4 py-2 text-xs font-semibold text-uh-ink transition hover:border-uh-gold/40">
                  {formFotoName ? "Cambiar foto" : "Cargar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setFormFoto(file);
                      setFormFotoName(file ? file.name : null);
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setFormFotoPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      } else {
                        setFormFotoPreview(photoUrl(editContext?.alumno.foto ?? null));
                      }
                    }}
                  />
                </label>
                {formFotoName ? (
                  <div className="text-xs text-uh-stone/80">{formFotoName}</div>
                ) : (
                  <div className="text-xs text-uh-stone/60">Formatos: JPG, PNG. Máx. 2 MB.</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-uh-stone/15 bg-white p-4">
            <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">TRAYECTORIA ACTUAL</div>
            <div className="mt-3 grid gap-3">
              <Select value={formCarreraId} onChange={(e) => setFormCarreraId(e.target.value)}>
                <option value="">Selecciona carrera</option>
                {carreras.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
              <Select value={formEstatusId} onChange={(e) => setFormEstatusId(e.target.value)}>
                <option value="">Selecciona estatus</option>
                {estatus.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.nombre}
                  </option>
                ))}
              </Select>
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">NIVEL ACTUAL</div>
                <div className="mt-2">
                  <Input value={formNivelActual} onChange={(e) => setFormNivelActual(e.target.value)} placeholder="Ej. 6to" />
                </div>
              </div>
              <div className="text-sm text-uh-stone/80">
                Plantel inferido por carrera: <span className="font-semibold text-uh-ink">{derivedPlantelName}</span>
              </div>
              <div className="text-sm text-uh-stone/80">
                Periodo académico: <span className="font-semibold text-uh-ink">{kardexData?.periodo_academico?.tipo ?? "—"}</span>
              </div>
            </div>
          </div>
          </div>
          ) : null}

          {drawerTab === "calificaciones" ? (
            <div className="rounded-2xl border border-uh-stone/15 bg-white p-4">
              <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">CALIFICACIONES</div>
              {kardexLoading ? (
                <div className="mt-4 text-sm text-uh-stone/80">Cargando calificaciones…</div>
              ) : !kardexData || !kardexData.materias.length ? (
                <div className="mt-4 text-sm text-uh-stone/80">Sin calificaciones registradas para este plan de estudios.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {(() => {
                    const grupos = new Map<number, Array<typeof kardexData.materias[number]>>();
                    for (const m of kardexData.materias) {
                      if (m._periodo_separador) continue;
                      const arr = grupos.get(m.ciclo_numero) ?? [];
                      arr.push(m);
                      grupos.set(m.ciclo_numero, arr);
                    }
                    const rawTipo = (kardexData?.periodo_academico?.tipo || "").toLowerCase();
                    const tipoBase = rawTipo.includes("cuatrimestral") ? "Cuatrimestre" : rawTipo.includes("semestral") ? "Semestre" : null;
                    return Array.from(grupos.entries()).sort((a, b) => a[0] - b[0]).map(([ciclo, items]) => (
                      <details key={ciclo} className="group rounded-2xl border border-uh-stone/15 bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 py-3 select-none">
                          <span className="text-xs font-semibold tracking-[0.18em] text-uh-navy">{tipoBase ? `${tipoBase} ${ciclo}` : `${ciclo}° Nivel`}</span>
                          <span className="text-[10px] font-semibold tracking-[0.18em] text-uh-stone/70">{items.length} MATERIAS</span>
                        </summary>
                        <div className="overflow-hidden rounded-b-2xl border-t border-uh-stone/15">
                          <table className="w-full border-collapse text-xs">
                            <thead className="bg-uh-paper/80">
                              <tr className="text-left text-[10px] font-semibold tracking-[0.18em] text-uh-stone/70">
                                <th className="px-3 py-2">CLAVE</th>
                                <th className="px-3 py-2">MATERIA</th>
                                <th className="px-3 py-2">CRÉD.</th>
                                <th className="px-3 py-2 text-center">ORDINARIO</th>
                                <th className="px-3 py-2 text-center">EXTRA 1</th>
                                <th className="px-3 py-2 text-center">EXTRA 2</th>
                                <th className="px-3 py-2 text-center">FINAL</th>
                                <th className="px-3 py-2 text-center">LETRA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((m) => (
                                <tr key={`${ciclo}-${m.materia_id}`} className="border-t border-uh-stone/10 bg-white">
                                  <td className="px-3 py-2 font-mono text-uh-ink/80">{m.clave_materia}</td>
                                  <td className="px-3 py-2 text-uh-ink">{m.nombre_materia}</td>
                                  <td className="px-3 py-2 text-uh-stone/85">{m.creditos ?? "—"}</td>
                                  <td className="px-3 py-2 text-center">{m.calificacion_ordinaria ?? "—"}</td>
                                  <td className="px-3 py-2 text-center">{m.extraordinario_1 ?? "—"}</td>
                                  <td className="px-3 py-2 text-center">{m.extraordinario_2 ?? "—"}</td>
                                  <td className="px-3 py-2 text-center font-semibold text-uh-ink">{m.calificacion_final ?? "—"}</td>
                                  <td className="px-3 py-2 text-center text-uh-stone/85">{m.calificacion_letra || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    ));
                  })()}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Drawer>

      <BulkUploadWizard
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        entity="alumnos"
        columns={alumnoColumns}
        context={{ carreras, estatus }}
        onUploaded={() => void load()}
      />
    </div>
  );
}
