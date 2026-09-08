export type JwtTokenPair = { access: string; refresh: string };

export type PublicVerificationResponse = {
  folio: string;
  es_valido: boolean;
  fecha_emision: string;
  hash_documento: string;
  tipo_documento: string;
  snapshot_datos_receptor: Record<string, unknown>;
  snapshot_academico: Record<string, unknown>;
  calificaciones?: Array<{
    ciclo_numero: number | null;
    periodo_label: string;
    materia: string;
    clave: string;
    creditos: number | null;
    calificacion_ordinaria: number | null;
    extraordinario_1: number | null;
    extraordinario_2: number | null;
    calificacion_final: number | null;
    calificacion_letra: string;
  }>;
};

