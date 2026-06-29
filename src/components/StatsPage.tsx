import { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { listScrapByDate, type ScrapRecord } from "@/lib/supabase";
import {
  BarChart2, Calendar, FileSpreadsheet, FileText,
  Loader2, RefreshCw, TrendingUp, Package, AlertTriangle,
  Repeat2, User, MapPin, Zap,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Zona horaria Arizona ──────────────────────────────────────────────────────
const AZ_TZ = "America/Phoenix";
const todayAZ = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: AZ_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// ── Paletas ───────────────────────────────────────────────────────────────────
const COLORS_PROCESO   = "#2f81f7";
const COLORS_PROVEEDOR = "#f0883e";
const PIE_COLORS = ["#2f81f7","#f0883e","#3fb950","#d29922","#a371f7","#f78166","#56d364","#79c0ff","#ffa657","#ff7b72"];

// ── Helpers de cómputo ────────────────────────────────────────────────────────
function countBy(records: ScrapRecord[], key: keyof ScrapRecord) {
  const map: Record<string, number> = {};
  for (const r of records) {
    const val = String(r[key] ?? "—");
    map[val] = (map[val] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function sumQtyBy(records: ScrapRecord[], key: keyof ScrapRecord) {
  const map: Record<string, number> = {};
  for (const r of records) {
    const val = String(r[key] ?? "—");
    map[val] = (map[val] ?? 0) + (r.qty ?? 0);
  }
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Inventory IDs que aparecen más de una vez (repetidos) */
function repeatedInventory(records: ScrapRecord[]) {
  const map: Record<string, { count: number; qty: number; usuarios: Set<string>; celdas: Set<string>; codigos: Set<string> }> = {};
  for (const r of records) {
    const id = r.inventory_id ?? "—";
    if (!map[id]) map[id] = { count: 0, qty: 0, usuarios: new Set(), celdas: new Set(), codigos: new Set() };
    map[id].count++;
    map[id].qty += r.qty ?? 0;
    if (r.captura)    map[id].usuarios.add(r.captura);
    if (r.celda)      map[id].celdas.add(r.celda);
    if (r.reason_code) map[id].codigos.add(r.reason_code);
  }
  return Object.entries(map)
    .filter(([, v]) => v.count > 1)
    .map(([inv, v]) => ({
      inventory_id: inv,
      count: v.count,
      qty: v.qty,
      usuarios: Array.from(v.usuarios).join(", "),
      celdas:   Array.from(v.celdas).join(", "),
      codigos:  Array.from(v.codigos).join(", "),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Por usuario (captura): cuántos registros y cuánta QTY */
function byUsuario(records: ScrapRecord[]) {
  const map: Record<string, { count: number; qty: number; inventories: Set<string>; codigos: Set<string> }> = {};
  for (const r of records) {
    const u = r.captura ?? "—";
    if (!map[u]) map[u] = { count: 0, qty: 0, inventories: new Set(), codigos: new Set() };
    map[u].count++;
    map[u].qty += r.qty ?? 0;
    if (r.inventory_id) map[u].inventories.add(r.inventory_id);
    if (r.reason_code)  map[u].codigos.add(r.reason_code);
  }
  return Object.entries(map)
    .map(([usuario, v]) => ({
      usuario,
      count: v.count,
      qty: v.qty,
      partes_unicas: v.inventories.size,
      codigos: Array.from(v.codigos).join(", "),
    }))
    .sort((a, b) => b.qty - a.qty);
}

/** Por celda: registros, QTY y códigos más frecuentes */
function byCeldaDetalle(records: ScrapRecord[]) {
  const map: Record<string, { count: number; qty: number; codigos: Record<string, number> }> = {};
  for (const r of records) {
    const c = r.celda ?? "—";
    if (!map[c]) map[c] = { count: 0, qty: 0, codigos: {} };
    map[c].count++;
    map[c].qty += r.qty ?? 0;
    if (r.reason_code) map[c].codigos[r.reason_code] = (map[c].codigos[r.reason_code] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([celda, v]) => {
      const topCodigo = Object.entries(v.codigos).sort((a, b) => b[1] - a[1])[0];
      return {
        celda,
        count: v.count,
        qty: v.qty,
        top_codigo: topCodigo ? `${topCodigo[0]} (${topCodigo[1]}x)` : "—",
      };
    })
    .sort((a, b) => b.qty - a.qty);
}

/** Códigos con mayor impacto: QTY total + descripción + celdas afectadas */
function codigosImpacto(records: ScrapRecord[]) {
  const map: Record<string, { qty: number; count: number; descripcion: string; celdas: Set<string>; usuarios: Set<string> }> = {};
  for (const r of records) {
    const c = r.reason_code ?? "—";
    if (!map[c]) map[c] = { qty: 0, count: 0, descripcion: r.reason ?? "—", celdas: new Set(), usuarios: new Set() };
    map[c].qty   += r.qty ?? 0;
    map[c].count++;
    if (r.celda)   map[c].celdas.add(r.celda);
    if (r.captura) map[c].usuarios.add(r.captura);
    if (r.reason && map[c].descripcion === "—") map[c].descripcion = r.reason;
  }
  return Object.entries(map)
    .map(([codigo, v]) => ({
      codigo,
      qty: v.qty,
      count: v.count,
      descripcion: v.descripcion,
      celdas_afectadas: v.celdas.size,
      usuarios: Array.from(v.usuarios).join(", "),
    }))
    .sort((a, b) => b.qty - a.qty);
}

// ── Exportar Excel ────────────────────────────────────────────────────────────
function exportExcel(proceso: ScrapRecord[], proveedor: ScrapRecord[], dateFrom: string, dateTo: string) {
  const wb = XLSX.utils.book_new();
  const headers = ["ID","Orden","Fecha/Hora","Serial","Inventory ID","QTY","Código","Defecto","Descripción","Celda","Supervisor","Autorizó","Captura"];
  const toRows = (recs: ScrapRecord[]) =>
    recs.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.description, r.celda, r.supervisor, r.autorizo, r.captura]);

  const all = [...proceso, ...proveedor];

  // Hoja resumen
  const resumen = [
    ["Reporte de Scrap PXG"],
    [`Período: ${dateFrom} al ${dateTo}`],
    [],
    ["Tabla","Total Registros","Total QTY"],
    ["Proceso",   proceso.length,   proceso.reduce((s,r)=>s+(r.qty??0),0)],
    ["Proveedor", proveedor.length, proveedor.reduce((s,r)=>s+(r.qty??0),0)],
    ["TOTAL",     all.length,       all.reduce((s,r)=>s+(r.qty??0),0)],
    [],
    ["=== INVENTORY IDs REPETIDOS ==="],
    ["Inventory ID","Veces","QTY Total","Usuarios","Celdas","Códigos"],
    ...repeatedInventory(all).map(x=>[x.inventory_id, x.count, x.qty, x.usuarios, x.celdas, x.codigos]),
    [],
    ["=== SCRAP POR USUARIO ==="],
    ["Usuario","Registros","QTY Total","Partes Únicas","Códigos"],
    ...byUsuario(all).map(x=>[x.usuario, x.count, x.qty, x.partes_unicas, x.codigos]),
    [],
    ["=== SCRAP POR CELDA ==="],
    ["Celda","Registros","QTY Total","Código Top"],
    ...byCeldaDetalle(all).map(x=>[x.celda, x.count, x.qty, x.top_codigo]),
    [],
    ["=== CÓDIGOS CON MAYOR IMPACTO ==="],
    ["Código","Descripción","QTY Total","Registros","Celdas Afectadas","Usuarios"],
    ...codigosImpacto(all).map(x=>[x.codigo, x.descripcion, x.qty, x.count, x.celdas_afectadas, x.usuarios]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Análisis");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...toRows(proceso)]),   "Scrap Proceso");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...toRows(proveedor)]), "Scrap Proveedor");
  XLSX.writeFile(wb, `Scrap_PXG_${dateFrom}_${dateTo}.xlsx`);
}

// ── Exportar PDF ──────────────────────────────────────────────────────────────
function exportPDF(proceso: ScrapRecord[], proveedor: ScrapRecord[], dateFrom: string, dateTo: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const all = [...proceso, ...proveedor];

  const darkBg  = [15, 23, 42] as [number,number,number];
  const surface  = [22, 33, 62] as [number,number,number];
  const altRow   = [30, 41, 59] as [number,number,number];
  const textCol  = [230, 237, 243] as [number,number,number];
  const mutedCol = [139, 148, 158] as [number,number,number];
  const blue     = [47, 129, 247] as [number,number,number];
  const orange   = [240, 136, 62] as [number,number,number];
  const green    = [63, 185, 80]  as [number,number,number];
  const purple   = [163, 113, 247] as [number,number,number];
  const yellow   = [210, 153, 34] as [number,number,number];

  const tableStyle = {
    theme: "grid" as const,
    styles: { fontSize: 7, textColor: textCol, fillColor: surface, lineColor: [48,54,61] as [number,number,number] },
    alternateRowStyles: { fillColor: altRow },
    margin: { left: 10, right: 10 },
  };

  // ── Portada ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...darkBg); doc.rect(0, 0, 297, 210, "F");
  doc.setFillColor(...blue);   doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont("helvetica","bold");
  doc.text("PXG SCRAP SYSTEM — REPORTE DE ESTADÍSTICAS", 148.5, 14, { align: "center" });
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(...mutedCol);
  doc.text(`Período: ${dateFrom}  al  ${dateTo}   |   Generado: ${new Date().toLocaleString("es-MX")}`, 148.5, 19, { align: "center" });

  // KPIs
  const kpis = [
    { label: "Proceso",   value: proceso.length, qty: proceso.reduce((s,r)=>s+(r.qty??0),0), color: blue },
    { label: "Proveedor", value: proveedor.length,qty: proveedor.reduce((s,r)=>s+(r.qty??0),0), color: orange },
    { label: "Total",     value: all.length,      qty: all.reduce((s,r)=>s+(r.qty??0),0), color: green },
    { label: "Inv. Repetidos", value: repeatedInventory(all).length, qty: null, color: yellow },
  ];
  kpis.forEach((k, i) => {
    const x = 14 + i * 68;
    doc.setFillColor(...k.color); doc.roundedRect(x, 28, 62, 22, 2, 2, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text(k.label, x+31, 35, { align: "center" });
    doc.setFontSize(16); doc.setFont("helvetica","bold");
    doc.text(String(k.value), x+31, 44, { align: "center" });
    if (k.qty !== null) { doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.text(`QTY: ${k.qty}`, x+31, 49, { align: "center" }); }
  });

  // Inventory repetidos
  doc.setTextColor(...blue); doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text("▸ Inventory IDs Repetidos", 14, 60);
  autoTable(doc, { ...tableStyle, startY: 63,
    head: [["Inventory ID","Veces","QTY","Usuarios","Celdas","Códigos"]],
    headStyles: { fillColor: blue, textColor: [255,255,255], fontStyle: "bold" },
    body: repeatedInventory(all).slice(0,12).map(x=>[x.inventory_id, x.count, x.qty, x.usuarios, x.celdas, x.codigos]),
  });

  // ── Página 2: Por usuario y por celda ────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...darkBg); doc.rect(0, 0, 297, 210, "F");
  doc.setFillColor(...purple); doc.rect(0, 0, 297, 12, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text("ANÁLISIS POR USUARIO Y CELDA", 148.5, 8, { align: "center" });

  doc.setTextColor(...purple); doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text("▸ Scrap por Usuario (Captura)", 14, 20);
  autoTable(doc, { ...tableStyle, startY: 23,
    head: [["Usuario","Registros","QTY Total","Partes Únicas","Códigos Usados"]],
    headStyles: { fillColor: purple, textColor: [255,255,255], fontStyle: "bold" },
    body: byUsuario(all).map(x=>[x.usuario, x.count, x.qty, x.partes_unicas, x.codigos]),
  });

  const afterUser = (doc as any).lastAutoTable?.finalY ?? 80;
  doc.setTextColor(...yellow); doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text("▸ Scrap por Celda", 14, afterUser + 10);
  autoTable(doc, { ...tableStyle, startY: afterUser + 13,
    head: [["Celda","Registros","QTY Total","Código Más Frecuente"]],
    headStyles: { fillColor: yellow, textColor: [255,255,255], fontStyle: "bold" },
    body: byCeldaDetalle(all).map(x=>[x.celda, x.count, x.qty, x.top_codigo]),
  });

  // ── Página 3: Códigos con mayor impacto ──────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...darkBg); doc.rect(0, 0, 297, 210, "F");
  doc.setFillColor(...orange); doc.rect(0, 0, 297, 12, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text("CÓDIGOS CON MAYOR IMPACTO", 148.5, 8, { align: "center" });

  doc.setTextColor(...orange); doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text("▸ Ranking de Códigos por QTY Total", 14, 20);
  autoTable(doc, { ...tableStyle, startY: 23,
    head: [["#","Código","Descripción del Defecto","QTY Total","Registros","Celdas Afectadas","Usuarios"]],
    headStyles: { fillColor: orange, textColor: [255,255,255], fontStyle: "bold" },
    body: codigosImpacto(all).map((x,i)=>[i+1, x.codigo, x.descripcion, x.qty, x.count, x.celdas_afectadas, x.usuarios]),
  });

  // ── Páginas de detalle ────────────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...darkBg); doc.rect(0, 0, 297, 210, "F");
  doc.setFillColor(...blue); doc.rect(0, 0, 297, 12, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text(`SCRAP PROCESO — ${proceso.length} registros`, 148.5, 8, { align: "center" });
  autoTable(doc, { ...tableStyle, startY: 16,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor","Captura"]],
    headStyles: { fillColor: blue, textColor: [255,255,255], fontStyle: "bold" },
    body: proceso.map(r=>[r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor, r.captura]),
  });

  doc.addPage();
  doc.setFillColor(...darkBg); doc.rect(0, 0, 297, 210, "F");
  doc.setFillColor(...orange); doc.rect(0, 0, 297, 12, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text(`SCRAP PROVEEDOR — ${proveedor.length} registros`, 148.5, 8, { align: "center" });
  autoTable(doc, { ...tableStyle, startY: 16,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor","Captura"]],
    headStyles: { fillColor: orange, textColor: [255,255,255], fontStyle: "bold" },
    body: proveedor.map(r=>[r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor, r.captura]),
  });

  doc.save(`Scrap_PXG_${dateFrom}_${dateTo}.pdf`);
}

// ── Sub-componente: tabla de análisis ─────────────────────────────────────────
function AnalysisTable({ title, icon, color, headers, rows, emptyMsg }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  headers: string[];
  rows: (string | number)[][];
  emptyMsg: string;
}) {
  return (
    <div className="card border" style={{ borderColor: `${color}40` }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-sm font-bold text-[var(--text)]">{title}</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}20`, color }}>
          {rows.length} {rows.length === 1 ? "elemento" : "elementos"}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-center text-[var(--text-muted)] py-6">{emptyMsg}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: `${color}15` }} className="border-b border-[var(--border)]">
                {headers.map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`border-b border-[var(--border)] hover:bg-[var(--surface2)] transition-colors ${i % 2 !== 0 ? "bg-[var(--surface2)]/30" : ""}`}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2.5 text-[var(--text)] whitespace-nowrap">
                      {j === 0 ? (
                        <span className="font-mono font-semibold" style={{ color }}>{cell}</span>
                      ) : typeof cell === "number" ? (
                        <span className="font-semibold">{cell}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">{cell}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
      setProceso(p); setProveedor(v); setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const allRecords = [...proceso, ...proveedor];
  const totalQty   = allRecords.reduce((s, r) => s + (r.qty ?? 0), 0);

  // Datos gráficas
  const byCode      = sumQtyBy(allRecords, "reason_code").slice(0, 10);
  const bySuperv    = countBy(allRecords, "supervisor").slice(0, 8);
  const byCelda     = countBy(allRecords, "celda").slice(0, 8);
  const byInv       = sumQtyBy(allRecords, "inventory_id").slice(0, 8);
  const allCodes    = Array.from(new Set(allRecords.map(r => r.reason_code))).sort();
  const comparativo = allCodes.map(code => ({
    name: code,
    Proceso:   proceso.filter(r => r.reason_code === code).reduce((s,r) => s+(r.qty??0), 0),
    Proveedor: proveedor.filter(r => r.reason_code === code).reduce((s,r) => s+(r.qty??0), 0),
  })).filter(x => x.Proceso > 0 || x.Proveedor > 0).slice(0, 12);

  // Datos análisis detallado
  const invRepetidos   = repeatedInventory(allRecords);
  const usuarioDetalle = byUsuario(allRecords);
  const celdaDetalle   = byCeldaDetalle(allRecords);
  const codigosImp     = codigosImpacto(allRecords);

  return (
    <div className="space-y-6">

      {/* ── Selector de fechas ── */}
      <div className="card border border-[var(--border)]">
        <div className="flex flex-wrap items-end gap-4">
          {[
            { label: "Fecha Desde", val: dateFrom, set: setDateFrom },
            { label: "Fecha Hasta", val: dateTo,   set: setDateTo   },
          ].map(f => (
            <div key={f.label} className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3 h-3 inline mr-1" />{f.label}
              </label>
              <input type="date" value={f.val} max={today}
                onChange={e => f.set(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          ))}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: "#2f81f7" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Cargando..." : "Consultar"}
          </button>
          {loaded && allRecords.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <button onClick={() => exportExcel(proceso, proveedor, dateFrom, dateTo)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#3fb950]/40 text-[#3fb950] hover:bg-[#3fb950]/10 transition-all">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button onClick={() => exportPDF(proceso, proveedor, dateFrom, dateTo)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#d29922]/40 text-[#d29922] hover:bg-[#d29922]/10 transition-all">
                <FileText className="w-4 h-4" /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-4 py-3">{error}</div>
      )}

      {!loaded && !loading && (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Selecciona un rango de fechas y presiona Consultar</p>
          <p className="text-xs mt-1 opacity-60">Se mostrarán estadísticas y análisis de ambas tablas</p>
        </div>
      )}

      {loaded && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Registros Proceso",   value: proceso.length,   qty: proceso.reduce((s,r)=>s+(r.qty??0),0),   color: COLORS_PROCESO,   icon: <BarChart2 className="w-5 h-5" /> },
              { label: "Registros Proveedor", value: proveedor.length, qty: proveedor.reduce((s,r)=>s+(r.qty??0),0), color: COLORS_PROVEEDOR, icon: <Package className="w-5 h-5" /> },
              { label: "Total Registros",     value: allRecords.length, qty: totalQty,                               color: "#3fb950",         icon: <TrendingUp className="w-5 h-5" /> },
              { label: "Inv. Repetidos",      value: invRepetidos.length, qty: null,                                 color: "#d29922",         icon: <Repeat2 className="w-5 h-5" /> },
            ].map(kpi => (
              <div key={kpi.label} className="card border transition-all" style={{ borderColor: `${kpi.color}40` }}>
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
              {/* ── SECCIÓN: Análisis Detallado ── */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Análisis Detallado</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {/* 1. Inventory IDs repetidos */}
              <AnalysisTable
                title="Inventory IDs con Repeticiones"
                icon={<Repeat2 className="w-4 h-4" />}
                color="#d29922"
                headers={["Inventory ID","Veces","QTY Total","Usuarios que lo capturaron","Celdas","Códigos"]}
                rows={invRepetidos.map(x => [x.inventory_id, x.count, x.qty, x.usuarios, x.celdas, x.codigos])}
                emptyMsg="Ningún inventory ID se repite en el período seleccionado"
              />

              {/* 2. Por usuario */}
              <AnalysisTable
                title="Scrap por Usuario (Captura)"
                icon={<User className="w-4 h-4" />}
                color="#a371f7"
                headers={["Usuario","Registros","QTY Total","Partes Únicas","Códigos Usados"]}
                rows={usuarioDetalle.map(x => [x.usuario, x.count, x.qty, x.partes_unicas, x.codigos])}
                emptyMsg="Sin datos de usuario"
              />

              {/* 3. Por celda */}
              <AnalysisTable
                title="Celdas con Mayor Scrap"
                icon={<MapPin className="w-4 h-4" />}
                color="#f0883e"
                headers={["Celda","Registros","QTY Total","Código Más Frecuente"]}
                rows={celdaDetalle.map(x => [x.celda, x.count, x.qty, x.top_codigo])}
                emptyMsg="Sin datos de celda"
              />

              {/* 4. Códigos con mayor impacto */}
              <AnalysisTable
                title="Códigos con Mayor Impacto (por QTY)"
                icon={<Zap className="w-4 h-4" />}
                color="#ff7b72"
                headers={["#","Código","Descripción del Defecto","QTY Total","Registros","Celdas Afectadas","Usuarios"]}
                rows={codigosImp.map((x,i) => [i+1, x.codigo, x.descripcion, x.qty, x.count, x.celdas_afectadas, x.usuarios])}
                emptyMsg="Sin datos de códigos"
              />

              {/* ── SECCIÓN: Gráficas ── */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Gráficas</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {/* Comparativo */}
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
                      <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Legend wrapperStyle={{ color: "#8b949e", fontSize: 12 }} />
                      <Bar dataKey="Proceso"   fill={COLORS_PROCESO}   radius={[4,4,0,0]} />
                      <Bar dataKey="Proveedor" fill={COLORS_PROVEEDOR} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {byCode.length > 0 && (
                  <div className="card border border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Distribución por Código</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={byCode} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {byCode.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {bySuperv.length > 0 && (
                  <div className="card border border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Registros por Supervisor</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={bySuperv} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} />
                        <Bar dataKey="value" fill="#a371f7" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {byInv.length > 0 && (
                  <div className="card border border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Top Inventory IDs (QTY)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={byInv} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
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
