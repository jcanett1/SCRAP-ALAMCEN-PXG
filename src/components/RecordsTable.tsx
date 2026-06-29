import { useState, useEffect, useCallback } from "react";
import { listScrap, type ScrapRecord } from "@/lib/supabase";
import { RefreshCw, Database, Loader2 } from "lucide-react";

interface Props {
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor";
  refreshKey: number;
}

export function RecordsTable({ table, refreshKey }: Props) {
  const [records, setRecords] = useState<ScrapRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listScrap(table, 20);
      setRecords(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Registros Recientes</h3>
          {records.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-semibold">
              {records.length}
            </span>
          )}
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-xs">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Actualizar
        </button>
      </div>

      {error && (
        <div className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {records.length === 0 && !loading ? (
        <div className="text-center py-10 text-[var(--text-muted)]">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin registros aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--surface2)] border-b border-[var(--border)]">
                {["ID","ORDEN","HORA","SERIAL","INV. ID","QTY","CÓDIGO","CELDA","SUPERVISOR","CAPTURA"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--surface2)] ${i % 2 === 0 ? "" : "bg-[var(--surface2)]/40"}`}
                >
                  <td className="px-3 py-2.5 font-mono text-[var(--text-muted)]">#{r.id}</td>
                  <td className="px-3 py-2.5 font-semibold text-[var(--text)] whitespace-nowrap">{r.num_orden}</td>
                  <td className="px-3 py-2.5 text-[var(--text-muted)] whitespace-nowrap">{r.hora}</td>
                  <td className="px-3 py-2.5 font-mono text-[var(--text)]">{r.serial_number}</td>
                  <td className="px-3 py-2.5 font-mono text-[var(--primary)] whitespace-nowrap">{r.inventory_id}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] font-semibold">{r.qty}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-[var(--text)]">{r.reason_code}</td>
                  <td className="px-3 py-2.5 text-[var(--text)]">{r.celda}</td>
                  <td className="px-3 py-2.5 text-[var(--text)]">{r.supervisor}</td>
                  <td className="px-3 py-2.5 text-[var(--text-muted)]">{r.captura}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
