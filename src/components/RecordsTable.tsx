import { useState, useEffect, useCallback } from "react";
import { listScrap, type ScrapRecord } from "@/lib/supabase";
import { RefreshCw, Database, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor";
  refreshKey: number;
  accentColor: string;
}

// ── Helpers de exportación ────────────────────────────────────────────────────
function downloadExcel(records: ScrapRecord[], tableName: string) {
  const headers = ["ID","Orden","Fecha/Hora","Serial","Inventory ID","QTY","Código","Defecto","Descripción","Celda","Supervisor","Autorizó","Captura"];
  const rows = records.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.description, r.celda, r.supervisor, r.autorizo, r.captura]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Ancho de columnas
  ws["!cols"] = [6,14,16,14,14,6,8,28,28,10,12,10,12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, tableName.replace("scrap_pxg_componentes_","").toUpperCase());
  XLSX.writeFile(wb, `${tableName}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function downloadPDF(records: ScrapRecord[], tableName: string, accentColor: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const label = tableName.includes("proceso") ? "SCRAP PROCESO" : "SCRAP PROVEEDOR";

  // Fondo oscuro
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 210, "F");

  // Encabezado
  const rgb = accentColor === "#2f81f7" ? [47,129,247] : [240,136,62];
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(0, 0, 297, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`PXG SCRAP SYSTEM — ${label}`, 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleString("es-MX")} | ${records.length} registros`, 297 - 14, 12, { align: "right" });

  autoTable(doc, {
    startY: 22,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor","Autorizó","Captura"]],
    body: records.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor, r.autorizo, r.captura]),
    theme: "grid",
    styles: { fontSize: 7, textColor: [230,237,243], fillColor: [22,33,62], lineColor: [48,54,61] },
    headStyles: { fillColor: rgb as [number,number,number], textColor: [255,255,255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [30,41,59] },
    margin: { left: 10, right: 10 },
  });

  doc.save(`${tableName}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ── Componente ────────────────────────────────────────────────────────────────
export function RecordsTable({ table, refreshKey, accentColor }: Props) {
  const [records, setRecords] = useState<ScrapRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listScrap(table, 50);
      setRecords(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="card mt-6 border" style={{ borderColor: `${accentColor}40` }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-semibold text-[var(--text)]">Registros Recientes</h3>
          {records.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${accentColor}20`, color: accentColor }}>
              {records.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <>
              <button
                onClick={() => downloadExcel(records, table)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#3fb950]/40 text-[#3fb950] hover:bg-[#3fb950]/10 transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </button>
              <button
                onClick={() => downloadPDF(records, table, accentColor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d29922]/40 text-[#d29922] hover:bg-[#d29922]/10 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
            </>
          )}
          <button onClick={load} disabled={loading} className="btn-ghost text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Actualizar
          </button>
        </div>
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
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: accentColor }}>{r.inventory_id}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: `${accentColor}20`, color: accentColor }}>{r.qty}</span>
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
