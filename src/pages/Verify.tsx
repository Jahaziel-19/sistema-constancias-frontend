import { Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { http } from "@/lib/http";
import type { PublicVerificationResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useInstitucionStore } from "@/stores/institucion";

function maskHash(hash: string) {
  const h = (hash ?? "").trim();
  if (!h) return "—";
  if (h.length <= 16) return h;
  return `${h.slice(0, 10)}…${h.slice(-10)}`;
}

function prettyJsonValue(value: unknown) {
  if (!value && value !== 0 && value !== false) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.map(prettyJsonValue).join(", ") || "—";
  return JSON.stringify(value);
}

const RECEPTOR_LABELS: Record<string, string> = {
  nombres: "Nombre(s)",
  primer_apellido: "Apellido paterno",
  segundo_apellido: "Apellido materno",
  matricula: "Matrícula",
  curp: "CURP",
};

const CONTACT_FIELDS = new Set(["correo", "telefono", "celular", "correo_electronico"]);

const ACADEMICO_LABELS: Record<string, string> = {
  carrera: "Carrera",
  plantel: "Plantel",
  periodo: "Periodo",
  periodo_nombre: "Periodo académico",
  nivel_actual: "Nivel actual",
  cuatrimestre: "Cuatrimestre",
  semestre: "Semestre",
  promedio_general: "Promedio general",
  promedio: "Promedio",
  creditos_acumulados: "Créditos acumulados",
  creditos: "Créditos",
  total_materias: "Materias cursadas",
  avance: "Avance de plan",
  avance_plan: "Avance de plan",
  estatus_academico: "Estatus académico",
  estatus: "Estatus",
  turno: "Turno",
  modalidad: "Modalidad",
  plan_vigencia: "Vigencia del plan",
  area_emisora: "Área emisora",
};

function labelize(input: string): string {
  if (RECEPTOR_LABELS[input]) return RECEPTOR_LABELS[input];
  if (ACADEMICO_LABELS[input]) return ACADEMICO_LABELS[input];
  return input
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFecha(val: unknown): string {
  if (!val || typeof val !== "string") return "—";
  const text = val.trim();
  if (!text) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [y, m, d] = text.slice(0, 10).split("-");
    return `${Number(d)}/${Number(m)}/${y}`;
  }
  return text;
}

export default function Verify() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("folio") ?? "";
  const [folio, setFolio] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didAuto = useRef(false);
  const institucion = useInstitucionStore((s) => s.nombre);

  const normalizedFolio = useMemo(() => folio.trim(), [folio]);

  const onVerify = useCallback(
    async (f: string) => {
      const value = f.trim();
      if (!value) return;

      setLoading(true);
      setError(null);
      setResult(null);
      setParams({ folio: value }, { replace: true });

      try {
        const res = await http<PublicVerificationResponse>(`/public/documentos/${encodeURIComponent(value)}/`);
        setResult(res);
      } catch {
        setError("Folio no localizado o documento no disponible para verificación.");
      } finally {
        setLoading(false);
      }
    },
    [setParams],
  );

  useEffect(() => {
    if (didAuto.current) return;
    const urlFolio = (params.get("folio") ?? "").trim();
    if (!urlFolio) return;
    didAuto.current = true;
    setFolio(urlFolio);
    void onVerify(urlFolio);
  }, [onVerify, params, loading, result]);

  const isValid = result?.es_valido === true;

  return (
    <div className="uh-paper min-h-screen">
      <div className="border-b border-uh-stone/15 bg-uh-navy">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-4">
          <div className="uh-title text-lg font-semibold text-white/95">Verificación de Documentos</div>
          <div className="text-xs font-semibold tracking-[0.18em] text-white/55">{institucion.toUpperCase()}</div>
        </div>
      </div>

      <div className="mx-auto max-w-[980px] px-4 py-10">
        <div className="rounded-[28px] border border-uh-stone/15 bg-white shadow-paper">
          <div className="px-6 py-8 sm:px-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-uh-gold/25 bg-uh-gold/10">
              <ShieldCheck className="h-6 w-6 text-uh-gold" />
            </div>
            <div className="mt-4 text-center">
              <div className="uh-title text-2xl font-semibold text-uh-ink">Validación de autenticidad</div>
              <p className="mx-auto mt-2 max-w-xl text-sm text-uh-stone/80">
                Ingrese el folio único o utilice el código QR impreso para validar la autenticidad del documento.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                placeholder="Ej: UH-2026-000123"
              />
              <Button
                className="w-full sm:w-auto"
                disabled={!normalizedFolio || loading}
                onClick={() => void onVerify(normalizedFolio)}
              >
                <Search className={cn("h-4 w-4", loading && "opacity-60")} />
                {loading ? "Verificando…" : "Verificar folio"}
              </Button>
            </div>

            <div className="mt-6">
              {result ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3",
                    isValid ? "border-uh-emerald/30 bg-uh-emerald/10" : "border-uh-red/25 bg-uh-red/5",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {isValid ? (
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-uh-emerald" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-5 w-5 text-uh-red" />
                    )}
                    <div>
                      <div className={cn("text-sm font-semibold", isValid ? "text-uh-emerald" : "text-uh-red")}>
                        {isValid
                          ? "DOCUMENTO VÁLIDO Y AUTÉNTICO EMITIDO POR LA INSTITUCIÓN"
                          : "DOCUMENTO NO VÁLIDO O REVOCADO"}
                      </div>
                      <div className="mt-1 text-xs text-uh-stone/80">
                        Esta pantalla no permite descargar el documento; solo confirma la información registrada al emitir.
                      </div>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">
                  {error}
                </div>
              ) : null}
            </div>

            {result ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4">
                  <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">DOCUMENTO</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-uh-stone/80">Folio</div>
                      <div className="font-semibold text-uh-ink">{result.folio}</div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-uh-stone/80">Tipo de documento</div>
                      <div className="font-semibold text-uh-ink">{result.tipo_documento || "—"}</div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-uh-stone/80">Fecha de emisión</div>
                      <div className="font-semibold text-uh-ink">{formatFecha(result.fecha_emision)}</div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-uh-stone/80">Estado</div>
                      <div className="font-semibold text-uh-ink">{isValid ? "Vigente" : "Revocado"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4">
                  <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">ALUMNO / TITULAR</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {Object.entries(result.snapshot_datos_receptor ?? {})
                      .filter(([k]) => !CONTACT_FIELDS.has(k))
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-4">
                          <div className="truncate text-uh-stone/80">{labelize(k)}</div>
                          <div className="truncate font-semibold text-uh-ink">{prettyJsonValue(v)}</div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4 md:col-span-2">
                  <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">INFORMACIÓN ACADÉMICA</div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(result.snapshot_academico ?? {}).slice(0, 12).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4">
                        <div className="truncate text-uh-stone/80">{labelize(k)}</div>
                        <div className="truncate font-semibold text-uh-ink">{prettyJsonValue(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {result.calificaciones && result.calificaciones.length > 0 ? (
                  <div className="rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4 md:col-span-2">
                    <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">CALIFICACIONES</div>
                    <div className="mt-4 space-y-2">
                      {(() => {
                        const grupos = new Map<number, Array<typeof result.calificaciones[number]>>();
                        for (const m of result.calificaciones) {
                          if (m.ciclo_numero == null) continue;
                          const arr = grupos.get(m.ciclo_numero) ?? [];
                          arr.push(m);
                          grupos.set(m.ciclo_numero, arr);
                        }
                        return Array.from(grupos.entries()).sort((a, b) => a[0] - b[0]).map(([ciclo, items]) => (
                          <details key={ciclo} className="group rounded-2xl border border-uh-stone/15 bg-white">
                            <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 py-3 select-none">
                              <span className="text-xs font-semibold tracking-[0.18em] text-uh-navy">{ciclo}° CICLO</span>
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
                                    <tr key={`${ciclo}-${m.clave}`} className="border-t border-uh-stone/10 bg-white">
                                      <td className="px-3 py-2 font-mono text-uh-ink/80">{m.clave}</td>
                                      <td className="px-3 py-2 text-uh-ink">{m.materia}</td>
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
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-10 grid gap-6 border-t border-uh-stone/15 pt-6 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-ink">FIRMA DIGITAL</div>
                <div className="mt-1 text-sm text-uh-stone/80">Validación mediante protocolos institucionales.</div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-ink">REGISTRO PERMANENTE</div>
                <div className="mt-1 text-sm text-uh-stone/80">Acceso inmediato al historial de emisión.</div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-uh-ink">VALIDEZ LEGAL</div>
                <div className="mt-1 text-sm text-uh-stone/80">Comprobación para trámites oficiales.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-uh-stone/70">Aviso de privacidad • Términos de uso • Contacto</div>
      </div>
    </div>
  );
}
