import { useCallback, useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { apiGetDocumentos, apiGetTiposDocumento, type DocumentoEmitido, type TipoDocumento } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

function receptorLabel(doc: DocumentoEmitido) {
  const snap = doc.snapshot_datos_receptor ?? {};
  const nombres = typeof snap["nombres"] === "string" ? snap["nombres"] : "";
  const pa = typeof snap["primer_apellido"] === "string" ? snap["primer_apellido"] : "";
  const sa = typeof snap["segundo_apellido"] === "string" ? snap["segundo_apellido"] : "";
  const matricula = typeof snap["matricula"] === "string" ? snap["matricula"] : "";
  const base = [nombres, pa, sa].filter(Boolean).join(" ").trim();
  return base || matricula || (doc.alumno ? `Alumno #${doc.alumno}` : doc.externo ? `Externo #${doc.externo}` : `Registro #${doc.id}`);
}

export default function Registros() {
  const token = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<DocumentoEmitido[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const tipoNameById = useMemo(() => {
    const map = new Map<number, string>();
    tipos.forEach((t) => map.set(t.id, t.nombre));
    return map;
  }, [tipos]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [d, t] = await Promise.all([apiGetDocumentos(token), apiGetTiposDocumento(token)]);
      setDocs(d);
      setTipos(t);
    } catch {
      setError("No se pudo cargar el listado. Verifica que el backend esté corriendo y que tu sesión sea válida.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return docs;
    return docs.filter((d) => {
      if (d.folio.toLowerCase().includes(s)) return true;
      const receptor = receptorLabel(d).toLowerCase();
      if (receptor.includes(s)) return true;
      const tipo = (tipoNameById.get(d.tipo_documento) ?? "").toLowerCase();
      return tipo.includes(s);
    });
  }, [docs, q, tipoNameById]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const safePage = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize)));
    return Math.max(1, Math.min(page, totalPages));
  }, [filtered.length, page, pageSize]);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registros realizados"
        subtitle="Documentos emitidos por el sistema. Búsqueda por folio, tipo o receptor."
        right={
          <div className="flex items-center gap-2">
            <Badge variant="stone">{loading ? "Cargando…" : `${filtered.length} registros`}</Badge>
          </div>
        }
      />

      <Card>
        <div className="p-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar folio, tipo o receptor…" />
            <div
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold",
                "border-uh-stone/15 bg-uh-paper/60 text-uh-stone/80",
              )}
            >
              {loading ? "Sincronizando" : "Actualizado"}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-uh-red/25 bg-uh-red/5 px-4 py-3 text-sm text-uh-red">
              {error}
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-uh-stone/15">
            <table className="w-full border-collapse">
              <thead className="bg-uh-navy">
                <tr className="text-left text-xs font-semibold tracking-[0.18em] text-white/90">
                  <th className="px-4 py-3">FOLIO</th>
                  <th className="px-4 py-3">TIPO</th>
                  <th className="px-4 py-3">RECEPTOR</th>
                  <th className="px-4 py-3">EMISIÓN</th>
                  <th className="px-4 py-3">ESTATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  paged.map((d) => {
                    const isValid = d.es_valido === true;
                    return (
                      <tr key={d.id} className="border-t border-uh-stone/10 bg-white">
                        <td className="px-4 py-3 text-sm font-semibold text-uh-ink">{d.folio}</td>
                        <td className="px-4 py-3 text-sm text-uh-stone/85">
                          {tipoNameById.get(d.tipo_documento) ?? `Tipo #${d.tipo_documento}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-uh-stone/85">{receptorLabel(d)}</td>
                        <td className="px-4 py-3 text-sm text-uh-stone/85">
                          {String(d.fecha_emision).replace("T", " ").slice(0, 19)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isValid ? "emerald" : "red"}>{isValid ? "VÁLIDO" : "REVOCADO"}</Badge>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-uh-stone/80">
                      {loading ? "Cargando registros…" : "No hay documentos emitidos todavía."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
    </div>
  );
}
