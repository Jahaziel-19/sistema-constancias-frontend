import { useCallback, useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { apiBulkAlumnos, apiBulkCalificaciones } from "@/lib/api";
import { normalizeHeader, parseExcelFile, type ParsedRow } from "@/lib/excel";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import * as XLSX from "xlsx";
import type { ColumnConfig } from "./columns";

type Step = 1 | 2 | 3 | 4;

type PreviewError = { row: number; field: string; message: string };
type PreviewSuggestion = { row: number; message: string };

type BulkResult = {
  created: Array<Record<string, unknown>>;
  updated: Array<Record<string, unknown>>;
  skipped: Array<{ row: number; [key: string]: unknown }>;
  errors: Array<{ row: number; [key: string]: unknown }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  entity: "alumnos" | "calificaciones";
  columns: ColumnConfig[];
  context?: {
    carreras?: Array<{ id: number; nombre: string }>;
    estatus?: Array<{ id: number; nombre: string }>;
    carreraId?: number;
    periodoAcademicoId?: number;
    materiaId?: number;
    cicloEscolar?: string;
    ciclos?: Array<{ id: number; clave: string }>;
    periodos?: Array<{ id: number; clave: string }>;
    materias?: Array<{ id: number; clave_materia: string; nombre_materia: string }>;
  };
  onUploaded?: (params: { carreraId?: number; periodoAcademicoId?: number; materiaId?: number; cicloEscolar?: string }) => void;
};

function similarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

function autoMapColumns(headers: string[], columns: ColumnConfig[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalizeHeader(h) }));

  for (const col of columns) {
    const normalizedLabel = normalizeHeader(col.label);
    const normalizedKey = normalizeHeader(col.key);
    let bestHeader = "";
    let bestScore = 0;

    for (const { original, normalized } of normalizedHeaders) {
      const score = Math.max(
        similarity(normalized, normalizedLabel),
        similarity(normalized, normalizedKey),
      );
      if (score > bestScore) {
        bestScore = score;
        bestHeader = original;
      }
    }

    if (bestScore >= 0.55 && bestHeader) {
      mapping[col.key] = bestHeader;
    }
  }

  return mapping;
}

export default function BulkUploadWizard({ open, onClose, entity, columns, context, onUploaded }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Array<Record<string, unknown>>>([]);
  const [errors, setErrors] = useState<PreviewError[]>([]);
  const [suggestions, setSuggestions] = useState<PreviewSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [fotoFiles, setFotoFiles] = useState<Map<string, string>>(new Map());

  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setPreviewRows([]);
    setErrors([]);
    setSuggestions([]);
    setLoading(false);
    setResult(null);
    setFotoFiles(new Map());
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { headers: h, rows: r } = await parseExcelFile(f);
      setFile(f);
      setHeaders(h);
      setRows(r);
      setMapping(autoMapColumns(h, columns));
      setFotoFiles(new Map());
      setStep(2);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    }
  }, [columns]);

  const handleImageFilesChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const map = new Map<string, string>();
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            resolve(result);
          } else {
            reject(new Error("No se pudo leer la imagen."));
          }
        };
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.readAsDataURL(f);
      });
      map.set(f.name, b64);
    }
    setFotoFiles(map);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const headers = columns.map((c) => c.label);
    const wb = XLSX.utils.book_new();
    const wsHeaders = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, wsHeaders, "Plantilla");

    if (entity === "alumnos") {
      const exampleRows = [
        ["2025001", "Juan", "Pérez", "García", "PEGJ850101HDFRRN01", "01/01/1985", "M", "Licenciatura en Derecho Corporativo", "Activo", 8.5, 280, 9, "Sí", "No", "Calle 1", "10", "", "Centro", "73000", "Huauchinango", "Puebla", "7767620100", "7767620101", "juan.perez@example.com", "C:\\fotos_alumnos\\2025001.jpg"],
        ["2025002", "María", "López", "Martínez", "LOMM900515HDFRRN02", "15/05/1990", "F", "Licenciatura en Administración de Empresas", "Egresado", 9.0, 320, 10, "Sí", "Sí", "Calle 2", "20", "A", "San Juan", "73160", "Huauchinango", "Puebla", "", "7767620102", "maria.lopez@example.com", "C:\\fotos_alumnos\\2025002.png"],
        ["2025003", "Carlos", "Ramírez", "Hernández", "RAHC951230HDFRRN03", "30/11/1995", "M", "Ingeniería en Desarrollo y Gestión de Software", "Activo", 7.8, 210, 7, "Sí", "No", "Calle 3", "5", "B", "San Pedro", "73170", "Huauchinango", "Puebla", "7767620103", "", "carlos.ramirez@example.com", "D:\\universidad\\fotos\\2025003.jpeg"],
        ["2025004", "Ana", "González", "Díaz", "GODA880722MDFRRN04", "22/08/1988", "F", "Licenciatura en Contaduría y Finanzas", "Inactivo", 8.0, 260, 8, "No", "No", "Av. Principal", "100", "", "Centro", "73050", "Huauchinango", "Puebla", "7767620104", "7767620105", "ana.gonzalez@example.com", ""],
        ["2025005", "Luis", "Morales", "Sánchez", "MOSL940115HDFRRN05", "15/01/1994", "M", "Licenciatura en Psicología Organizacional", "Activo", 9.2, 300, 9, "Sí", "Sí", "Calle 5", "25", "", "San Juan", "73160", "Huauchinango", "Puebla", "", "7767620106", "luis.morales@example.com", ""],
        ["2025006", "Laura", "Torres", "Vargas", "TOVL920710MDFRRN06", "10/07/1992", "F", "Ingeniería en Tecnologías de la Información", "Activo", 8.7, 290, 8, "Sí", "No", "Calle 6", "12", "C", "Centro", "73000", "Huauchinango", "Puebla", "7767620107", "", "laura.torres@example.com", ""],
        ["2025007", "Pedro", "Hernández", "López", "HELP880305HDFRRN07", "05/03/1988", "M", "Licenciatura en Comercio Internacional", "Egresado", 8.9, 310, 9, "Sí", "Sí", "Calle 7", "8", "", "San Pedro", "73170", "Huauchinango", "Puebla", "", "7767620108", "pedro.hernandez@example.com", ""],
        ["2025008", "Sofía", "Martínez", "Ruiz", "MARS930425MDFRRN08", "25/04/1993", "F", "Licenciatura en Mercadotecnia Estratégica", "Activo", 9.1, 270, 8, "Sí", "No", "Calle 8", "30", "D", "San Juan", "73160", "Huauchinango", "Puebla", "7767620109", "", "sofia.martinez@example.com", ""],
        ["2025009", "Diego", "Vázquez", "Mendoza", "VAMD910112HDFRRN09", "12/01/1991", "M", "Ingeniería en Sistemas Computacionales", "Baja voluntaria", 7.5, 180, 6, "No", "No", "Calle 9", "15", "", "Centro", "73000", "Huauchinango", "Puebla", "", "", "diego.vazquez@example.com", ""],
        ["2025010", "Valeria", "Sánchez", "Ortega", "SAOV980830MDFRRN10", "30/08/1998", "F", "Psicología", "Activo", 8.3, 240, 7, "Sí", "No", "Calle 10", "22", "E", "San Pedro", "73170", "Huauchinango", "Puebla", "7767620110", "7767620111", "valeria.sanchez@example.com", ""],
      ];
      const wsExample = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
      XLSX.utils.book_append_sheet(wb, wsExample, "Ejemplo");
    } else {
      const exampleRows = [
        ["2025001", "Licenciatura en Derecho Corporativo", "2025-2026", "2025-2026-S1", "DER101", 8.5, 9.0, 0, 8.5],
        ["2025002", "Licenciatura en Administración de Empresas", "2025-2026", "2025-2026-S1", "ADM101", 7.0, 8.0, 0, 7.5],
        ["2025003", "Ingeniería en Desarrollo y Gestión de Software", "2025-2026", "2025-2026-C1", "IDS101", 9.0, 0, 0, 9.0],
        ["2025004", "Licenciatura en Contaduría y Finanzas", "2025-2026", "2025-2026-C2", "CON101", 6.5, 7.0, 8.0, 7.2],
        ["2025005", "Licenciatura en Psicología Organizacional", "2025-2026", "2025-2026-C3", "PSI101", 10, 0, 0, 10],
      ];
      const wsExample = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
      XLSX.utils.book_append_sheet(wb, wsExample, "Ejemplo");
    }

    const fileName = entity === "alumnos" ? "plantilla_carga_alumnos.xlsx" : "plantilla_carga_calificaciones.xlsx";
    XLSX.writeFile(wb, fileName);
  }, [columns, entity]);

  const buildPreview = useCallback(() => {
    const preview: Array<Record<string, unknown>> = [];
    const errs: PreviewError[] = [];
    const sugs: PreviewSuggestion[] = [];

    const sampleSize = Math.min(rows.length, 200);

    const carreraNameToId = new Map<string, string>();
    for (const c of context?.carreras ?? []) {
      carreraNameToId.set(c.nombre.toLowerCase().trim(), String(c.id));
    }

    const estatusNameToId = new Map<string, string>();
    for (const e of context?.estatus ?? []) {
      estatusNameToId.set(e.nombre.toLowerCase().trim(), String(e.id));
    }

    for (let i = 0; i < sampleSize; i++) {
      const sourceRow = rows[i];
      const mapped: Record<string, unknown> = { _source: sourceRow };
      const rowErrors: PreviewError[] = [];

      for (const col of columns) {
        const sourceHeader = mapping[col.key];
        const rawValue = sourceHeader ? sourceRow[sourceHeader] : undefined;
        const strValue = rawValue === undefined || rawValue === null ? "" : String(rawValue).trim();

        if (col.type === "lookup") {
          if (col.key === "carrera") {
            const found = context?.carreras?.find((c) => c.nombre.toLowerCase().trim() === strValue.toLowerCase().trim());
            mapped[col.key] = strValue;
            if (col.required && !found) {
              rowErrors.push({ row: i + 2, field: col.key, message: `Carrera no encontrada: "${strValue}"` });
            }
          } else if (col.key === "estatus_academico") {
            const found = context?.estatus?.find((e) => e.nombre.toLowerCase().trim() === strValue.toLowerCase().trim());
            mapped[col.key] = strValue;
            if (col.required && !found) {
              rowErrors.push({ row: i + 2, field: col.key, message: `Estatus no encontrado: "${strValue}"` });
            }
          } else {
            mapped[col.key] = strValue;
          }
        } else if (col.type === "number") {
          if (strValue === "") {
            mapped[col.key] = null;
          } else {
            const num = Number(strValue);
            if (Number.isNaN(num)) {
              mapped[col.key] = strValue;
              if (col.required) {
                rowErrors.push({ row: i + 2, field: col.key, message: `Valor numérico inválido: "${strValue}"` });
              }
            } else {
              mapped[col.key] = num;
            }
          }
        } else {
          mapped[col.key] = strValue;
        }

        if (col.required && strValue === "" && col.type !== "number") {
          if (!rowErrors.find((e) => e.field === col.key)) {
            rowErrors.push({ row: i + 2, field: col.key, message: `Campo requerido vacío.` });
          }
        }
      }

      if (entity === "alumnos" && mapped.foto) {
        const rawFoto = String(mapped.foto ?? "").trim();
        if (rawFoto) {
          const fileName = rawFoto.split(/[\\/]/).pop() || rawFoto;
          const base64 = fotoFiles.get(fileName);
          if (base64) {
            mapped.foto = base64;
            sugs.push({ row: i + 2, message: `Foto resuelta desde archivos cargados: ${fileName}` });
          } else if (fotoFiles.size > 0) {
            sugs.push({ row: i + 2, message: `Foto no encontrada en selección; se intentará leer la ruta local en el servidor: ${rawFoto}` });
          } else {
            sugs.push({ row: i + 2, message: `Se leerá la ruta local en el servidor: ${rawFoto}` });
          }
        }
      }

      if (entity === "alumnos") {
        const curp = String(mapped.curp ?? "").trim();
        if (curp && curp.length !== 18) {
          rowErrors.push({ row: i + 2, field: "curp", message: `CURP debe tener 18 caracteres (tiene ${curp.length}).` });
        }

        const genero = String(mapped.genero ?? "").trim().toUpperCase();
        if (genero && !["M", "F"].includes(genero)) {
          rowErrors.push({ row: i + 2, field: "genero", message: `Género inválido: "${mapped.genero}". Use M o F.` });
        }

        const fecha = String(mapped.fecha_nacimiento ?? "").trim();
        if (fecha && !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
          rowErrors.push({ row: i + 2, field: "fecha_nacimiento", message: "Formato de fecha inválido. Use dd/mm/aaaa." });
        }

        const promedio = mapped.promedio_general;
        if (promedio !== null && promedio !== undefined && promedio !== "") {
          const num = Number(promedio);
          if (Number.isNaN(num) || num < 1 || num > 10) {
            rowErrors.push({ row: i + 2, field: "promedio_general", message: "Promedio general debe estar entre 1 y 10." });
          }
        }

        const esActual = String(mapped.es_actual ?? "").trim().toLowerCase();
        if (esActual && !["si", "sí", "no", "true", "false", "1", "0"].includes(esActual)) {
          rowErrors.push({ row: i + 2, field: "es_actual", message: "Es actual debe ser Sí o No." });
        }

        const titulacion = String(mapped.titulacion_en_proceso ?? "").trim().toLowerCase();
        if (titulacion && !["si", "sí", "no", "true", "false", "1", "0"].includes(titulacion)) {
          rowErrors.push({ row: i + 2, field: "titulacion_en_proceso", message: "Titulación en proceso debe ser Sí o No." });
        }
      }

      if (entity === "calificaciones") {
        const hasAnyGrade = columns.some((c) => c.type === "number" && mapped[c.key] !== null && mapped[c.key] !== "");
        if (!hasAnyGrade && Object.keys(mapped).filter((k) => k !== "_source").length > 0) {
          sugs.push({ row: i + 2, message: "Fila sin calificaciones." });
        }
      }

      if (rowErrors.length === 0 && Object.keys(mapped).filter((k) => k !== "_source").length > 0) {
        sugs.push({ row: i + 2, message: "Listo para cargar." });
      }

      preview.push(mapped);
      errs.push(...rowErrors);
    }

    if (sampleSize < rows.length) {
      sugs.push({ row: 0, message: `Mostrando primeras ${sampleSize} de ${rows.length} filas.` });
    }

    setPreviewRows(preview);
    setErrors(errs);
    setSuggestions(sugs);
    setStep(3);
  }, [columns, context?.carreras, context?.estatus, entity, mapping, rows, fotoFiles]);

  const handleUpload = useCallback(async () => {
    setLoading(true);
    try {
      const items = previewRows.map((r) => {
        const cleaned: Record<string, unknown> = {};
        for (const col of columns) {
          if (col.key in r && r[col.key] !== undefined) {
            cleaned[col.key] = r[col.key];
          }
        }
        return cleaned;
      });

      const total = items.length;
      const batchSize = 50;
      const batches: Array<Record<string, unknown>>[] = [];
      for (let i = 0; i < total; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
      }

      const aggregated: BulkResult = { created: [], updated: [], skipped: [], errors: [] };
      for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        let data: BulkResult;
        if (entity === "alumnos") {
          data = await apiBulkAlumnos(token, batch);
        } else {
          data = await apiBulkCalificaciones(token, { items: batch });
        }

        aggregated.created.push(...data.created);
        aggregated.updated.push(...data.updated);
        aggregated.skipped.push(...(data.skipped ?? []));
        aggregated.errors.push(...data.errors);
        setProgress(Math.round(((b + 1) / batches.length) * 100));
      }

      setResult(aggregated);
      setStep(4);
      if (entity === "calificaciones") {
        onUploaded?.({});
      } else {
        onUploaded?.({});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error en la carga masiva.";
      setResult({ created: [], updated: [], skipped: [], errors: [{ row: 0, message }] });
      setStep(4);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [columns, entity, onUploaded, previewRows, token]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <Modal open={open} onClose={handleClose} title={entity === "alumnos" ? "Carga masiva de alumnos" : "Carga masiva de calificaciones"}>
      <div className="space-y-5">
        <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-uh-stone/70">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border text-sm",
                  step === s
                    ? "border-uh-gold bg-white text-uh-ink"
                    : step > s
                      ? "border-uh-gold/40 bg-uh-gold/15 text-uh-navy"
                      : "border-uh-stone/25 bg-white text-uh-stone/70",
                )}
              >
                {s}
              </div>
              <span className={step === s ? "text-uh-ink" : "text-uh-stone/70"}>
                {s === 1 ? "Archivo" : s === 2 ? "Mapeo" : s === 3 ? "Previsualizar" : "Cargar"}
              </span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-uh-ink">Plantilla de carga</div>
              <Button variant="secondary" onClick={handleDownloadTemplate}>
                Descargar plantilla
              </Button>
            </div>
            <div className="rounded-2xl border border-uh-stone/15 bg-white p-5">
              <div className="text-sm font-semibold text-uh-ink">Selecciona el archivo Excel</div>
              <div className="mt-3 text-xs text-uh-stone/80">
                Formatos admitidos: .xlsx, .xls. La primera fila debe contener los encabezados de columna.
                {entity === "calificaciones" && (
                  <> En el Excel debes incluir las columnas <span className="font-semibold text-uh-ink">carrera, ciclo_escolar, periodo_academico, materia</span> para identificar el contexto de cada registro.</>
                )}
              </div>
              <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl border border-uh-stone/15 bg-white px-4 py-2 text-sm font-semibold text-uh-ink transition hover:border-uh-gold/40">
                Elegir archivo
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </label>
              {file && (
                <div className="mt-3 text-xs text-uh-stone/80">
                  Archivo seleccionado: <span className="font-semibold text-uh-ink">{file.name}</span> (
                  {(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
            {entity === "alumnos" && headers.some((h) => h.toLowerCase() === "foto") && (
              <div className="rounded-2xl border border-uh-stone/15 bg-white p-5">
                <div className="text-sm font-semibold text-uh-ink">Fotos</div>
                <div className="mt-3 space-y-2 text-xs text-uh-stone/80">
                  <div>
                    La columna <span className="font-semibold text-uh-ink">foto</span> del Excel puede contener <span className="font-semibold text-uh-ink">rutas locales</span> (ej. <code className="bg-uh-paper px-1 rounded">C:\fotos\2025001.jpg</code>). El sistema leerá cada ruta en el servidor, copiará la imagen a <code className="bg-uh-paper px-1 rounded">media/alumnos/</code> y registrará la nueva ruta en el alumno.
                  </div>
                  <div>
                    <span className="font-semibold text-uh-ink">Alternativa:</span> si prefieres, selecciona aquí las imágenes y el sistema las emparejará por nombre de archivo con el valor de la columna foto.
                  </div>
                </div>
                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl border border-uh-stone/15 bg-white px-4 py-2 text-sm font-semibold text-uh-ink transition hover:border-uh-gold/40">
                  Seleccionar imágenes (opcional)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageFilesChange}
                  />
                </label>
                {fotoFiles.size > 0 && (
                  <div className="mt-3 text-xs text-uh-stone/80">
                    Imágenes cargadas: <span className="font-semibold text-uh-ink">{fotoFiles.size}</span>
                  </div>
                )}
              </div>
            )}
            {headers.length > 0 && (
              <div className="rounded-2xl border border-uh-stone/15 bg-white p-5">
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">COLUMNAS DETECTADAS</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {headers.map((h) => (
                    <Badge key={h} variant="stone">{h}</Badge>
                  ))}
                </div>
                <div className="mt-3 text-xs text-uh-stone/80">
                  Total de filas: <span className="font-semibold text-uh-ink">{rows.length}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-uh-stone/15 bg-white p-5">
              <div className="text-sm font-semibold text-uh-ink">Mapeo de columnas</div>
              <div className="mt-3 text-xs text-uh-stone/80">
                Relaciona las columnas del archivo con los campos del sistema. El sistema intentará detectarlo automáticamente.
              </div>
              <div className="mt-4 grid gap-3">
                {columns.map((col) => (
                  <div key={col.key} className="grid grid-cols-[1fr_1fr] items-center gap-3">
                    <div className="text-xs font-semibold tracking-[0.12em] text-uh-stone/80">
                      {col.label}
                      {col.required && <span className="ml-1 text-uh-red">*</span>}
                    </div>
                    <Select
                      value={mapping[col.key] ?? ""}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [col.key]: e.target.value }))}
                    >
                      <option value="">-- Sin asignar --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={buildPreview} disabled={!Object.keys(mapping).length}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-uh-stone/80">
                  <span>Procesando carga...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-uh-paper/80">
                  <div className="h-full rounded-full bg-uh-navy transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-uh-stone/15 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-uh-ink">Previsualización</div>
                <div className="flex items-center gap-2">
                  <Badge variant="stone">{previewRows.length} filas</Badge>
                  <Badge variant={errors.length ? "red" : "emerald"}>{errors.length} errores</Badge>
                </div>
              </div>
              <div className="mt-3 overflow-auto rounded-2xl border border-uh-stone/15">
                <table className="min-w-[640px] w-full border-collapse text-xs">
                  <thead className="bg-uh-paper/80">
                    <tr className="text-left text-[10px] font-semibold tracking-[0.18em] text-uh-stone/70">
                      {columns.map((col) => (
                        <th key={col.key} className="px-3 py-2">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 20).map((row, idx) => {
                      const rowErrors = errors.filter((e) => e.row === idx + 2);
                      return (
                        <tr key={idx} className={cn("border-t border-uh-stone/10", rowErrors.length ? "bg-uh-red/5" : "bg-white")}>
                          {columns.map((col) => {
                            const value = row[col.key];
                            const fieldErrors = rowErrors.filter((e) => e.field === col.key);
                            return (
                              <td key={col.key} className={cn("px-3 py-2", fieldErrors.length ? "text-uh-red font-semibold" : "text-uh-ink")}>
                                {value === null || value === undefined || value === "" ? "—" : String(value)}
                                {fieldErrors.length > 0 && (
                                  <div className="mt-1 text-[10px] text-uh-red">{fieldErrors[0].message}</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 20 && (
                <div className="mt-2 text-xs text-uh-stone/70">Mostrando primeras 20 filas de {previewRows.length}.</div>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="rounded-2xl border border-uh-gold/20 bg-uh-gold/5 px-4 py-3 text-xs text-uh-gold">
                <div className="font-semibold">Sugerencias</div>
                <ul className="mt-1 list-disc pl-4">
                  {suggestions.slice(0, 10).map((s, i) => (
                    <li key={i}>Fila {s.row}: {s.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button onClick={handleUpload} disabled={loading || errors.length > 0}>
                {loading ? `Cargando… ${progress}%` : "Cargar datos"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-uh-emerald/20 bg-uh-emerald/5 p-4 text-center">
                <div className="text-2xl font-semibold text-uh-emerald">{result.created.length}</div>
                <div className="text-xs text-uh-stone/80">Creados</div>
              </div>
              <div className="rounded-2xl border border-uh-navy/15 bg-uh-navy/5 p-4 text-center">
                <div className="text-2xl font-semibold text-uh-navy">{result.updated.length}</div>
                <div className="text-xs text-uh-stone/80">Actualizados</div>
              </div>
              <div className="rounded-2xl border border-uh-gold/20 bg-uh-gold/5 p-4 text-center">
                <div className="text-2xl font-semibold text-uh-gold">{result.skipped?.length ?? 0}</div>
                <div className="text-xs text-uh-stone/80">Sin cambios</div>
              </div>
              <div className="rounded-2xl border border-uh-red/20 bg-uh-red/5 p-4 text-center">
                <div className="text-2xl font-semibold text-uh-red">{result.errors.length}</div>
                <div className="text-xs text-uh-stone/80">Errores</div>
              </div>
            </div>

            {result.skipped?.length ? (
              <div className="rounded-2xl border border-uh-stone/15 bg-white p-4">
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">SIN CAMBIOS</div>
                <div className="mt-2 max-h-32 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-uh-paper/80">
                      <tr className="text-left text-[10px] font-semibold tracking-[0.18em] text-uh-stone/70">
                        <th className="px-3 py-2">FILA</th>
                        <th className="px-3 py-2">MATRÍCULA</th>
                        <th className="px-3 py-2">ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.skipped.map((row, idx) => (
                        <tr key={idx} className="border-t border-uh-stone/10">
                          <td className="px-3 py-2 font-mono text-uh-stone/70">{row.row || "—"}</td>
                          <td className="px-3 py-2 text-uh-ink">{String(row.matricula || "—")}</td>
                          <td className="px-3 py-2 text-uh-gold">Sin cambios</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {result.errors.length > 0 && (
              <div className="rounded-2xl border border-uh-red/20 bg-uh-red/5 p-4">
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-red">DETALLE DE ERRORES</div>
                <div className="mt-2 max-h-48 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-uh-red/10">
                      <tr className="text-left text-[10px] font-semibold tracking-[0.18em] text-uh-red">
                        <th className="px-3 py-2">FILA</th>
                        <th className="px-3 py-2">DETALLE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, idx) => (
                        <tr key={idx} className="border-t border-uh-red/10">
                          <td className="px-3 py-2 font-mono text-uh-red">{err.row || "—"}</td>
                          <td className="px-3 py-2 text-uh-ink">{String(err.message || err.detail || "Error desconocido")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end">
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
