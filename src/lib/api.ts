import { http } from "@/lib/http";
import type { PublicVerificationResponse } from "@/lib/types";

export type ApiList<T> = T[];

export type Plantel = {
  id: number;
  clave_plantel: string;
  nombre: string;
  rgp?: string;
  registro_sep?: string;
  pagina_web?: string;
  domicilio?: {
    id?: number;
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    codigo_postal?: string;
    municipio?: string;
    estado?: string;
  };
  contacto?: Record<string, unknown>;
};

export type PlantelUpdatePayload = Partial<Omit<Plantel, "id" | "domicilio" | "contacto">> & {
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  codigo_postal?: string;
  municipio?: string;
  estado?: string;
};
export type Carrera = {
  id: number;
  plantel_id: number;
  nombre: string;
  acuerdo_sep: string;
  fecha_acuerdo_sep: string;
  tipo_periodo_id?: number | null;
  regimen?: string;
};
export type EstatusAcademico = { id: number; nombre: string; descripcion: string };
export type TipoDocumento = { id: number; nombre: string; descripcion: string; aplica_a: string; categoria: string; plantilla: string; reglas_validacion: unknown };
export type Autoridad = { id: number; nombres: string; apellidos: string; cargo: string; curp: string };
export type PlanEstudio = {
  id: number;
  carrera: number;
  clave_plan: string;
  version: number;
  creditos_totales: number | null;
  vigencia_inicio: string | null;
};
export type Materia = {
  id: number;
  plan_estudio: number;
  ciclo_numero: number;
  clave_materia: string;
  nombre_materia: string;
  creditos: number | null;
};

export type PeriodoAcademico = {
  id: number;
  ciclo_escolar: number;
  tipo_periodo: number;
  clave: string;
  numero: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export type CicloEscolar = {
  id: number;
  anio_inicio: number | null;
  anio_fin: number | null;
  clave: string;
};

export type InscripcionPeriodo = {
  id: number;
  trayectoria_academica: number;
  periodo_academico: number;
  numero_ciclo_escolar: number;
  ciclo_escolar: string;
  promedio_periodo: number | null;
  estatus: string;
  es_actual: boolean;
};

export type CalificacionDetalle = {
  id: number;
  inscripcion_periodo: number;
  catalogo_materia: number;
  calificacion_ordinaria: number | null;
  extraordinario_1: number | null;
  extraordinario_2: number | null;
  calificacion_final: number | null;
  calificacion_letra: string;
};

export type CalificacionMatrizRow = {
  inscripcion_periodo_id: number;
  calificacion_detalle_id: number | null;
  alumno_id: number;
  matricula: string;
  alumno_nombre: string;
  calificacion_ordinaria: number | null;
  extraordinario_1: number | null;
  extraordinario_2: number | null;
  calificacion_final: number | null;
  calificacion_letra: string;
};

export type Alumno = {
  id: number;
  matricula: string;
  nombres: string;
  primer_apellido: string;
  segundo_apellido: string;
  curp: string;
  foto?: string | null;
  nivel_actual?: string;
};

export type TrayectoriaAcademica = {
  id: number;
  alumno: number;
  carrera: number;
  estatus_academico: number;
  promedio_general: string | null;
  creditos_acumulados: string | null;
  nivel_actual: string;
  es_actual: boolean;
  titulacion_en_proceso: boolean;
};

export type DocumentoEmitido = {
  id: number;
  folio: string;
  tipo_documento: number;
  plantel: number;
  autoridad: number | null;
  alumno: number | null;
  externo: number | null;
  fecha_emision: string;
  hash_documento: string;
  snapshot_datos_receptor: Record<string, unknown>;
  snapshot_academico: Record<string, unknown>;
  html_renderizado?: string;
  es_valido: boolean;
};

export type AuditoriaSistema = {
  id: number;
  usuario: number | null;
  accion: string;
  modelo_afectado: string;
  registro_id: number | null;
  detalles_cambio: Record<string, unknown>;
  ip_origen: string | null;
  fecha_hora: string;
};

export type ConfiguracionInstitucional = {
  id: number;
  nombre_institucion: string;
  actualizado_en: string;
};

export async function apiPublicVerify(folio: string) {
  return http<PublicVerificationResponse>(`/public/documentos/${encodeURIComponent(folio)}/`);
}

export async function apiGetPlanteles(token: string) {
  return http<ApiList<Plantel>>("/planteles/", { token });
}

export async function apiUpdatePlantel(token: string, id: number, payload: PlantelUpdatePayload) {
  return http<Plantel>(`/planteles/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetCarreras(token: string) {
  return http<ApiList<Carrera>>("/carreras/", { token });
}

export async function apiUpdateCarrera(token: string, id: number, payload: Partial<Omit<Carrera, "id">>) {
  return http<Carrera>(`/carreras/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetEstatus(token: string) {
  return http<ApiList<EstatusAcademico>>("/estatus-academicos/", { token });
}

export async function apiGetAutoridades(token: string) {
  return http<ApiList<Autoridad>>("/autoridades/", { token });
}

export async function apiUpdateAutoridad(token: string, id: number, payload: Partial<Omit<Autoridad, "id">>) {
  return http<Autoridad>(`/autoridades/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetAlumnos(token: string) {
  return http<ApiList<Alumno>>("/alumnos/", { token });
}

export async function apiGetAlumnoKardex(token: string, id: number) {
  return http<{
    alumno: Alumno;
    trayectoria: {
      id: number;
      alumno: number;
      carrera: number;
      estatus_academico: number;
      promedio_general: string | null;
      creditos_acumulados: string | null;
      nivel_actual: string;
      es_actual: boolean;
    } | null;
    plan: {
      id: number;
      carrera: number;
      clave_plan: string;
      version: number;
      creditos_totales: number | null;
      vigencia_inicio: string | null;
    } | null;
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
    nivel_actual: string;
    periodo_academico: {
      id: number | null;
      tipo: string;
      nombre: string;
    } | null;
  }>(`/alumnos/${id}/kardex/`, { token });
}

export async function apiUpdateAlumno(token: string, id: number, payload: FormData) {
  return http<Alumno>(`/alumnos/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetTrayectorias(token: string) {
  return http<ApiList<TrayectoriaAcademica>>("/trayectorias/", { token });
}

export async function apiCreateTrayectoria(token: string, payload: Omit<TrayectoriaAcademica, "id">) {
  return http<TrayectoriaAcademica>("/trayectorias/", { token, method: "POST", body: payload });
}

export async function apiUpdateTrayectoria(token: string, id: number, payload: Partial<Omit<TrayectoriaAcademica, "id">>) {
  return http<TrayectoriaAcademica>(`/trayectorias/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetTiposDocumento(token: string) {
  return http<ApiList<TipoDocumento>>("/tipos-documento/", { token });
}

export async function apiUpdateTipoDocumento(token: string, id: number, payload: Partial<Omit<TipoDocumento, "id">>) {
  return http<TipoDocumento>(`/tipos-documento/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetPlanesEstudio(token: string) {
  return http<ApiList<PlanEstudio>>("/planes-estudio/", { token });
}

export async function apiUpdatePlanEstudio(token: string, id: number, payload: Partial<Omit<PlanEstudio, "id">>) {
  return http<PlanEstudio>(`/planes-estudio/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetMaterias(token: string, planEstudioId?: number) {
  const qs = planEstudioId ? `?plan_estudio_id=${encodeURIComponent(String(planEstudioId))}` : "";
  return http<ApiList<Materia>>(`/materias/${qs}`, { token });
}

export async function apiGetPeriodosAcademicos(token: string, params?: { cicloEscolarId?: number; tipoPeriodoId?: number }) {
  const sp = new URLSearchParams();
  if (params?.cicloEscolarId) sp.set("ciclo_escolar_id", String(params.cicloEscolarId));
  if (params?.tipoPeriodoId) sp.set("tipo_periodo_id", String(params.tipoPeriodoId));
  const qs = sp.toString();
  return http<ApiList<PeriodoAcademico>>(`/periodos-academicos/${qs ? `?${qs}` : ""}`, { token });
}

export async function apiGetCiclosPanel(token: string, params?: { rango?: number; anio?: number }) {
  const sp = new URLSearchParams();
  if (params?.rango) sp.set("rango", String(params.rango));
  if (params?.anio) sp.set("anio", String(params.anio));
  const qs = sp.toString();
  return http<{
    anio_actual: number;
    rango: number;
    anio_filtro: number;
    ciclos: ApiList<CicloEscolar>;
    tipos_periodo: Array<{ id: number; nombre: string }>;
    sugerencias: Array<{ anio_inicio: number; anio_fin: number; clave: string; existe: boolean }>;
    faltantes: Array<{ anio_inicio: number; anio_fin: number; clave: string }>;
    total_faltantes: number;
    mostrar_sugerencia: boolean;
    periodos_por_ciclo: Record<number, Array<{ id: number; ciclo_escolar: number; tipo_periodo: number; tipo_periodo_nombre: string; clave: string; numero: number | null; fecha_inicio: string | null; fecha_fin: string | null }>>;
  }>(`/ciclos-escolares/panel${qs ? `?${qs}` : ""}`, { token });
}

export async function apiGetTiposPeriodo(token: string) {
  return http<ApiList<{ id: number; nombre: string }>>("/tipos-periodo/", { token });
}

export async function apiGetCiclosEscolares(token: string, params?: { tipoPeriodoId?: number; anio?: number }) {
  const sp = new URLSearchParams();
  if (params?.tipoPeriodoId) sp.set("tipo_periodo_id", String(params.tipoPeriodoId));
  if (params?.anio) sp.set("anio", String(params.anio));
  const qs = sp.toString();
  return http<ApiList<CicloEscolar>>(`/ciclos-escolares/${qs ? `?${qs}` : ""}`, { token });
}

export async function apiCreateCicloEscolar(token: string, payload: { anio_inicio: number; anio_fin: number }) {
  return http<CicloEscolar>("/ciclos-escolares/", { token, method: "POST", body: payload });
}

export async function apiUpdateCicloEscolar(token: string, id: number, payload: Partial<Omit<CicloEscolar, "id">>) {
  return http<CicloEscolar>(`/ciclos-escolares/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiUpdatePeriodoAcademico(token: string, id: number, payload: Partial<Omit<PeriodoAcademico, "id">>) {
  return http<PeriodoAcademico>(`/periodos-academicos/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiDeletePeriodoAcademico(token: string, id: number) {
  return http<void>(`/periodos-academicos/${id}/`, { token, method: "DELETE" });
}

export async function apiDeleteCicloEscolar(token: string, id: number) {
  return http<void>(`/ciclos-escolares/${id}/`, { token, method: "DELETE" });
}

export async function apiGenerarCiclosAutomaticos(token: string, rango = 5) {
  return http<{ creados: Array<{ id: number; anio_inicio: number; anio_fin: number; clave: string }>; total_creados: number }>("/ciclos-escolares/generar-automaticos/", { token, method: "POST", body: { rango } });
}

export async function apiUpdateMateria(token: string, id: number, payload: Partial<Omit<Materia, "id">>) {
  return http<Materia>(`/materias/${id}/`, { token, method: "PATCH", body: payload });
}

export async function apiGetCalificacionesMatriz(
  token: string,
  params: { carreraId: number; periodoAcademicoId: number; materiaId: number; cicloEscolar?: string },
) {
  const sp = new URLSearchParams();
  sp.set("carrera_id", String(params.carreraId));
  sp.set("periodo_academico_id", String(params.periodoAcademicoId));
  sp.set("materia_id", String(params.materiaId));
  if (params.cicloEscolar) sp.set("ciclo_escolar", params.cicloEscolar);
  return http<ApiList<CalificacionMatrizRow>>(`/calificaciones-detalle/matriz/?${sp.toString()}`, { token });
}

export async function apiGetDocumentos(token: string) {
  return http<ApiList<DocumentoEmitido>>("/documentos/", { token });
}

export async function apiGetDocumentoHtml(token: string, id: number) {
  return http<string>(`/documentos/${id}/html/`, { token, expectRaw: true });
}

export async function apiGetDocumentoHtmlDownload(token: string, id: number) {
  return http<string>(`/documentos/${id}/html/download/`, { token, expectRaw: true });
}

export async function apiGetDocumentoPdf(token: string, id: number) {
  return http<Blob>(`/documentos/${id}/pdf/`, { token, expectBlob: true });
}

export async function apiGetDocumentoPdfDownload(token: string, id: number) {
  return http<Blob>(`/documentos/${id}/pdf/download/`, { token, expectBlob: true });
}

export type Permisos = {
  dashboard: boolean;
  auditoria: boolean;
  catalogos: boolean;
  emision: boolean;
  alumnos: boolean;
  calificaciones: boolean;
  registros: boolean;
  ciclos: boolean;
};

export type Modulo = keyof Permisos;

export type PerfilUsuario = {
  id: number;
  username: string;
  nombre: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_admin: boolean;
  rol: string | null;
  autoridad_id: number | null;
  autoridad_nombre: string | null;
  plantel_ids: number[];
  permisos: Permisos;
};

export async function apiGetMe(token: string) {
  return http<PerfilUsuario>("/auth/me/", { token });
}

export async function apiEmitirDocumento(
  token: string,
  payload: {
    tipo_documento_id: number;
    plantel_id: number;
    autoridad_id?: number | null;
    alumno_id?: number | null;
    externo_nombres?: string;
    externo_apellidos?: string;
    externo_correo?: string;
    externo_telefono?: string;
    aprobado_directiva?: boolean;
    descripcion_nombramiento?: string;
    institucion_otorgante?: string;
  },
) {
  return http<DocumentoEmitido>("/documentos/", { token, method: "POST", body: payload });
}

export async function apiGetAuditoria(
  token: string,
  params?: { accion?: string; modelo_afectado?: string; usuario?: string; desde?: string; hasta?: string },
) {
  const sp = new URLSearchParams();
  if (params?.accion) sp.set("accion", params.accion);
  if (params?.modelo_afectado) sp.set("modelo_afectado", params.modelo_afectado);
  if (params?.usuario) sp.set("usuario", params.usuario);
  if (params?.desde) sp.set("desde", params.desde);
  if (params?.hasta) sp.set("hasta", params.hasta);
  const qs = sp.toString();
  return http<ApiList<AuditoriaSistema>>(`/auditoria/${qs ? `?${qs}` : ""}`, { token });
}

export async function apiGetConfiguracionInstitucional(token: string) {
  return http<ConfiguracionInstitucional>("/configuracion-institucional/1/", { token });
}

export async function apiUpdateConfiguracionInstitucional(token: string, payload: { nombre_institucion: string }) {
  return http<ConfiguracionInstitucional>("/configuracion-institucional/1/", { token, method: "PATCH", body: payload });
}

export type DashboardStats = {
  alumnos_activos: number;
  documentos_mes: number;
  carreras_registradas: number;
};

export async function apiGetDashboardStats(token: string) {
  return http<DashboardStats>("/dashboard/stats/", { token });
}

export async function apiBulkAlumnos(token: string, payload: Array<Record<string, unknown>>) {
  return http<{ created: Array<Record<string, unknown>>; updated: Array<Record<string, unknown>>; skipped: Array<{ row: number; [key: string]: unknown }>; errors: Array<{ row: number; [key: string]: unknown }> }>(
    "/alumnos/bulk/",
    { token, method: "POST", body: { items: payload } },
  );
}

export async function apiBulkCalificaciones(token: string, payload: {
  items: Array<Record<string, unknown>>;
}) {
  return http<{ created: Array<Record<string, unknown>>; updated: Array<Record<string, unknown>>; skipped: Array<{ row: number; [key: string]: unknown }>; errors: Array<{ row: number; [key: string]: unknown }> }>(
    "/calificaciones-detalle/bulk/",
    { token, method: "POST", body: payload },
  );
}
