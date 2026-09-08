import { useCallback, useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { apiGetAuditoria, type AuditoriaSistema } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export default function Auditoria() {
  const token = useAuthStore((s) => s.accessToken);
  const [q, setQ] = useState("");
  const [accion, setAccion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditoriaSistema[]>([]);
  const [selected, setSelected] = useState<AuditoriaSistema | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const a = (x.accion ?? "").toLowerCase();
      const m = (x.modelo_afectado ?? "").toLowerCase();
      const ip = (x.ip_origen ?? "").toLowerCase();
      const rid = x.registro_id ? String(x.registro_id) : "";
      return a.includes(s) || m.includes(s) || ip.includes(s) || rid.includes(s) || String(x.usuario ?? "").includes(s);
    });
  }, [items, q]);

  useEffect(() => {
    setPage(1);
  }, [q, accion]);

  const safePage = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize)));
    return Math.max(1, Math.min(page, totalPages));
  }, [filtered.length, page, pageSize]);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetAuditoria(token, { accion: accion || undefined });
      setItems(res);
      setSelected(null);
    } catch {
      setError("No se pudo cargar auditoría. Verifica que el backend esté corriendo y CORS esté habilitado.");
    } finally {
      setLoading(false);
    }
  }, [accion, q, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        subtitle="Trazabilidad de operaciones. Filtra por fechas, usuario y tipo de acción."
        right={
          <div className="flex items-center gap-2">
            <Badge variant="stone">{loading ? "Cargando…" : `${filtered.length} eventos`}</Badge>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Actualizar
            </Button>
          </div>
        }
      />

      <Card>
        <div className="p-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por usuario, IP o registro…" />
            <Select value={accion} onChange={(e) => setAccion(e.target.value)}>
              <option value="">Todas las acciones</option>
              <option value="documento_emitido_creado">documento_emitido_creado</option>
              <option value="alumno_actualizado">alumno_actualizado</option>
              <option value="importacion_fixtures">importacion_fixtures</option>
            </Select>
            <Input disabled placeholder="Rango de fechas (pendiente)" />
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Aplicar
            </Button>
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
                  <th className="px-4 py-3">FECHA/HORA</th>
                  <th className="px-4 py-3">USUARIO</th>
                  <th className="px-4 py-3">ACCIÓN</th>
                  <th className="px-4 py-3">MODELO</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  paged.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-uh-stone/10 bg-white hover:bg-uh-paper/40"
                      onClick={() => setSelected(row)}
                    >
                      <td className="px-4 py-3 text-sm text-uh-stone/85">
                        {String(row.fecha_hora).replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-4 py-3 text-sm text-uh-stone/85">{row.usuario ?? "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-uh-ink">{row.accion}</td>
                      <td className="px-4 py-3 text-sm text-uh-stone/85">{row.modelo_afectado || "—"}</td>
                      <td className="px-4 py-3 text-sm text-uh-stone/85">{row.ip_origen || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-uh-stone/80">
                      {loading ? "Cargando auditoría…" : "Sin registros."}
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

          {selected ? (
            <div className="mt-4 rounded-2xl border border-uh-stone/15 bg-uh-paper/60 p-4">
              <div className="text-xs font-semibold tracking-[0.18em] text-uh-stone/70">DETALLES (JSON)</div>
              <pre className="mt-3 overflow-auto rounded-2xl border border-uh-stone/10 bg-white p-4 text-xs text-uh-ink">
                {JSON.stringify(selected.detalles_cambio ?? {}, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
