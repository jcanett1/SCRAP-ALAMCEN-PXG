import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Download, Loader2, RefreshCw } from "lucide-react";
import {
  listAllMaterialRequests,
  listMaterialRequests,
  type MaterialRequest,
} from "../lib/supabase";

interface Props {
  refreshKey: number;
  accentColor: string;
}

const escapeCsv = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return `"${text.split('"').join('""')}"`;
};

function downloadCsv(records: MaterialRequest[]) {
  const headers = [
    "ID",
    "Fecha",
    "Material / Part Number",
    "Descripción",
    "Cantidad",
    "Motivo",
    "Quién pide",
    "Entregó",
  ];
  const rows = records.map(record => [
    record.id,
    record.fecha,
    record.material_part_number,
    record.material_description,
    record.cantidad,
    record.motivo,
    record.quien_pide,
    record.entrego,
  ]);
  const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `requisiciones_material_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MaterialRequestsTable({ refreshKey, accentColor }: Props) {
  const [records, setRecords] = useState<MaterialRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setRecords(await listMaterialRequests(50));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, refreshKey]);

  const totalQuantity = useMemo(
    () => records.reduce((total, record) => total + Number(record.cantidad || 0), 0),
    [records]
  );

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const allRecords = await listAllMaterialRequests();
      downloadCsv(allRecords);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="card border" style={{ borderColor: "rgba(163,113,247,0.5)" }}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full" style={{ background: accentColor }} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text)]">Requisiciones recientes</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Últimas {records.length} requisiciones · {totalQuantity} piezas solicitadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRecords()}
            className="btn-ghost border border-[var(--border)]"
            title="Actualizar requisiciones"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="btn-ghost border border-[var(--border)]"
            title="Descargar todas las requisiciones en CSV"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          {error}. Verifica que hayas ejecutado el SQL de la tabla en Supabase.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-14 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando requisiciones...
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-[var(--text-muted)]">
          <Database className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Todavía no hay requisiciones registradas.</p>
          <p className="text-xs mt-1">La primera requisición aparecerá aquí después de guardarla.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="bg-[var(--surface2)] text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                <th className="px-3 py-3 text-left">ID</th>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Material / Part Number</th>
                <th className="px-3 py-3 text-left">Descripción</th>
                <th className="px-3 py-3 text-right">Cantidad</th>
                <th className="px-3 py-3 text-left">Motivo</th>
                <th className="px-3 py-3 text-left">Quién pide</th>
                <th className="px-3 py-3 text-left">Entregó</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id} className="border-t border-[var(--border)] hover:bg-[var(--surface2)]/60 transition-colors">
                  <td className="px-3 py-3 font-mono text-[var(--text-muted)]">#{record.id}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.fecha}</td>
                  <td className="px-3 py-3 font-mono font-semibold whitespace-nowrap" style={{ color: accentColor }}>{record.material_part_number}</td>
                  <td className="px-3 py-3 text-[var(--text-muted)]">{record.material_description}</td>
                  <td className="px-3 py-3 text-right font-semibold" style={{ color: accentColor }}>{record.cantidad}</td>
                  <td className="px-3 py-3 max-w-[260px] text-[var(--text)]">{record.motivo}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.quien_pide}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.entrego}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
