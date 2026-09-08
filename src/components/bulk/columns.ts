export type ColumnConfig = {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "lookup";
  lookupOptions?: Array<{ value: string; label: string }>;
};

export const alumnoColumns: ColumnConfig[] = [
  { key: "matricula", label: "Matrícula", required: true, type: "string" },
  { key: "nombre", label: "Nombre", required: true, type: "string" },
  { key: "primer_apellido", label: "Primer apellido", required: true, type: "string" },
  { key: "segundo_apellido", label: "Segundo apellido", required: true, type: "string" },
  { key: "curp", label: "CURP", required: true, type: "string" },
  { key: "fecha_nacimiento", label: "Fecha nacimiento (dd/mm/aaaa)", required: false, type: "string" },
  { key: "genero", label: "Género (M/F)", required: false, type: "string" },
  { key: "carrera", label: "Carrera (descripción exacta)", required: false, type: "lookup" },
  { key: "estatus_academico", label: "Estatus académico", required: false, type: "lookup" },
  { key: "promedio_general", label: "Promedio general (1-10)", required: false, type: "number" },
  { key: "creditos_acumulados", label: "Créditos acumulados", required: false, type: "number" },
  { key: "nivel_actual", label: "Nivel actual", required: false, type: "number" },
  { key: "es_actual", label: "Es actual (Sí/No)", required: false, type: "string" },
  { key: "titulacion_en_proceso", label: "Titulación en proceso (Sí/No)", required: false, type: "string" },
  { key: "calle", label: "Calle", required: false, type: "string" },
  { key: "numero_exterior", label: "Número exterior", required: false, type: "string" },
  { key: "numero_interior", label: "Número interior", required: false, type: "string" },
  { key: "colonia", label: "Colonia", required: false, type: "string" },
  { key: "codigo_postal", label: "Código postal", required: false, type: "string" },
  { key: "municipio", label: "Municipio", required: false, type: "string" },
  { key: "estado", label: "Estado", required: false, type: "string" },
  { key: "telefono", label: "Teléfono", required: false, type: "string" },
  { key: "celular", label: "Celular", required: false, type: "string" },
  { key: "correo_electronico", label: "Correo electrónico", required: false, type: "string" },
  { key: "foto", label: "Foto (ruta o dejar vacío)", required: false, type: "string" },
];

export const calificacionColumns: ColumnConfig[] = [
  { key: "matricula", label: "Matrícula", required: true, type: "string" },
  { key: "carrera", label: "Carrera (nombre o clave)", required: true, type: "string" },
  { key: "ciclo_escolar", label: "Ciclo escolar (clave)", required: true, type: "string" },
  { key: "periodo_academico", label: "Periodo académico (clave)", required: true, type: "string" },
  { key: "materia", label: "Materia (clave o nombre)", required: true, type: "string" },
  { key: "calificacion_ordinaria", label: "Calificación ordinaria", required: false, type: "number" },
  { key: "extraordinario_1", label: "Extraordinario 1", required: false, type: "number" },
  { key: "extraordinario_2", label: "Extraordinario 2", required: false, type: "number" },
  { key: "calificacion_final", label: "Calificación final", required: false, type: "number" },
];
