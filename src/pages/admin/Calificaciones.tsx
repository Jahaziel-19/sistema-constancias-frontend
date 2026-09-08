import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import {
  apiGetCalificacionesMatriz,
  apiGetCarreras,
  apiGetCiclosEscolares,
  apiGetMaterias,
  apiGetPeriodosAcademicos,
  apiGetPlanesEstudio,
  apiGetPlanteles,
} from "@/lib/api";
import type { CalificacionMatrizRow, Carrera, CicloEscolar, Materia, PeriodoAcademico, PlanEstudio, Plantel } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import BulkUploadWizard from "@/components/bulk/BulkUploadWizard";
import { calificacionColumns } from "@/components/bulk/columns";

export default function Calificaciones() {
  const token = useAuthStore((s) => s.accessToken);
  const [plantel, setPlantel] = useState("");
  const [carrera, setCarrera] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [materia, setMateria] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [planteles, setPlanteles] = useState<Plantel[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [ciclos, setCiclos] = useState<CicloEscolar[]>([]);
  const [planes, setPlanes] = useState<PlanEstudio[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [rows, setRows] = useState<CalificacionMatrizRow[]>([]);

  const perfil = useAuthStore((s) => s.perfil);
  const anioActual = useMemo(() => new Date().getFullYear(), []);

  const misPlantelIds = useMemo(
    () => (perfil && !perfil.is_admin && perfil.plantel_ids?.length ? perfil.plantel_ids : null),
    [perfil],
  );
  const plantelesVisibles = useMemo(
    () => (misPlantelIds ? planteles.filter((p) => misPlantelIds.includes(p.id)) : planteles),
    [planteles, misPlantelIds],
  );
  const carrerasVisibles = useMemo(
    () => (misPlantelIds ? carreras.filter((c) => misPlantelIds.includes(c.plantel_id)) : carreras),
    [carreras, misPlantelIds],
  );

  const carrerasFiltered = useMemo(() => {
    const pid = plantel ? Number(plantel) : null;
    if (!pid) return carrerasVisibles;
    return carrerasVisibles.filter((c) => c.plantel_id === pid);
  }, [carrerasVisibles, plantel]);

  const planPreferido = useMemo(() => {
    const cid = carrera ? Number(carrera) : null;
    if (!cid) return null;
    const list = planes.filter((p) => p.carrera === cid);
    if (!list.length) return null;
    return [...list].sort((a, b) => (b.version ?? 0) - (a.version ?? 0) || b.id - a.id)[0];
  }, [carrera, planes]);

  const materiasFiltered = useMemo(() => {
    if (!planPreferido) return [];
    return materias.filter((m) => m.plan_estudio === planPreferido.id);
  }, [materias, planPreferido]);

  const ciclosOrdenados = useMemo(() => {
    const list = [...ciclos];
    list.sort((a, b) => {
      const aActual = a.anio_inicio <= anioActual && a.anio_fin >= anioActual ? 0 : 1;
      const bActual = b.anio_inicio <= anioActual && b.anio_fin >= anioActual ? 0 : 1;
      if (aActual !== bActual) return aActual - bActual;
      return (b.anio_inicio ?? 0) - (a.anio_inicio ?? 0);
    });
    return list;
  }, [ciclos, anioActual]);

  const loadBase = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [p, c, pl, per] = await Promise.all([
        apiGetPlanteles(token),
        apiGetCarreras(token),
        apiGetPlanesEstudio(token),
        apiGetPeriodosAcademicos(token),
      ]);
      setPlanteles(p);
      setCarreras(c);
      setPlanes(pl);
      setPeriodos(per);
    } catch {
      setError("No se pudieron cargar los catálogos para calificaciones.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (misPlantelIds && !plantel && plantelesVisibles.length) {
      setPlantel(String(plantelesVisibles[0].id));
    }
  }, [misPlantelIds, plantelesVisibles, plantel]);

  useEffect(() => {
    setCarrera("");
    setCiclo("");
    setPeriodo("");
    setMateria("");
    setCiclos([]);
    setPeriodos([]);
    setMaterias([]);
    setRows([]);
  }, [plantel]);

  useEffect(() => {
    setCiclo("");
    setPeriodo("");
    setMateria("");
    setCiclos([]);
    setPeriodos([]);
    setMaterias([]);
    setRows([]);
  }, [carrera]);

  useEffect(() => {
    if (!token) return;
    const cid = carrera ? Number(carrera) : null;
    if (!cid) return;
    setLoading(true);
    setError(null);
    const selectedCarrera = carreras.find((x) => x.id === cid) ?? null;
    const tipoPeriodoId = selectedCarrera?.tipo_periodo_id ?? null;
    Promise.all([
      tipoPeriodoId ? apiGetCiclosEscolares(token, { tipoPeriodoId }) : Promise.resolve([] as CicloEscolar[]),
      planPreferido ? apiGetMaterias(token, planPreferido.id) : Promise.resolve([] as Materia[]),
    ])
      .then(([cs, mats]) => {
        setCiclos(cs);
        setMaterias(mats);
        const actual = [...cs].sort((a, b) => {
          const aAct = a.anio_inicio <= anioActual && a.anio_fin >= anioActual ? 0 : 1;
          const bAct = b.anio_inicio <= anioActual && b.anio_fin >= anioActual ? 0 : 1;
          if (aAct !== bAct) return aAct - bAct;
          return (b.anio_inicio ?? 0) - (a.anio_inicio ?? 0);
        });
        setCiclo(cs.length ? String(actual[0].id) : "");
      })
      .catch(() => setError("No se pudieron cargar ciclos o materias para la carrera seleccionada."))
      .finally(() => setLoading(false));
  }, [carrera, carreras, planPreferido, token, anioActual]);

  useEffect(() => {
    if (!token) return;
    const cid = carrera ? Number(carrera) : null;
    const selectedCarrera = cid ? carreras.find((x) => x.id === cid) ?? null : null;
    const tipoPeriodoId = selectedCarrera?.tipo_periodo_id ?? null;
    const cicloId = ciclo ? Number(ciclo) : null;
    if (!cid || !cicloId || !tipoPeriodoId) {
      setPeriodos([]);
      setPeriodo("");
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    apiGetPeriodosAcademicos(token, { cicloEscolarId: cicloId, tipoPeriodoId })
      .then((pers) => {
        setPeriodos(pers);
        setPeriodo(pers.length ? String(pers[0].id) : "");
      })
      .catch(() => setError("No se pudieron cargar periodos académicos para el ciclo seleccionado."))
      .finally(() => setLoading(false));
  }, [carrera, ciclo, carreras, token]);

  useEffect(() => {
    setMateria("");
    if (materias.length) {
      setMateria(String(materias[0].id));
    }
  }, [periodo, materias]);

  useEffect(() => {
    if (!token) return;
    const cid = carrera ? Number(carrera) : null;
    const selectedCiclo = ciclo ? ciclos.find((x) => String(x.id) === ciclo) ?? null : null;
    const pid = periodo ? Number(periodo) : null;
    const mid = materia ? Number(materia) : null;
    if (!cid || !pid || !mid || !selectedCiclo?.clave) return;
    setLoading(true);
    setError(null);
    apiGetCalificacionesMatriz(token, {
      carreraId: cid,
      periodoAcademicoId: pid,
      materiaId: mid,
      cicloEscolar: selectedCiclo?.clave,
    })
      .then((r) => {
        setRows(r);
      })
      .catch((e) => {
        const err = e as { status?: number; message?: string; details?: unknown };
        const msg = err?.message || "No se pudieron cargar registros de calificaciones.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [carrera, ciclo, ciclos, materia, periodo, token]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calificaciones"
        subtitle="Captura por periodo con selectores en cascada y guardado por lote."
        right={
          <div className="flex items-center gap-2">
            <Badge variant="stone">{loading ? "Cargando…" : `${rows.length} registros`}</Badge>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              Carga masiva
            </Button>
            <Button disabled>Guardar y procesar lote</Button>
          </div>
        }
      />

      <Card>
        <div className="p-6">
          <div className="grid gap-3 lg:grid-cols-4">
            <Select value={plantel} onChange={(e) => setPlantel(e.target.value)}>
              <option value="">Seleccionar plantel</option>
              {plantelesVisibles.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nombre}
                </option>
              ))}
            </Select>
            <Select value={carrera} onChange={(e) => setCarrera(e.target.value)} disabled={!plantel}>
              <option value="">Seleccionar carrera</option>
              {carrerasFiltered.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <Select value={ciclo} onChange={(e) => setCiclo(e.target.value)} disabled={!carrera}>
              <option value="">Seleccionar ciclo escolar</option>
              {ciclosOrdenados.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.clave}
                </option>
              ))}
            </Select>
            <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} disabled={!ciclo}>
              <option value="">{ciclo ? "Seleccionar periodo" : "Selecciona ciclo primero"}</option>
              {periodos.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.clave || `Periodo ${p.numero ?? p.id}`}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr]">
            <Select value={materia} onChange={(e) => setMateria(e.target.value)} disabled={!periodo}>
              <option value="">Seleccionar materia</option>
              {materiasFiltered.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.clave_materia} — {m.nombre_materia}
                </option>
              ))}
            </Select>
          </div>

          {planPreferido ? (
            <div className="mt-4 text-xs text-uh-stone/70">
              Plan seleccionado: <span className="font-semibold text-uh-ink">{planPreferido.clave_plan}</span> (v{planPreferido.version})
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">{error}</div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-2xl border border-uh-stone/15">
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full border-collapse">
                <thead className="bg-uh-navy">
                  <tr className="text-left text-xs font-semibold tracking-[0.18em] text-white/90">
                    <th className="px-4 py-3">MATRÍCULA</th>
                    <th className="px-4 py-3">ALUMNO</th>
                    <th className="px-4 py-3">ORDINARIA</th>
                    <th className="px-4 py-3">EXTRA 1</th>
                    <th className="px-4 py-3">EXTRA 2</th>
                    <th className="px-4 py-3">FINAL</th>
                    <th className="px-4 py-3">LETRA</th>
                  </tr>
                </thead>
                <tbody>
                  {!carrera || !periodo || !ciclo || !materia ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-uh-stone/80">
                        Selecciona filtros para cargar la matriz de calificaciones.
                      </td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((r) => (
                      <tr key={r.inscripcion_periodo_id} className="border-t border-uh-stone/10 bg-white">
                        <td className="px-4 py-3 text-sm font-semibold text-uh-ink">{r.matricula}</td>
                        <td className="px-4 py-3 text-sm text-uh-ink">{r.alumno_nombre}</td>
                        <td className="px-4 py-3 text-sm text-uh-stone/85">{r.calificacion_ordinaria ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-uh-stone/85">{r.extraordinario_1 ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-uh-stone/85">{r.extraordinario_2 ?? "—"}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-uh-ink">{r.calificacion_final ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-uh-stone/85">{r.calificacion_letra || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-uh-stone/80">
                        {loading ? "Cargando calificaciones…" : "Sin registros para los filtros seleccionados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      <BulkUploadWizard
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        entity="calificaciones"
        columns={calificacionColumns}
        context={{
          carreraId: carrera ? Number(carrera) : undefined,
          periodoAcademicoId: periodo ? Number(periodo) : undefined,
          materiaId: materia ? Number(materia) : undefined,
          cicloEscolar: ciclo ? ciclosOrdenados.find((x) => String(x.id) === ciclo)?.clave : undefined,
          carreras: carrerasVisibles,
          ciclos: ciclosOrdenados,
          periodos,
          materias,
        }}
        onUploaded={({ carreraId, periodoAcademicoId, materiaId, cicloEscolar }) => {
          const cid = carreraId ?? (carrera ? Number(carrera) : null);
          const pid = periodoAcademicoId ?? (periodo ? Number(periodo) : null);
          const mid = materiaId ?? (materia ? Number(materia) : null);
          const selectedCiclo = cicloEscolar ?? (ciclo ? ciclosOrdenados.find((x) => String(x.id) === ciclo)?.clave : undefined);
          if (cid && pid && mid && selectedCiclo && token) {
            apiGetCalificacionesMatriz(token, {
              carreraId: cid,
              periodoAcademicoId: pid,
              materiaId: mid,
              cicloEscolar: selectedCiclo,
            })
              .then((r) => setRows(r))
              .catch(() => {});
          }
        }}
      />
    </div>
  );
}
