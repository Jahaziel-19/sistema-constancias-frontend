import { FileDown, ExternalLink, RefreshCcw, QrCode } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FloatingField from "@/components/ui/FloatingField";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import Stepper from "@/components/ui/Stepper";
import { apiEmitirDocumento, apiGetAlumnos, apiGetAutoridades, apiGetCarreras, apiGetDocumentoPdf, apiGetDocumentoPdfDownload, apiGetEstatus, apiGetPlanteles, apiGetTiposDocumento, apiGetTrayectorias } from "@/lib/api";
import type { Alumno, Autoridad, Carrera, DocumentoEmitido, EstatusAcademico, Plantel, TipoDocumento, TrayectoriaAcademica } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type RecipientMode = "alumno" | "externo";

function fullName(a: Pick<Alumno, "nombres" | "primer_apellido" | "segundo_apellido">) {
  return [a.nombres, a.primer_apellido, a.segundo_apellido].filter(Boolean).join(" ");
}

function safeString(v: unknown) {
  if (typeof v === "string") return v;
  if (!v) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function inferirRequisitosTipo(tipo: TipoDocumento | null): {
  estatusRequeridos: string[] | null;
  soloTitulado: boolean;
  requiereTitulacionEnProceso: boolean | null;
} {
  if (!tipo) return { estatusRequeridos: null, soloTitulado: false, requiereTitulacionEnProceso: null };
  const nom = (tipo.nombre || "").toLowerCase();
  const cat = (tipo.categoria || "").toLowerCase();
  const reglas = (tipo.reglas_validacion ?? {}) as Record<string, unknown>;

  let estatusRequeridos: string[] | null = null;
  let soloTitulado = false;
  let requiereTitulacionEnProceso: boolean | null = null;

  if (Array.isArray(reglas.requiere_estatus)) {
    estatusRequeridos = (reglas.requiere_estatus as unknown[]).map((r) => String(r).toLowerCase());
  }
  if (reglas.solo_estatus_titulado === true) soloTitulado = true;
  if (typeof reglas.requiere_titulacion_en_proceso === "boolean") {
    requiereTitulacionEnProceso = reglas.requiere_titulacion_en_proceso as boolean;
  }

  if (nom.includes("constancia de egreso") || nom.includes("constancia de terminación") || nom.includes("constancia de terminacion")) {
    if (!estatusRequeridos) estatusRequeridos = ["egresado", "titulado"];
  }
  if (nom.includes("constancia de estudios")) {
    if (!estatusRequeridos) estatusRequeridos = ["activo", "regular", "alumno regular", "inscrito"];
  }
  if (nom.includes("diploma") && !nom.includes("y reconocimiento") && !nom.includes("diploma/reconocimiento")) {
    if (!estatusRequeridos) estatusRequeridos = ["egresado", "titulado"];
  }
  if (nom.includes("kardex")) {
    if (!estatusRequeridos) estatusRequeridos = ["activo", "regular", "alumno regular", "inscrito", "egresado", "titulado"];
  }
  if (cat.includes("titulo") || nom.includes("título") || nom.includes("titulo profesional")) {
    soloTitulado = true;
  }
  if (nom.includes("constancia de finalizacion con titulacion") || nom.includes("constancia de finalización con titulación")) {
    requiereTitulacionEnProceso = true;
  }
  if (nom.includes("constancia de finalizacion sin titulacion") || nom.includes("constancia de finalización sin titulación")) {
    requiereTitulacionEnProceso = false;
  }

  return { estatusRequeridos, soloTitulado, requiereTitulacionEnProceso };
}

function extractBackendError(err: unknown): string {
  if (typeof err === "string") return err;
  const e = err as Record<string, unknown>;
  if (typeof e.message === "string" && e.message) return e.message;
  if (typeof e.detail === "string" && e.detail) return e.detail;
  if (Array.isArray(e.details)) {
    return e.details.map((d) => (typeof d === "string" ? d : safeString(d))).join("\n");
  }
  if (e.details && typeof e.details === "object") {
    const parts: string[] = [];
    const obj = e.details as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) {
        parts.push(`${k}: ${v.map((x) => (typeof x === "string" ? x : safeString(x))).join(", ")}`);
      } else if (typeof v === "string") {
        parts.push(`${k}: ${v}`);
      } else {
        parts.push(`${k}: ${safeString(v)}`);
      }
    }
    if (parts.length) return parts.join("\n");
  }
  return "No se pudo emitir el documento.";
}

export default function Emision() {
  const token = useAuthStore((s) => s.accessToken);
  const perfil = useAuthStore((s) => s.perfil);
  const autoridadRestringida = Boolean(perfil && !perfil.is_admin && perfil.autoridad_id);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DocumentoEmitido | null>(null);
  const [previewError, setPreviewError] = useState<string>("");
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string>("");
  const [loadingPdf, setLoadingPdf] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const [planteles, setPlanteles] = useState<Plantel[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [autoridades, setAutoridades] = useState<Autoridad[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [trayectorias, setTrayectorias] = useState<TrayectoriaAcademica[]>([]);
  const [estatusAcademicos, setEstatusAcademicos] = useState<EstatusAcademico[]>([]);

  const [tipoId, setTipoId] = useState<number | null>(null);
  const tipo = useMemo(() => tipos.find((t) => t.id === tipoId) ?? null, [tipoId, tipos]);
  const [categoriaTab, setCategoriaTab] = useState<string | null>(null);

  const CATEGORIA_ORDER = ["Constancias", "Kardex", "Títulos", "Diplomas y Reconocimientos"] as const;

  const categoriasOrdenadas = useMemo(() => {
    const cats = Array.from(new Set(tipos.map((t) => t.categoria).filter((c): c is string => Boolean(c))));
    cats.sort((a, b) => {
      const ia = CATEGORIA_ORDER.indexOf(a as typeof CATEGORIA_ORDER[number]);
      const ib = CATEGORIA_ORDER.indexOf(b as typeof CATEGORIA_ORDER[number]);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return cats;
  }, [tipos]);

  useEffect(() => {
    if (!categoriaTab || !categoriasOrdenadas.includes(categoriaTab)) {
      setCategoriaTab(categoriasOrdenadas[0] ?? null);
    }
  }, [categoriasOrdenadas, categoriaTab]);

  useEffect(() => {
    if (tipoId && tipo && tipo.categoria !== categoriaTab) {
      setTipoId(null);
    }
  }, [categoriaTab, tipo, tipoId]);

  const tiposFiltrados = useMemo(() => {
    if (!categoriaTab) return tipos;
    return tipos.filter((t) => t.categoria === categoriaTab);
  }, [tipos, categoriaTab]);

  const [recipientMode, setRecipientMode] = useState<RecipientMode>("alumno");
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const [qAlumno, setQAlumno] = useState("");

  const [externoNombres, setExternoNombres] = useState("");
  const [externoApellidos, setExternoApellidos] = useState("");
  const [externoCorreo, setExternoCorreo] = useState("");
  const [externoTelefono, setExternoTelefono] = useState("");
  const [plantelIdManual, setPlantelIdManual] = useState<string>("");
  const [autoridadId, setAutoridadId] = useState<string>("");
  const [descripcionNombramiento, setDescripcionNombramiento] = useState("");
  const [institucionOtorgante, setInstitucionOtorgante] = useState("");
  const [institucionPlantelPick, setInstitucionPlantelPick] = useState("");
  const [folioSep, setFolioSep] = useState("");

  const carreraById = useMemo(() => new Map(carreras.map((c) => [c.id, c])), [carreras]);

  const trayectoriaAlumno = useMemo(() => {
    if (!alumnoId) return null;
    const all = trayectorias.filter((t) => t.alumno === alumnoId);
    return all.find((t) => t.es_actual) ?? all[0] ?? null;
  }, [alumnoId, trayectorias]);

  const plantelIdDerived = useMemo(() => {
    if (!trayectoriaAlumno) return null;
    const carrera = carreraById.get(trayectoriaAlumno.carrera);
    return carrera?.plantel_id ?? null;
  }, [carreraById, trayectoriaAlumno]);

  const selectedPlantelId = useMemo(() => {
    if (recipientMode === "alumno") return plantelIdDerived ? String(plantelIdDerived) : "";
    return plantelIdManual;
  }, [plantelIdDerived, plantelIdManual, recipientMode]);

  const estatusById = useMemo(() => new Map(estatusAcademicos.map((e) => [e.id, e])), [estatusAcademicos]);

  const alumnoEstatus = useMemo(() => {
    const map = new Map<number, string>();
    const titMap = new Map<number, boolean>();
    const byAlumno = new Map<number, TrayectoriaAcademica[]>();
    for (const t of trayectorias) {
      const arr = byAlumno.get(t.alumno) ?? [];
      arr.push(t);
      byAlumno.set(t.alumno, arr);
    }
    for (const [alumnoId, ts] of byAlumno) {
      const actual = ts.find((t) => t.es_actual) ?? ts[0];
      if (!actual) continue;
      const est = estatusById.get(actual.estatus_academico);
      const nombre = String(est?.nombre ?? "").toLowerCase();
      map.set(alumnoId, nombre);
      titMap.set(alumnoId, Boolean(actual.titulacion_en_proceso));
    }
    return { estatus: map, titulacion: titMap };
  }, [trayectorias, estatusById]);

  const alumnosElegibles = useMemo(() => {
    if (!tipo) return alumnos;
    const { estatusRequeridos, soloTitulado, requiereTitulacionEnProceso } = inferirRequisitosTipo(tipo);

    return alumnos.filter((a) => {
      const estatusNombre = alumnoEstatus.estatus.get(a.id) ?? "";
      if (soloTitulado) {
        if (!estatusNombre.includes("titulado") && !estatusNombre.includes("graduado")) return false;
      }
      if (estatusRequeridos && estatusRequeridos.length > 0) {
        if (!estatusRequeridos.some((r) => estatusNombre.includes(r))) return false;
      }
      if (typeof requiereTitulacionEnProceso === "boolean") {
        const tiene = alumnoEstatus.titulacion.get(a.id) ?? false;
        if (tiene !== requiereTitulacionEnProceso) return false;
      }
      return true;
    });
  }, [alumnos, tipo, alumnoEstatus]);

  const alumnoSeleccionadoEsElegible = useMemo(() => {
    if (!tipo || !alumnoId) return true;
    const { estatusRequeridos, soloTitulado, requiereTitulacionEnProceso } = inferirRequisitosTipo(tipo);
    const estatusNombre = alumnoEstatus.estatus.get(alumnoId) ?? "";
    if (soloTitulado) {
      if (!estatusNombre.includes("titulado") && !estatusNombre.includes("graduado")) return false;
    }
    if (estatusRequeridos && estatusRequeridos.length > 0) {
      if (!estatusRequeridos.some((r) => estatusNombre.includes(r))) return false;
    }
    if (typeof requiereTitulacionEnProceso === "boolean") {
      const tiene = alumnoEstatus.titulacion.get(alumnoId) ?? false;
      if (tiene !== requiereTitulacionEnProceso) return false;
    }
    return true;
  }, [alumnoId, tipo, alumnoEstatus]);

  const esDiplomaReconocimiento = useMemo(() => {
    if (!tipo) return false;
    const cat = String(tipo.categoria ?? "").toUpperCase();
    const nom = String(tipo.nombre ?? "").toUpperCase();
    if (cat.includes("DIPLOMA") && cat.includes("RECONOCIMIENTO")) return true;
    if (nom.includes("DIPLOMA Y RECONOCIMIENTO") || nom.includes("DIPLOMA/RECONOCIMIENTO")) return true;
    return false;
  }, [tipo]);

  const esTitulo = useMemo(() => {
    if (!tipo) return false;
    const cat = String(tipo.categoria ?? "").toUpperCase();
    const nom = String(tipo.nombre ?? "").toLowerCase();
    if (cat === "TITULO") return true;
    if (/t[ií]tulo profesional/.test(nom)) return true;
    return false;
  }, [tipo]);

  const allowedModes = useMemo(() => {
    if (esTitulo) return { allowAlumno: true, allowExterno: false };
    const a = (tipo?.aplica_a ?? "").toLowerCase();
    const allowAlumno = !a || a.includes("alumno") || a.includes("ambos");
    const allowExterno = !a || a.includes("externo") || a.includes("ambos");
    return { allowAlumno, allowExterno };
  }, [esTitulo, tipo?.aplica_a]);

  const alumnoTieneEstatusTitulado = useMemo(() => {
    if (!alumnoId) return false;
    const todasTrayectorias = trayectorias.filter((t) => t.alumno === alumnoId);
    if (!todasTrayectorias.length) return false;
    return todasTrayectorias.some((t) => {
      const estatus = estatusById.get(t.estatus_academico);
      const nombre = String(estatus?.nombre ?? "").toLowerCase();
      return nombre.includes("titulado") || nombre.includes("graduado");
    });
  }, [alumnoId, trayectorias, estatusById]);

  useEffect(() => {
    if (!allowedModes.allowAlumno && allowedModes.allowExterno) setRecipientMode("externo");
    if (!allowedModes.allowExterno && allowedModes.allowAlumno) setRecipientMode("alumno");
  }, [allowedModes.allowAlumno, allowedModes.allowExterno]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [p, c, au, td, a, t, ea] = await Promise.all([
        apiGetPlanteles(token),
        apiGetCarreras(token),
        apiGetAutoridades(token),
        apiGetTiposDocumento(token),
        apiGetAlumnos(token),
        apiGetTrayectorias(token),
        apiGetEstatus(token),
      ]);
      setPlanteles(p);
      setCarreras(c);
      setAutoridades(au);
      setTipos(td);
      setAlumnos(a);
      setTrayectorias(t);
      setEstatusAcademicos(ea);
    } catch (e) {
      setError("No se pudo cargar catálogos para emisión. Verifica sesión y backend.");
      setTipos([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (perfil && !perfil.is_admin && perfil.autoridad_id && autoridades.length && !autoridadId) {
      setAutoridadId(String(perfil.autoridad_id));
    }
  }, [autoridades, perfil, autoridadId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setAlumnoId(null);
    setQAlumno("");
  }, [tipoId]);

  useEffect(() => {
    if (success) return;
    setSuccess(null);
    setError(null);
    setPreviewError("");
    if (pdfObjectUrl) {
      URL.revokeObjectURL(pdfObjectUrl);
    }
    setPdfObjectUrl("");
    setDescripcionNombramiento("");
    setInstitucionOtorgante("");
    setInstitucionPlantelPick("");
    setAutoridadId("");
    setFolioSep("");
  }, [tipoId, alumnoId, recipientMode, externoNombres, externoApellidos, externoCorreo, externoTelefono, plantelIdManual, pdfObjectUrl, success]);

  const alumnoById = useMemo(() => new Map(alumnos.map((a) => [a.id, a])), [alumnos]);
  const selectedAlumno = alumnoId ? alumnoById.get(alumnoId) ?? null : null;

  const filteredAlumnos = useMemo(() => {
    const s = qAlumno.trim().toLowerCase();
    const base = alumnosElegibles;
    const list = !s
      ? base
      : base.filter((a) => `${a.matricula} ${a.curp} ${fullName(a)}`.toLowerCase().includes(s));
    return list.slice(0, 5);
  }, [alumnosElegibles, qAlumno]);

  const canContinueStep1 = Boolean(tipoId);
  const canContinueStep2 = useMemo(() => {
    if (!tipoId) return false;
    const esDiploReco = esDiplomaReconocimiento;
    const esTit = esTitulo;
    if (recipientMode === "alumno") {
      if (!alumnoId || !selectedPlantelId) return false;
      if (!alumnoSeleccionadoEsElegible) return false;
    } else {
      if (!externoNombres.trim()) return false;
      if (!esDiploReco && !selectedPlantelId) return false;
    }
    if (esDiploReco && !descripcionNombramiento.trim()) return false;
    if (esTit) {
      if (!alumnoTieneEstatusTitulado) return false;
      if (!folioSep.trim()) return false;
      if (!autoridadId) return false;
    }
    return true;
  }, [alumnoId, alumnoSeleccionadoEsElegible, alumnoTieneEstatusTitulado, autoridadId, descripcionNombramiento, esDiplomaReconocimiento, esTitulo, externoNombres, folioSep, recipientMode, selectedPlantelId, tipoId]);

  const canEmit = useMemo(() => {
    if (!tipoId) return false;
    const esDiploReco = esDiplomaReconocimiento;
    const esTit = esTitulo;
    if (recipientMode === "alumno" && !alumnoId) return false;
    if (recipientMode === "externo" && !externoNombres.trim()) return false;
    if (!esDiploReco && !selectedPlantelId) return false;
    if (esDiploReco && !descripcionNombramiento.trim()) return false;
    if (esTit) {
      if (!alumnoTieneEstatusTitulado) return false;
      if (!folioSep.trim()) return false;
      if (!autoridadId) return false;
    }
    return true;
  }, [alumnoId, alumnoTieneEstatusTitulado, autoridadId, descripcionNombramiento, esDiplomaReconocimiento, esTitulo, externoNombres, folioSep, recipientMode, selectedPlantelId, tipoId]);

  const onEmit = useCallback(async () => {
    if (!token || !tipoId) return;
    if (!canEmit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreviewError("");
    try {
      let plantel_id = Number(selectedPlantelId);
      if (!plantel_id || Number.isNaN(plantel_id)) {
        const fallback = planteles[0];
        plantel_id = fallback ? fallback.id : 0;
      }
      const autoridad_id = autoridadId ? Number(autoridadId) : null;
      const esDiploReco = esDiplomaReconocimiento;
      const esTit = esTitulo;

      const baseAlumno = {
        tipo_documento_id: tipoId,
        plantel_id,
        autoridad_id,
        alumno_id: alumnoId,
        aprobado_directiva: true,
        descripcion_nombramiento: descripcionNombramiento.trim(),
        institucion_otorgante: institucionOtorgante.trim(),
        ...(esTit && folioSep.trim() ? { folio_sep: folioSep.trim() } : {}),
      };
      const baseExterno = {
        tipo_documento_id: tipoId,
        plantel_id,
        autoridad_id,
        externo_nombres: externoNombres.trim(),
        externo_apellidos: externoApellidos.trim(),
        externo_correo: esDiploReco ? "" : externoCorreo.trim(),
        externo_telefono: esDiploReco ? "" : externoTelefono.trim(),
        aprobado_directiva: true,
        descripcion_nombramiento: descripcionNombramiento.trim(),
        institucion_otorgante: institucionOtorgante.trim(),
      };
      const payload = recipientMode === "alumno" ? baseAlumno : baseExterno;

      const doc = await apiEmitirDocumento(token, payload);
      setSuccess(doc);
      try {
        setLoadingPdf(true);
        const blob = await apiGetDocumentoPdf(token, doc.id);
        setPdfObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } catch (e) {
        const err = e as { message?: string };
        setPreviewError(err?.message || "No se pudo generar el PDF oficial.");
        setPdfObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return "";
        });
      } finally {
        setLoadingPdf(false);
      }
      } catch (e) {
        setError(extractBackendError(e));
      } finally {
        setLoading(false);
      }
  }, [alumnoId, autoridadId, canEmit, descripcionNombramiento, esDiplomaReconocimiento, esTitulo, externoApellidos, externoCorreo, externoNombres, externoTelefono, folioSep, institucionOtorgante, planteles, recipientMode, selectedPlantelId, tipoId, token]);

  const regenerarPdf = useCallback(async () => {
    if (!token || !success) return;
    setPreviewError("");
    try {
      setLoadingPdf(true);
      const blob = await apiGetDocumentoPdf(token, success.id);
      setPdfObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      const err = e as { message?: string };
      setPreviewError(err?.message || "No se pudo regenerar el PDF oficial.");
      setPdfObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    } finally {
      setLoadingPdf(false);
    }
  }, [token, success]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emisión de documentos"
        subtitle="Asistente guiado de 3 pasos con validación por reglas y generación oficial de PDF con estilos institucionales."
        right={
          <div className="hidden items-center gap-3 md:flex">
            <Stepper step={step} />
          </div>
        }
      />

      <div className={cn("grid gap-5", step === 3 ? "lg:grid-cols-[1.1fr_1fr]" : "lg:grid-cols-1")}>
        <Card>
          <div className="p-6">
            <div className="grid items-center gap-4" style={{ gridTemplateColumns: "auto 1fr auto" }}>
              <div>
                {step === 1 ? (
                  <Button variant="secondary" disabled>
                    Cancelar
                  </Button>
                ) : step > 1 ? (
                  <Button variant="secondary" onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}>
                    Volver
                  </Button>
                ) : null}
              </div>
              <div className="text-center text-xs font-semibold tracking-[0.18em] text-uh-stone/70">PASO {step} DE 3</div>
              <div className="flex items-center justify-end gap-2">
                {step === 3 ? (
                  <Button variant="gold" disabled={!canEmit || loading} onClick={() => void onEmit()}>
                    <QrCode className="h-4 w-4" />
                    {loading ? "Emitiendo…" : "Emitir documento"}
                  </Button>
                ) : (
                  <Button
                    disabled={(step === 1 ? !canContinueStep1 : !canContinueStep2) || loading || !token}
                    onClick={() => setStep((prev) => (prev + 1) as 2 | 3)}
                  >
                    {step === 2 ? (loading ? "Cargando…" : "Continuar") : "Continuar"}
                  </Button>
                )}
                <div className="md:hidden">
                  <Stepper step={step} />
                </div>
              </div>
            </div>

            {step === 1 ? (
              <div className="mt-5">
                <div className="uh-title text-lg font-semibold text-uh-ink">Selecciona el tipo de documento</div>
                

                <div className="mt-5 grid gap-3">
                  {categoriasOrdenadas.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {categoriasOrdenadas.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoriaTab(cat)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.18em] transition",
                            categoriaTab === cat
                              ? "border-uh-gold/40 bg-white text-uh-ink"
                              : "border-uh-stone/20 bg-white/60 text-uh-stone/80",
                          )}
                        >
                          {cat.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                     {tiposFiltrados.map((d) => {
                       const active = d.id === tipoId;
                       const { estatusRequeridos, soloTitulado, requiereTitulacionEnProceso } = inferirRequisitosTipo(d);
                       const reglas = (d.reglas_validacion ?? {}) as Record<string, unknown>;
                       const requiere = estatusRequeridos ? estatusRequeridos.join(", ") : "";
                       let nota: string;
                       if (soloTitulado) nota = "Solo para alumnos titulados/graduados.";
                       else if (requiere) nota = `Requiere estatus: ${requiere}.`;
                       else if (reglas.requiere_aprobacion_directiva) nota = "Requiere aprobación directiva.";
                       else if (requiereTitulacionEnProceso === true) nota = "Requiere titulación en proceso.";
                       else if (requiereTitulacionEnProceso === false) nota = "Requiere NO estar en titulación en proceso.";
                       else nota = "";
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setTipoId(d.id)}
                          className={cn(
                            "rounded-2xl border bg-white p-4 text-left transition",
                            active ? "border-uh-gold/70 shadow-paper" : "border-uh-stone/15 hover:border-uh-gold/40 hover:shadow-paper",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="uh-title text-base font-semibold text-uh-ink leading-tight">{d.nombre}</div>
                              
                              {nota ? <div className="mt-2 text-xs text-uh-stone/80">{nota}</div> : null}
                            </div>
                            
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {tipos.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-uh-stone/80">
                      {loading ? "Cargando tipos de documento…" : "No hay tipos de documento registrados."}
                    </div>
                  ) : null}
                </div>

                
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-5">
                <div className="uh-title text-lg font-semibold text-uh-ink">Selecciona el destinatario</div>
                <div className="mt-1 text-sm text-uh-stone/80">
                  Alumno registrado (búsqueda) o externo (captura rápida). 
                </div>
                {autoridadRestringida ? (
                  <div className="mt-3 rounded-2xl border border-uh-navy/25 bg-uh-navy/5 px-4 py-3 text-sm text-uh-ink">
                    Firmarás como <b>{perfil?.autoridad_nombre || "tu autoridad"}</b>. No puedes emitir documentos a nombre de otras autoridades.
                  </div>
                ) : null}

                <div className="mt-5 rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRecipientMode("alumno")}
                      disabled={!allowedModes.allowAlumno}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.18em] transition",
                        recipientMode === "alumno" ? "border-uh-gold/40 bg-white text-uh-ink" : "border-uh-stone/20 bg-white/60 text-uh-stone/80",
                        !allowedModes.allowAlumno && "opacity-50",
                      )}
                    >
                      ALUMNO
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode("externo")}
                      disabled={!allowedModes.allowExterno}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.18em] transition",
                        recipientMode === "externo" ? "border-uh-gold/40 bg-white text-uh-ink" : "border-uh-stone/20 bg-white/60 text-uh-stone/80",
                        !allowedModes.allowExterno && "opacity-50",
                      )}
                    >
                      EXTERNO
                    </button>
                    {tipo ? <Badge variant="blue">Tipo: {tipo.nombre}</Badge> : null}
                    {recipientMode === "alumno" && selectedPlantelId ? <Badge variant="stone">Plantel: {selectedPlantelId}</Badge> : null}
                  </div>

                  {recipientMode === "alumno" ? (
                    <div className="mt-4">
                      <div className="grid gap-3">
                        <div className="text-xs font-semibold tracking-[0.12em] text-uh-stone/70">
                          PASO 1 · SELECCIONA AL ALUMNO
                        </div>
                        <Input value={qAlumno} onChange={(e) => setQAlumno(e.target.value)} placeholder="Buscar por matrícula, CURP o nombre" />
                        <div className="grid gap-2">
                          {filteredAlumnos.map((a) => {
                            const active = a.id === alumnoId;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => setAlumnoId(a.id)}
                                className={cn(
                                  "flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition",
                                  active
                                    ? "border-uh-gold/60 shadow-paper"
                                    : "border-uh-stone/15 hover:border-uh-gold/40 hover:shadow-paper",
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-uh-ink">{fullName(a)}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-uh-stone/75">
                                    <span className="font-mono">{a.matricula}</span>
                                    <span className="font-mono">{a.curp}</span>
                                  </div>
                                </div>
                                <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">
                                  {active ? "✓ SELECCIONADO" : "SELECCIONAR"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {filteredAlumnos.length === 0 ? (
                          qAlumno ? (
                            <div className="px-4 py-6 text-center text-sm text-uh-stone/80">
                              No se encontraron alumnos con esa búsqueda.
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-uh-stone/80">
                              No hay alumnos disponibles que cumplan con los requisitos de estatus para este documento.
                            </div>
                          )
                        ) : null}
                        {alumnoId && !plantelIdDerived ? (
                          <div className="rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">
                            No se pudo inferir el plantel porque el alumno no tiene trayectoria/carrera actual asignada. Corrige la trayectoria del alumno (Carrera) y vuelve a intentar.
                          </div>
                        ) : null}
                        {alumnoId && !alumnoSeleccionadoEsElegible ? (
                          <div className="rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">
                            El alumno seleccionado no cumple con los requisitos de estatus para este tipo de documento.
                          </div>
                        ) : null}
                        {esDiplomaReconocimiento ? (
                          <div className="mt-2 rounded-2xl border border-uh-gold/30 bg-uh-gold/5 p-4">
                            <div className="mb-3 text-xs font-semibold tracking-[0.18em] text-uh-navy">
                              PASO 2 · DATOS DEL DIPLOMA / RECONOCIMIENTO
                            </div>
                            <div className="grid gap-3">
                              <div className="rounded-xl border border-uh-gold/30 bg-white px-3 py-2 text-xs font-semibold tracking-[0.08em] text-uh-navy">
                                A QUIÉN SE EXPIDE:{" "}
                                {selectedAlumno
                                  ? fullName(selectedAlumno)
                                  : "— selecciona un alumno en el listado superior —"}
                              </div>
                              <Select value={autoridadId} onChange={(e) => setAutoridadId(e.target.value)} disabled={autoridadRestringida}>
                                <option value="">Firma / Autoridad que expide</option>
                                {autoridades.map((au) => (
                                  <option key={au.id} value={String(au.id)}>
                                    {[au.nombres, au.apellidos].filter(Boolean).join(" ")} — {au.cargo}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                value={institucionPlantelPick}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setInstitucionPlantelPick(v);
                                  if (v && v !== "__custom__") {
                                    const p = planteles.find((x) => String(x.id) === v);
                                    if (p) setInstitucionOtorgante(p.nombre);
                                  } else if (v === "__custom__") {
                                    setInstitucionOtorgante("");
                                  }
                                }}
                              >
                                <option value="">Institución que otorga (elige plantel o escribe)</option>
                                {planteles.map((p) => (
                                  <option key={p.id} value={String(p.id)}>
                                    {p.nombre}
                                  </option>
                                ))}
                                <option value="__custom__">✎ Otra / escribir institución</option>
                              </Select>
                              {(!institucionPlantelPick || institucionPlantelPick === "__custom__") ? (
                                <FloatingField
                                  label="Institución que otorga (nombre)"
                                  value={institucionOtorgante}
                                  onChange={(e) => setInstitucionOtorgante(e.target.value)}
                                  placeholder="Ej. Colegio Universitario Hispana"
                                />
                              ) : null}
                              <div className="relative">
                                <textarea
                                  value={descripcionNombramiento}
                                  onChange={(e) => setDescripcionNombramiento(e.target.value)}
                                  rows={5}
                                  placeholder="Descripción del nombramiento o motivo del reconocimiento (requerido)"
                                  className={
                                    "peer w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm text-uh-ink shadow-sm outline-none transition placeholder:opacity-0 " +
                                    (descripcionNombramiento
                                      ? "border-uh-gold/50 "
                                      : "border-uh-stone/20 focus:border-uh-gold/50 ")
                                  }
                                />
                                <label
                                  className={
                                    "pointer-events-none absolute left-4 text-xs transition " +
                                    (descripcionNombramiento
                                      ? "top-1.5 text-[11px] font-semibold tracking-[0.08em] text-uh-gold "
                                      : "top-5 text-uh-stone/70 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:tracking-[0.08em] peer-focus:text-uh-gold ")
                                  }
                                >
                                  Descripción del nombramiento / Motivo
                                </label>
                              </div>
                              {esDiplomaReconocimiento && !descripcionNombramiento.trim() ? (
                                <div className="rounded-xl border border-uh-amber/30 bg-uh-amber/10 px-3 py-2 text-xs text-uh-ink">
                                  ⚠ Escribe la descripción del nombramiento para poder continuar.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {esTitulo ? (
                          <div className="mt-2 rounded-2xl border border-uh-navy/25 bg-uh-navy/5 p-4">
                            <div className="mb-3 text-xs font-semibold tracking-[0.18em] text-uh-navy">
                              PASO 2 · DATOS DEL TÍTULO PROFESIONAL
                            </div>
                            <div className="grid gap-3">
                              <div className="rounded-xl border border-uh-gold/30 bg-white px-3 py-2 text-xs font-semibold tracking-[0.08em] text-uh-navy">
                                TITULAR:{" "}
                                {selectedAlumno
                                  ? fullName(selectedAlumno)
                                  : "— selecciona un alumno en el listado superior —"}
                              </div>

                              {alumnoId ? (
                                alumnoTieneEstatusTitulado ? (
                                  <div className="rounded-xl border border-uh-emerald/30 bg-uh-emerald/10 px-3 py-2 text-xs font-semibold tracking-[0.1em] text-uh-emerald">
                                    ✅ ESTATUS TITULADO / GRADUADO · SELECCIÓN VÁLIDA
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-uh-red/30 bg-uh-red/10 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-uh-red">
                                    ❌ ALUMNO NO CALIFICA · Actualiza la trayectoria del alumno a estatus "Titulado" o "Graduado" antes de continuar.
                                  </div>
                                )
                              ) : null}

                              <Select value={autoridadId} onChange={(e) => setAutoridadId(e.target.value)} disabled={autoridadRestringida}>
                                <option value="">Firma / Autoridad que expide (requerido)</option>
                                {autoridades.map((au) => (
                                  <option key={au.id} value={String(au.id)}>
                                    {[au.nombres, au.apellidos].filter(Boolean).join(" ")} — {au.cargo}
                                  </option>
                                ))}
                              </Select>

                              <FloatingField
                                label="Folio SEP / Núm. Registro Oficial S.E.P. (requerido)"
                                value={folioSep}
                                onChange={(e) => setFolioSep(e.target.value)}
                                placeholder="Ej. 12345678 / SEP2024-000123"
                              />

                              <div className="rounded-xl border border-uh-amber/30 bg-uh-amber/10 px-3 py-2 text-xs text-uh-ink">
                                ℹ Este valor se captura manualmente <b>una sola vez</b>, no se puede editar posteriormente y solo puede emitirse UN Título Profesional por alumno.
                              </div>

                              {esTitulo && (!folioSep.trim() || !autoridadId || !alumnoTieneEstatusTitulado) ? (
                                <div className="rounded-xl border border-uh-amber/30 bg-uh-amber/10 px-3 py-2 text-xs text-uh-ink">
                                  ⚠ Completa la autoridad, el folio SEP y selecciona un alumno con estatus titulado para poder continuar.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {esDiplomaReconocimiento ? (
                        <div className="rounded-xl border border-uh-gold/30 bg-uh-gold/5 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-uh-navy">
                          A QUIÉN SE EXPIDE
                        </div>
                      ) : null}
                      <FloatingField label={esDiplomaReconocimiento ? "Nombre completo (A quién se expide)" : "Nombres"} value={externoNombres} onChange={(e) => setExternoNombres(e.target.value)} />
                      <FloatingField label="Apellidos" value={externoApellidos} onChange={(e) => setExternoApellidos(e.target.value)} />
                      {!esDiplomaReconocimiento ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FloatingField label="Correo" value={externoCorreo} onChange={(e) => setExternoCorreo(e.target.value)} />
                            <FloatingField label="Teléfono" value={externoTelefono} onChange={(e) => setExternoTelefono(e.target.value)} />
                          </div>
                          <Select value={plantelIdManual} onChange={(e) => setPlantelIdManual(e.target.value)}>
                            <option value="">Selecciona plantel</option>
                            {planteles.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.nombre}
                              </option>
                            ))}
                          </Select>
                        </>
                      ) : null}
                      {esDiplomaReconocimiento ? (
                        <div className="mt-2 rounded-2xl border border-uh-gold/30 bg-uh-gold/5 p-4">
                          <div className="mb-3 text-xs font-semibold tracking-[0.18em] text-uh-navy">
                            DATOS DEL DIPLOMA / RECONOCIMIENTO
                          </div>
                          <div className="grid gap-3">
                            <Select value={autoridadId} onChange={(e) => setAutoridadId(e.target.value)} disabled={autoridadRestringida}>
                              <option value="">Firma / Autoridad que expide</option>
                              {autoridades.map((au) => (
                                <option key={au.id} value={String(au.id)}>
                                  {[au.nombres, au.apellidos].filter(Boolean).join(" ")} — {au.cargo}
                                </option>
                              ))}
                            </Select>
                            <Select
                              value={institucionPlantelPick}
                              onChange={(e) => {
                                const v = e.target.value;
                                setInstitucionPlantelPick(v);
                                if (v && v !== "__custom__") {
                                  const p = planteles.find((x) => String(x.id) === v);
                                  if (p) setInstitucionOtorgante(p.nombre);
                                } else if (v === "__custom__") {
                                  setInstitucionOtorgante("");
                                }
                              }}
                            >
                              <option value="">Institución que otorga (elige plantel o escribe)</option>
                              {planteles.map((p) => (
                                <option key={p.id} value={String(p.id)}>
                                  {p.nombre}
                                </option>
                              ))}
                              <option value="__custom__">✎ Otra / escribir institución</option>
                            </Select>
                            {(!institucionPlantelPick || institucionPlantelPick === "__custom__") ? (
                              <FloatingField
                                label="Institución que otorga (nombre)"
                                value={institucionOtorgante}
                                onChange={(e) => setInstitucionOtorgante(e.target.value)}
                                placeholder="Ej. Colegio Universitario Hispana"
                              />
                            ) : null}
                            <div className="relative">
                              <textarea
                                value={descripcionNombramiento}
                                onChange={(e) => setDescripcionNombramiento(e.target.value)}
                                rows={4}
                                placeholder="Descripción del nombramiento o motivo del reconocimiento (requerido)"
                                className={
                                  "peer w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm text-uh-ink shadow-sm outline-none transition placeholder:opacity-0 " +
                                  (descripcionNombramiento
                                    ? "border-uh-gold/50 "
                                    : "border-uh-stone/20 focus:border-uh-gold/50 ")
                                }
                              />
                              <label
                                className={
                                  "pointer-events-none absolute left-4 text-xs transition " +
                                  (descripcionNombramiento
                                    ? "top-1.5 text-[11px] font-semibold tracking-[0.08em] text-uh-gold "
                                    : "top-5 text-uh-stone/70 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:tracking-[0.08em] peer-focus:text-uh-gold ")
                                }
                              >
                                Descripción del nombramiento / Motivo
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-5">
                <div className="uh-title text-lg font-semibold text-uh-ink">Vista previa y emisión</div>
                

                <div className="mt-5 grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {success ? <Badge variant="emerald">Emitido: {success.folio}</Badge> : <Badge variant="stone">Listo para emitir</Badge>}
                    
                    {tipo ? <Badge variant="stone">Tipo: {tipo.nombre}</Badge> : null}
                    {esDiplomaReconocimiento ? <Badge variant="blue">Formato horizontal (A4)</Badge> : null}
                    {esTitulo ? <Badge variant="blue">Formato Título Profesional · Portrait</Badge> : null}
                  </div>

                  {esTitulo ? (
                    <div className="rounded-2xl border border-uh-navy/25 bg-uh-navy/5 p-4 text-sm text-uh-ink">
                      <div className="mb-2 text-xs font-semibold tracking-[0.18em] text-uh-navy">RESUMEN · TÍTULO PROFESIONAL</div>
                      <ul className="list-disc space-y-1 pl-5 text-[13px]">
                        <li>
                          <b>Titular:</b>{" "}
                          {selectedAlumno
                            ? fullName(selectedAlumno)
                            : "—"}
                        </li>
                        <li>
                          <b>Estatus:</b>{" "}
                          {alumnoTieneEstatusTitulado ? (
                            <span className="font-semibold text-uh-emerald">✅ Titulado / Válido</span>
                          ) : (
                            <span className="font-semibold text-uh-red">❌ No califica</span>
                          )}
                        </li>
                        <li>
                          <b>Firma / Autoridad:</b>{" "}
                          {autoridadId
                            ? (() => {
                                const au = autoridades.find((x) => String(x.id) === String(autoridadId));
                                if (!au) return "—";
                                return `${[au.nombres, au.apellidos].filter(Boolean).join(" ")} — ${au.cargo}`;
                              })()
                            : "—"}
                        </li>
                        <li>
                          <b>Folio SEP / Registro Oficial:</b>{" "}
                          <span className="font-bold text-uh-gold">{folioSep || "— (requerido)"}</span>
                        </li>
                        <li>
                          <b>Aprobación directiva:</b> <span className="font-semibold text-uh-emerald">Sí (automática)</span>
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  {esDiplomaReconocimiento ? (
                    <div className="rounded-2xl border border-uh-gold/30 bg-uh-gold/5 p-4 text-sm text-uh-ink">
                      <div className="mb-2 text-xs font-semibold tracking-[0.18em] text-uh-navy">RESUMEN · DIPLOMA / RECONOCIMIENTO</div>
                      <ul className="list-disc space-y-1 pl-5 text-[13px]">
                        <li>
                          <b>Destinatario:</b>{" "}
                          {recipientMode === "alumno"
                            ? selectedAlumno
                              ? fullName(selectedAlumno)
                              : "—"
                            : [externoNombres, externoApellidos].filter(Boolean).join(" ") || "—"}
                        </li>
                        <li>
                          <b>Modalidad:</b>{" "}
                          {recipientMode === "alumno" ? "Alumno" : "Externo"}
                        </li>
                        {recipientMode === "alumno" && selectedAlumno ? (
                          <>
                            <li>
                              <b>Matrícula:</b> {selectedAlumno.matricula}
                            </li>
                            <li>
                              <b>CURP:</b> {selectedAlumno.curp}
                            </li>
                        {plantelIdDerived || plantelIdManual ? (
                          <li>
                            <b>Plantel:</b>{" "}
                            {(() => {
                              const pid = plantelIdDerived ? plantelIdDerived : plantelIdManual;
                              const p = planteles.find((x) => x.id === Number(pid));
                              return p ? p.nombre : "—";
                            })()}
                          </li>
                        ) : null}
                            {trayectoriaAlumno ? (
                              <li>
                                <b>Carrera:</b>{" "}
                                {carreraById.get(trayectoriaAlumno.carrera)?.nombre ?? "—"}
                              </li>
                            ) : null}
                          </>
                        ) : null}
                        {recipientMode === "externo" ? (
                          <>
                            <li>
                              <b>Correo:</b> {externoCorreo || "—"}
                            </li>
                            <li>
                              <b>Teléfono:</b> {externoTelefono || "—"}
                            </li>
                            {plantelIdManual ? (
                              <li>
                                <b>Plantel:</b>{" "}
                                {(() => {
                                  const p = planteles.find((x) => String(x.id) === plantelIdManual);
                                  return p ? p.nombre : "—";
                                })()}
                              </li>
                            ) : null}
                          </>
                        ) : null}
                        <li>
                          <b>Firma / Autoridad:</b>{" "}
                          {autoridadId
                            ? (() => {
                                const au = autoridades.find((x) => String(x.id) === String(autoridadId));
                                if (!au) return "—";
                                return `${[au.nombres, au.apellidos].filter(Boolean).join(" ")} — {au.cargo}`;
                              })()
                            : "—"}
                        </li>
                        <li>
                          <b>Institución que otorga:</b> {institucionOtorgante || "— (usa institución default)"}
                        </li>
                        <li>
                          <b>Descripción:</b> {descripcionNombramiento || "—"}
                        </li>
                        <li>
                          <b>Aprobación directiva:</b> <span className="font-semibold text-uh-emerald">Sí (automática)</span>
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  {tipo?.categoria === "CONSTANCIAS" && !esTitulo && !esDiplomaReconocimiento ? (
                    <div className="rounded-2xl border border-uh-stone/15 bg-white p-4 text-sm text-uh-ink">
                      <div className="mb-2 text-xs font-semibold tracking-[0.18em] text-uh-navy">RESUMEN · CONSTANCIA</div>
                      <ul className="list-disc space-y-1 pl-5 text-[13px]">
                        <li>
                          <b>Destinatario:</b>{" "}
                          {selectedAlumno ? fullName(selectedAlumno) : "—"}
                        </li>
                        {selectedAlumno ? (
                          <>
                            <li>
                              <b>Matrícula:</b> {selectedAlumno.matricula}
                            </li>
                            <li>
                              <b>CURP:</b> {selectedAlumno.curp}
                            </li>
                          </>
                        ) : null}
                        {plantelIdDerived || plantelIdManual ? (
                          <li>
                            <b>Plantel:</b>{" "}
                            {(() => {
                              const pid = plantelIdDerived ? plantelIdDerived : plantelIdManual;
                              const p = planteles.find((x) => x.id === Number(pid));
                              return p ? p.nombre : "—";
                            })()}
                          </li>
                        ) : null}
                        {trayectoriaAlumno ? (
                          <li>
                            <b>Carrera:</b> {carreraById.get(trayectoriaAlumno.carrera)?.nombre ?? "—"}
                          </li>
                        ) : null}
                        {selectedAlumno && trayectoriaAlumno ? (
                          <li>
                            <b>Estatus académico:</b>{" "}
                            {(() => {
                              const est = estatusById.get(trayectoriaAlumno.estatus_academico);
                              return est?.nombre ?? "—";
                            })()}
                          </li>
                        ) : null}
                        <li>
                          <b>Tipo de documento:</b> {tipo?.nombre ?? "—"}
                        </li>
                        <li>
                          <b>Aprobación directiva:</b> <span className="font-semibold text-uh-emerald">Sí (automática)</span>
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  {tipo?.categoria === "KARDEX" && !esTitulo && !esDiplomaReconocimiento ? (
                    <div className="rounded-2xl border border-uh-stone/15 bg-white p-4 text-sm text-uh-ink">
                      <div className="mb-2 text-xs font-semibold tracking-[0.18em] text-uh-navy">RESUMEN · KARDEX</div>
                      <ul className="list-disc space-y-1 pl-5 text-[13px]">
                        <li>
                          <b>Destinatario:</b>{" "}
                          {selectedAlumno ? fullName(selectedAlumno) : "—"}
                        </li>
                        {selectedAlumno ? (
                          <>
                            <li>
                              <b>Matrícula:</b> {selectedAlumno.matricula}
                            </li>
                            <li>
                              <b>CURP:</b> {selectedAlumno.curp}
                            </li>
                          </>
                        ) : null}
                        {plantelIdDerived || plantelIdManual ? (
                          <li>
                            <b>Plantel:</b>{" "}
                            {(() => {
                              const pid = plantelIdDerived ? plantelIdDerived : plantelIdManual;
                              const p = planteles.find((x) => x.id === Number(pid));
                              return p ? p.nombre : "—";
                            })()}
                          </li>
                        ) : null}
                        {trayectoriaAlumno ? (
                          <li>
                            <b>Carrera:</b> {carreraById.get(trayectoriaAlumno.carrera)?.nombre ?? "—"}
                          </li>
                        ) : null}
                        <li>
                          <b>Tipo de kardex:</b> {tipo?.nombre ?? "—"}
                        </li>
                        <li>
                          <b>Aprobación directiva:</b> <span className="font-semibold text-uh-emerald">Sí (automática)</span>
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  {error ? (
                    <div className="rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red whitespace-pre-wrap">{error}</div>
                  ) : null}
                  {success ? (
                    <div className="rounded-2xl border border-uh-emerald/25 bg-uh-emerald/10 px-4 py-3 text-sm text-uh-emerald">
                      Documento emitido. Verificación pública:{" "}
                      <a className="font-semibold underline" href={`/verificar?folio=${encodeURIComponent(success.folio)}`} target="_blank" rel="noreferrer">
                        /verificar?folio={success.folio}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              
              {success ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={!pdfObjectUrl}
                    onClick={() => {
                      if (!pdfObjectUrl) return;
                      window.open(pdfObjectUrl, "_blank");
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void regenerarPdf()}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Regenerar
                  </Button>
                  <Button
                    variant="gold"
                    onClick={async () => {
                      if (!success || !token) return;
                      try {
                        const blob = await apiGetDocumentoPdfDownload(token, success.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${success.folio}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch {
                        setPreviewError("No se pudo descargar el PDF.");
                      }
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              ) : null}
            </div>
            {tipo && !tipo.plantilla && !esDiplomaReconocimiento ? (
              <div className="mt-3 rounded-2xl border border-uh-amber/30 bg-uh-amber/10 px-4 py-3 text-sm text-uh-ink">
                El tipo de documento <b>{tipo.nombre}</b> no tiene asociada una plantilla. Ajusta el campo{' '}
                <code className="rounded-md bg-white px-1.5 py-0.5 text-xs">plantilla</code> del tipo de documento a{' '}
                <code className="rounded-md bg-white px-1.5 py-0.5 text-xs">pdf/constancias/estudio.html</code> o{' '}
                <code className="rounded-md bg-white px-1.5 py-0.5 text-xs">pdf/kardex/kardex.html</code>.
              </div>
            ) : null}
            {previewError ? (
              <div className="mt-3 rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">
                {previewError}
              </div>
            ) : null}
            {loading || loadingPdf ? (
              <div className="mt-4 text-center text-sm text-uh-stone/80">
                {loading ? "Emitiendo documento…" : ""}
                {loading && loadingPdf ? " · " : ""}
                {loadingPdf ? "Generando PDF oficial con estilos institucionales…" : ""}
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-center rounded-[24px] border border-uh-stone/15 bg-uh-paper/70 p-4">
              {pdfObjectUrl ? (
                <div className="w-full overflow-hidden rounded-[28px] border border-uh-stone/20 bg-white shadow-paper" style={{ minHeight: 820 }}>
                  <iframe
                    title="Documento PDF oficial"
                    src={pdfObjectUrl}
                    className="h-[820px] w-full"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
