import { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { listScrapByDate, type ScrapRecord } from "@/lib/supabase";
import {
  BarChart2, Calendar, Download, FileSpreadsheet, FileText,
  Loader2, RefreshCw, TrendingUp, Package, AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Zona horaria Arizona ──────────────────────────────────────────────────────
const AZ_TZ = "America/Phoenix";
const todayAZ = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: AZ_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// ── Colores para gráficas ─────────────────────────────────────────────────────
const COLORS_PROCESO   = "#2f81f7";
const COLORS_PROVEEDOR = "#f0883e";
const PIE_COLORS = ["#2f81f7","#f0883e","#3fb950","#d29922","#a371f7","#f78166","#56d364","#79c0ff","#ffa657","#ff7b72"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function countBy(records: ScrapRecord[], key: keyof ScrapRecord) {
  const map: Record<string, number> = {};
  for (const r of records) {
    const val = String(r[key] ?? "—");
    map[val] = (map[val] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function sumQtyBy(records: ScrapRecord[], key: keyof ScrapRecord) {
  const map: Record<string, number> = {};
  for (const r of records) {
    const val = String(r[key] ?? "—");
    map[val] = (map[val] ?? 0) + (r.qty ?? 0);
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ── Exportar Excel ────────────────────────────────────────────────────────────
function exportExcel(proceso: ScrapRecord[], proveedor: ScrapRecord[], dateFrom: string, dateTo: string) {
  const wb = XLSX.utils.book_new();
  const headers = ["ID","Orden","Fecha/Hora","Serial","Inventory ID","QTY","Código","Defecto","Descripción","Celda","Supervisor","Autorizó","Captura"];

  const toRows = (recs: ScrapRecord[]) =>
    recs.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.description, r.celda, r.supervisor, r.autorizo, r.captura]);

  const wsProceso   = XLSX.utils.aoa_to_sheet([headers, ...toRows(proceso)]);
  const wsProveedor = XLSX.utils.aoa_to_sheet([headers, ...toRows(proveedor)]);

  // Resumen
  const allRecords = [...proceso, ...proveedor];
  const resumen = [
    ["Reporte de Scrap PXG"],
    [`Período: ${dateFrom} al ${dateTo}`],
    [],
    ["Tabla", "Total Registros", "Total QTY"],
    ["Proceso",   proceso.length,   proceso.reduce((s, r) => s + (r.qty ?? 0), 0)],
    ["Proveedor", proveedor.length, proveedor.reduce((s, r) => s + (r.qty ?? 0), 0)],
    ["TOTAL",     allRecords.length, allRecords.reduce((s, r) => s + (r.qty ?? 0), 0)],
    [],
    ["Top 5 Códigos de Razón (por QTY)"],
    ...sumQtyBy(allRecords, "reason_code").slice(0, 5).map(x => [x.name, x.value]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

  XLSX.utils.book_append_sheet(wb, wsResumen,   "Resumen");
  XLSX.utils.book_append_sheet(wb, wsProceso,   "Scrap Proceso");
  XLSX.utils.book_append_sheet(wb, wsProveedor, "Scrap Proveedor");

  XLSX.writeFile(wb, `Scrap_PXG_${dateFrom}_${dateTo}.xlsx`);
}

// ── Exportar PDF ──────────────────────────────────────────────────────────────
function exportPDF(proceso: ScrapRecord[], proveedor: ScrapRecord[], dateFrom: string, dateTo: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const allRecords = [...proceso, ...proveedor];

  // Portada / resumen
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 210, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("PXG SCRAP SYSTEM", 148.5, 35, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(`Reporte de Estadísticas`, 148.5, 47, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(139, 148, 158);
  doc.text(`Período: ${dateFrom}  al  ${dateTo}`, 148.5, 57, { align: "center" });

  // Tarjetas de resumen
  const cards = [
    { label: "Total Proceso",   value: proceso.length,   qty: proceso.reduce((s,r)=>s+(r.qty??0),0),   color: [47, 129, 247] },
    { label: "Total Proveedor", value: proveedor.length, qty: proveedor.reduce((s,r)=>s+(r.qty??0),0), color: [240, 136, 62] },
    { label: "Total General",   value: allRecords.length,qty: allRecords.reduce((s,r)=>s+(r.qty??0),0),color: [63, 185, 80] },
  ];
  cards.forEach((c, i) => {
    const x = 30 + i * 80;
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.roundedRect(x, 72, 70, 32, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(c.label, x + 35, 82, { align: "center" });
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(String(c.value), x + 35, 93, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`QTY: ${c.qty}`, x + 35, 100, { align: "center" });
  });

  // Top códigos
  const topCodigos = sumQtyBy(allRecords, "reason_code").slice(0, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Top Códigos de Razón (QTY)", 148.5, 118, { align: "center" });
  autoTable(doc, {
    startY: 122,
    head: [["Código", "Defecto", "QTY"]],
    body: topCodigos.map(x => {
      const rec = allRecords.find(r => r.reason_code === x.name);
      return [x.name, rec?.reason ?? "—", x.value];
    }),
    theme: "grid",
    styles: { fontSize: 8, textColor: [255,255,255], fillColor: [22,33,62], lineColor: [48,54,61] },
    headStyles: { fillColor: [47,129,247], textColor: [255,255,255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [30,41,59] },
    margin: { left: 30, right: 30 },
  });

  // Hoja Proceso
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 210, "F");
  doc.setTextColor(47, 129, 247);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SCRAP PROCESO", 14, 16);
  doc.setTextColor(139, 148, 158);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${proceso.length} registros`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor"]],
    body: proceso.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor]),
    theme: "grid",
    styles: { fontSize: 7, textColor: [255,255,255], fillColor: [22,33,62], lineColor: [48,54,61] },
    headStyles: { fillColor: [47,129,247], textColor: [255,255,255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [30,41,59] },
    margin: { left: 10, right: 10 },
  });

  // Hoja Proveedor
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 210, "F");
  doc.setTextColor(240, 136, 62);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SCRAP PROVEEDOR", 14, 16);
  doc.setTextColor(139, 148, 158);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${proveedor.length} registros`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor"]],
    body: proveedor.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor]),
    theme: "grid",
    styles: { fontSize: 7, textColor: [255,255,255], fillColor: [22,33,62], lineColor: [48,54,61] },
    headStyles: { fillColor: [240,136,62], textColor: [255,255,255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [30,41,59] },
    margin: { left: 10, right: 10 },
  });

  doc.save(`Scrap_PXG_${dateFrom}_${dateTo}.pdf`);
}

// ── Componente principal ──────────────────────────────────────────────────────
export function StatsPage() {
  const today = todayAZ();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);
  const [proceso,   setProceso]   = useState<ScrapRecord[]>([]);
  const [proveedor, setProveedor] = useState<ScrapRecord[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true); setError(null);
    try {
      const [p, v] = await Promise.all([
        listScrapByDate("scrap_pxg_componentes_proceso",   dateFrom, dateTo),
        listScrapByDate("scrap_pxg_componentes_proveedor", dateFrom, dateTo),
      ]);
      setProceso(p);
      setProveedor(v);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const allRecords = [...proceso, ...proveedor];
  const totalQty   = allRecords.reduce((s, r) => s + (r.qty ?? 0), 0);

  // Datos para gráficas
  const byCode       = sumQtyBy(allRecords, "reason_code").slice(0, 10);
  const bySupervisor = countBy(allRecords, "supervisor").slice(0, 8);
  const byCelda      = countBy(allRecords, "celda").slice(0, 8);
  const byInventory  = sumQtyBy(allRecords, "inventory_id").slice(0, 8);

  // Comparativo proceso vs proveedor por código
  const allCodes = Array.from(new Set(allRecords.map(r => r.reason_code))).sort();
  const comparativo = allCodes.map(code => ({
    name: code,
    Proceso:   proceso.filter(r => r.reason_code === code).reduce((s,r) => s+(r.qty??0), 0),
    Proveedor: proveedor.filter(r => r.reason_code === code).reduce((s,r) => s+(r.qty??0), 0),
  })).filter(x => x.Proceso > 0 || x.Proveedor > 0).slice(0, 12);

  return (
    <div className="space-y-6">

      {/* Selector de fechas + acciones */}
      <div className="card border border-[var(--border)]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              <Calendar className="w-3 h-3 inline mr-1" />Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              max={today}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              <Calendar className="w-3 h-3 inline mr-1" />Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              max={today}
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: "#2f81f7" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Cargando..." : "Consultar"}
          </button>

          {loaded && allRecords.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => exportExcel(proceso, proveedor, dateFrom, dateTo)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#3fb950]/40 text-[#3fb950] hover:bg-[#3fb950]/10 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => exportPDF(proceso, proveedor, dateFrom, dateTo)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#d29922]/40 text-[#d29922] hover:bg-[#d29922]/10 transition-all"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!loaded && !loading && (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Selecciona un rango de fechas y presiona Consultar</p>
          <p className="text-xs mt-1 opacity-60">Se mostrarán estadísticas de ambas tablas</p>
        </div>
      )}

      {loaded && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Registros Proceso",   value: proceso.length,   qty: proceso.reduce((s,r)=>s+(r.qty??0),0),   color: COLORS_PROCESO,   icon: <BarChart2 className="w-5 h-5" /> },
              { label: "Registros Proveedor", value: proveedor.length, qty: proveedor.reduce((s,r)=>s+(r.qty??0),0), color: COLORS_PROVEEDOR, icon: <Package className="w-5 h-5" /> },
              { label: "Total Registros",     value: allRecords.length, qty: totalQty,                               color: "#3fb950",         icon: <TrendingUp className="w-5 h-5" /> },
              { label: "Códigos Únicos",      value: new Set(allRecords.map(r=>r.reason_code)).size, qty: null,      color: "#a371f7",         icon: <AlertTriangle className="w-5 h-5" /> },
            ].map(kpi => (
              <div
                key={kpi.label}
                className="card border transition-all"
                style={{ borderColor: `${kpi.color}40` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-tight">{kpi.label}</p>
                  <span style={{ color: kpi.color }}>{kpi.icon}</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                {kpi.qty !== null && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">QTY total: <span className="font-semibold" style={{ color: kpi.color }}>{kpi.qty}</span></p>
                )}
              </div>
            ))}
          </div>

          {allRecords.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] card">
              <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin registros en el período seleccionado</p>
            </div>
          ) : (
            <>
              {/* Gráfica comparativa Proceso vs Proveedor */}
              {comparativo.length > 0 && (
                <div className="card border border-[var(--border)]">
                  <h3 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[var(--primary)]" />
                    Comparativo por Código — Proceso vs Proveedor (QTY)
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={comparativo} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                      <Legend wrapperStyle={{ color: "#8b949e", fontSize: 12 }} />
                      <Bar dataKey="Proceso"   fill={COLORS_PROCESO}   radius={[4,4,0,0]} />
                      <Bar dataKey="Proveedor" fill={COLORS_PROVEEDOR} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top códigos de razón */}
                {byCode.length > 0 && (
                  <div className="card border border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Top Códigos de Razón (QTY)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={byCode} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#8b949e", fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#8b949e", fontSize: 10 }} width={32} />
                        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} />
                        <Bar dataKey="value" radius={[0,4,4,0]}>
                          {byCode.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Distribución por código (pie) */}
                {byCode.length > 0 && (
                  <div className="card border border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Distribución por Código</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={byCode} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {byCode.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Por supervisor */}
                {bySupervisor.length > 0 && (
                  <div className="card border border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Registros por Supervisor</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={bySupervisor} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} />
                        <Bar dataKey="value" fill="#a371f7" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top inventory IDs */}
                {byInventory.length > 0 && (
                  <div className="card border border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Top Inventory IDs (QTY)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={byInventory} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#8b949e", fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#8b949e", fontSize: 9 }} width={90} />
                        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} />
                        <Bar dataKey="value" fill="#56d364" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Por celda */}
              {byCelda.length > 0 && (
                <div className="card border border-[var(--border)]">
                  <h3 className="text-sm font-bold text-[var(--text)] mb-4">Registros por Celda</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={byCelda} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} />
                      <Bar dataKey="value" fill="#ffa657" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
