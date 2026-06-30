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

/** Detalle completo por celda: cada inventory ID, veces, num_orden, código y fuente */
function byCeldaDetalleCompleto(
  proceso: ScrapRecord[],
  proveedor: ScrapRecord[]
): Record<string, { inventory_id: string; veces: number; qty: number; ordenes: string; reason_code: string; reason: string; fuente: string }[]> {
  const tagged = [
    ...proceso.map(r => ({ ...r, _src: "Proceso" as const })),
    ...proveedor.map(r => ({ ...r, _src: "Proveedor" as const })),
  ];
  const celdaMap: Record<string, typeof tagged> = {};
  for (const r of tagged) {
    const c = r.celda ?? "—";
    if (!celdaMap[c]) celdaMap[c] = [];
    celdaMap[c].push(r);
  }
  const result: Record<string, { inventory_id: string; veces: number; qty: number; ordenes: string; reason_code: string; reason: string; fuente: string }[]> = {};
  for (const [celda, recs] of Object.entries(celdaMap)) {
    // agrupar por inventory_id dentro de la celda
    const invMap: Record<string, { veces: number; qty: number; ordenes: Set<string>; codes: Set<string>; reasons: Set<string>; fuentes: Set<string> }> = {};
    for (const r of recs) {
      const id = r.inventory_id ?? "—";
      if (!invMap[id]) invMap[id] = { veces: 0, qty: 0, ordenes: new Set(), codes: new Set(), reasons: new Set(), fuentes: new Set() };
      invMap[id].veces++;
      invMap[id].qty += r.qty ?? 0;
      if (r.num_orden)   invMap[id].ordenes.add(r.num_orden);
      if (r.reason_code) invMap[id].codes.add(r.reason_code);
      if (r.reason)      invMap[id].reasons.add(r.reason);
      invMap[id].fuentes.add(r._src);
    }
    result[celda] = Object.entries(invMap)
      .map(([inv, v]) => ({
        inventory_id: inv,
        veces: v.veces,
        qty: v.qty,
        ordenes: Array.from(v.ordenes).join(", ") || "—",
        reason_code: Array.from(v.codes).join(", ") || "—",
        reason: Array.from(v.reasons).join(", ") || "—",
        fuente: Array.from(v.fuentes).join(" / "),
      }))
      .sort((a, b) => b.veces - a.veces);
  }
  return result;
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

// ── Helpers PDF internos ─────────────────────────────────────────────────────
function pdfHeader(doc: jsPDF, title: string, sub: string, color: [number,number,number]) {
  const darkBg: [number,number,number] = [13, 17, 23];
  doc.setFillColor(...darkBg); doc.rect(0, 0, 297, 210, "F");
  doc.setFillColor(...color);  doc.rect(0, 0, 297, 14, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text(title, 148.5, 9, { align: "center" });
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(200,210,220);
  doc.text(sub, 148.5, 13, { align: "center" });
}

function pdfSectionTitle(doc: jsPDF, text: string, y: number, color: [number,number,number]) {
  doc.setTextColor(...color); doc.setFontSize(8); doc.setFont("helvetica","bold");
  doc.text(`▸ ${text}`, 10, y);
}

/** Dibuja una mini barra horizontal proporcional al máximo */
function drawBarRow(doc: jsPDF, label: string, value: number, maxVal: number, y: number, color: [number,number,number], barX = 60, barW = 130) {
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(200,210,220);
  doc.text(label.slice(0,22), 10, y);
  const filled = maxVal > 0 ? Math.round((value / maxVal) * barW) : 0;
  doc.setFillColor(40,50,70); doc.roundedRect(barX, y-3.5, barW, 4, 1, 1, "F");
  if (filled > 0) { doc.setFillColor(...color); doc.roundedRect(barX, y-3.5, filled, 4, 1, 1, "F"); }
  doc.setTextColor(...color); doc.setFont("helvetica","bold");
  doc.text(String(value), barX + barW + 3, y);
}

// ── Exportar PDF ──────────────────────────────────────────────────────────────
function exportPDF(proceso: ScrapRecord[], proveedor: ScrapRecord[], dateFrom: string, dateTo: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const all = [...proceso, ...proveedor];
  const periodo = `Período: ${dateFrom} al ${dateTo}  |  Generado: ${new Date().toLocaleString("es-MX")}`;

  const darkBg: [number,number,number]  = [13, 17, 23];
  const surface: [number,number,number] = [22, 33, 50];
  const altRow: [number,number,number]  = [28, 40, 58];
  const textCol: [number,number,number] = [220, 230, 240];
  const blue:   [number,number,number]  = [47, 129, 247];
  const orange: [number,number,number]  = [240, 136, 62];
  const green:  [number,number,number]  = [63, 185, 80];
  const purple: [number,number,number]  = [163, 113, 247];
  const yellow: [number,number,number]  = [210, 153, 34];
  const red:    [number,number,number]  = [248, 81, 73];

  const tbl = (opts: Parameters<typeof autoTable>[1]) =>
    autoTable(doc, {
      theme: "grid",
      styles: { fontSize: 6.5, textColor: textCol, fillColor: surface, lineColor: [40,50,65] as [number,number,number], cellPadding: 1.8 },
      alternateRowStyles: { fillColor: altRow },
      margin: { left: 10, right: 10 },
      ...opts,
    });

  const lastY = () => (doc as any).lastAutoTable?.finalY ?? 20;

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 1 — Portada + KPIs + Resumen comparativo
  // ════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...darkBg); doc.rect(0, 0, 297, 210, "F");

  // Banner principal
  doc.setFillColor(...blue); doc.rect(0, 0, 297, 20, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont("helvetica","bold");
  doc.text("PXG SCRAP SYSTEM — REPORTE DE ESTADÍSTICAS", 148.5, 12, { align: "center" });
  doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(200,215,235);
  doc.text(periodo, 148.5, 17.5, { align: "center" });

  // KPIs (4 tarjetas en fila)
  const qtyP = proceso.reduce((s,r)=>s+(r.qty??0),0);
  const qtyV = proveedor.reduce((s,r)=>s+(r.qty??0),0);
  const kpis = [
    { label: "SCRAP PROCESO",   val: proceso.length,   sub: `QTY: ${qtyP}`,   color: blue   },
    { label: "SCRAP PROVEEDOR", val: proveedor.length, sub: `QTY: ${qtyV}`,   color: orange },
    { label: "TOTAL REGISTROS", val: all.length,       sub: `QTY: ${qtyP+qtyV}`, color: green  },
    { label: "INV. REPETIDOS",  val: repeatedInventory(all).length, sub: "partes", color: yellow },
  ];
  kpis.forEach((k, i) => {
    const x = 10 + i * 70;
    doc.setFillColor(k.color[0]*0.25+10, k.color[1]*0.25+10, k.color[2]*0.25+10);
    doc.roundedRect(x, 24, 65, 24, 2, 2, "F");
    doc.setFillColor(...k.color); doc.roundedRect(x, 24, 65, 5, 2, 2, "F"); doc.rect(x, 27, 65, 2, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(6.5); doc.setFont("helvetica","bold");
    doc.text(k.label, x+32.5, 28, { align: "center" });
    doc.setFontSize(18); doc.text(String(k.val), x+32.5, 40, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(...k.color);
    doc.text(k.sub, x+32.5, 46, { align: "center" });
  });

  // Tabla resumen comparativo por código (top 12)
  pdfSectionTitle(doc, "Comparativo por Código de Razón — Proceso vs Proveedor (QTY)", 57, blue);
  const allCodes = Array.from(new Set(all.map(r => r.reason_code))).sort();
  const compRows = allCodes
    .map(code => ({
      code,
      desc: all.find(r=>r.reason_code===code)?.reason ?? "",
      proc: proceso.filter(r=>r.reason_code===code).reduce((s,r)=>s+(r.qty??0),0),
      prov: proveedor.filter(r=>r.reason_code===code).reduce((s,r)=>s+(r.qty??0),0),
    }))
    .filter(x=>x.proc>0||x.prov>0)
    .sort((a,b)=>(b.proc+b.prov)-(a.proc+a.prov))
    .slice(0,15);

  tbl({
    startY: 60,
    head: [["Código","Descripción del Defecto","QTY Proceso","QTY Proveedor","Total QTY"]],
    headStyles: { fillColor: blue, textColor: [255,255,255], fontStyle: "bold", fontSize: 7 },
    columnStyles: { 0:{cellWidth:16,fontStyle:"bold"}, 1:{cellWidth:80}, 2:{cellWidth:28,halign:"center"}, 3:{cellWidth:28,halign:"center"}, 4:{cellWidth:22,halign:"center",fontStyle:"bold"} },
    body: compRows.map(x=>[x.code, x.desc, x.proc||"—", x.prov||"—", x.proc+x.prov]),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — Gráficas de barras (texto) + Top Inventory IDs
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pdfHeader(doc, "GRÁFICAS DE ANÁLISIS", periodo, purple);

  // Gráfica: Top códigos por QTY (barras horizontales)
  const topCodigos = sumQtyBy(all, "reason_code").slice(0,10);
  const maxCodQty  = topCodigos[0]?.value ?? 1;
  pdfSectionTitle(doc, "Top Códigos de Razón por QTY Total", 22, orange);
  topCodigos.forEach((item, i) => drawBarRow(doc, `${item.name}`, item.value, maxCodQty, 28+i*7, orange));

  // Gráfica: Por supervisor (barras)
  const topSuperv = countBy(all, "supervisor").slice(0,8);
  const maxSuperv = topSuperv[0]?.value ?? 1;
  const yS = 28 + topCodigos.length * 7 + 8;
  pdfSectionTitle(doc, "Registros por Supervisor", yS, purple);
  topSuperv.forEach((item, i) => drawBarRow(doc, item.name, item.value, maxSuperv, yS+6+i*7, purple));

  // Gráfica: Por celda
  const topCelda = countBy(all, "celda").slice(0,8);
  const maxCelda = topCelda[0]?.value ?? 1;
  const yC = yS + 6 + topSuperv.length * 7 + 8;
  pdfSectionTitle(doc, "Registros por Celda", yC, yellow);
  topCelda.forEach((item, i) => drawBarRow(doc, item.name, item.value, maxCelda, yC+6+i*7, yellow));

  // Gráfica: Top Inventory IDs por QTY
  const topInv = sumQtyBy(all, "inventory_id").slice(0,8);
  const maxInv = topInv[0]?.value ?? 1;
  const yI = yC + 6 + topCelda.length * 7 + 8;
  if (yI < 195) {
    pdfSectionTitle(doc, "Top Inventory IDs por QTY", yI, green);
    topInv.forEach((item, i) => drawBarRow(doc, item.name, item.value, maxInv, yI+6+i*7, green));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 3 — Análisis detallado: Inventory repetidos + Por usuario + Por celda
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pdfHeader(doc, "ANÁLISIS DETALLADO", periodo, yellow);

  pdfSectionTitle(doc, "Inventory IDs con Repeticiones", 20, yellow);
  tbl({
    startY: 23,
    head: [["Inventory ID","Veces","QTY Total","Usuarios","Celdas","Códigos"]],
    headStyles: { fillColor: yellow, textColor: [255,255,255], fontStyle: "bold", fontSize: 7 },
    columnStyles: { 0:{cellWidth:35}, 1:{cellWidth:14,halign:"center"}, 2:{cellWidth:18,halign:"center"}, 3:{cellWidth:45}, 4:{cellWidth:35}, 5:{cellWidth:30} },
    body: repeatedInventory(all).slice(0,15).map(x=>[x.inventory_id, x.count, x.qty, x.usuarios, x.celdas, x.codigos]),
  });

  const y3a = lastY() + 6;
  pdfSectionTitle(doc, "Scrap por Usuario (Captura)", y3a, purple);
  tbl({
    startY: y3a + 3,
    head: [["Usuario","Registros","QTY Total","Partes Únicas","Códigos Usados"]],
    headStyles: { fillColor: purple, textColor: [255,255,255], fontStyle: "bold", fontSize: 7 },
    columnStyles: { 0:{cellWidth:35}, 1:{cellWidth:20,halign:"center"}, 2:{cellWidth:20,halign:"center"}, 3:{cellWidth:25,halign:"center"}, 4:{cellWidth:80} },
    body: byUsuario(all).map(x=>[x.usuario, x.count, x.qty, x.partes_unicas, x.codigos]),
  });

  const y3b = lastY() + 6;
  if (y3b < 180) {
    pdfSectionTitle(doc, "Scrap por Celda", y3b, orange);
    tbl({
      startY: y3b + 3,
      head: [["Celda","Registros","QTY Total","Código Más Frecuente"]],
      headStyles: { fillColor: orange, textColor: [255,255,255], fontStyle: "bold", fontSize: 7 },
      columnStyles: { 0:{cellWidth:35}, 1:{cellWidth:20,halign:"center"}, 2:{cellWidth:20,halign:"center"}, 3:{cellWidth:50} },
      body: byCeldaDetalle(all).map(x=>[x.celda, x.count, x.qty, x.top_codigo]),
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 4 — Códigos con mayor impacto
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pdfHeader(doc, "CÓDIGOS CON MAYOR IMPACTO", periodo, red);

  pdfSectionTitle(doc, "Ranking de Defectos por QTY Total", 20, red);
  tbl({
    startY: 23,
    head: [["#","Código","Descripción del Defecto","QTY Total","Registros","Celdas","Usuarios"]],
    headStyles: { fillColor: red, textColor: [255,255,255], fontStyle: "bold", fontSize: 7 },
    columnStyles: { 0:{cellWidth:8,halign:"center"}, 1:{cellWidth:16,fontStyle:"bold"}, 2:{cellWidth:80}, 3:{cellWidth:20,halign:"center"}, 4:{cellWidth:20,halign:"center"}, 5:{cellWidth:18,halign:"center"}, 6:{cellWidth:50} },
    body: codigosImpacto(all).map((x,i)=>[i+1, x.codigo, x.descripcion, x.qty, x.count, x.celdas_afectadas, x.usuarios]),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 5 — Detalle Scrap Proceso
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pdfHeader(doc, `DETALLE — SCRAP PROCESO (${proceso.length} registros)`, periodo, blue);
  tbl({
    startY: 17,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor","Captura"]],
    headStyles: { fillColor: blue, textColor: [255,255,255], fontStyle: "bold", fontSize: 6.5 },
    columnStyles: { 0:{cellWidth:10,halign:"center"}, 1:{cellWidth:20}, 2:{cellWidth:24}, 3:{cellWidth:22}, 4:{cellWidth:22}, 5:{cellWidth:10,halign:"center"}, 6:{cellWidth:12}, 7:{cellWidth:45}, 8:{cellWidth:14}, 9:{cellWidth:18}, 10:{cellWidth:18} },
    body: proceso.map(r=>[r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor, r.captura]),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 6 — Detalle Scrap Proveedor
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pdfHeader(doc, `DETALLE — SCRAP PROVEEDOR (${proveedor.length} registros)`, periodo, orange);
  tbl({
    startY: 17,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor","Captura"]],
    headStyles: { fillColor: orange, textColor: [255,255,255], fontStyle: "bold", fontSize: 6.5 },
    columnStyles: { 0:{cellWidth:10,halign:"center"}, 1:{cellWidth:20}, 2:{cellWidth:24}, 3:{cellWidth:22}, 4:{cellWidth:22}, 5:{cellWidth:10,halign:"center"}, 6:{cellWidth:12}, 7:{cellWidth:45}, 8:{cellWidth:14}, 9:{cellWidth:18}, 10:{cellWidth:18} },
    body: proveedor.map(r=>[r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor, r.captura]),
  });

  // Pie de página en todas las páginas
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(10, 14, 20); doc.rect(0, 205, 297, 5, "F");
    doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(100,115,130);
    doc.text("PXG SCRAP SYSTEM — Confidencial", 10, 208.5);
    doc.text(`Página ${i} de ${totalPages}`, 287, 208.5, { align: "right" });
  }

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
  const invRepetidos        = repeatedInventory(allRecords);
  const usuarioDetalle      = byUsuario(allRecords);
  const celdaDetalle        = byCeldaDetalle(allRecords);
  const codigosImp          = codigosImpacto(allRecords);
  const celdaDetalleCompleto = byCeldaDetalleCompleto(proceso, proveedor);

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

              {/* ── Detalle completo por celda ── */}
              {Object.keys(celdaDetalleCompleto).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[var(--border)]" />
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Detalle de Inventory IDs por Celda</span>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                  {Object.entries(celdaDetalleCompleto)
                    .sort((a, b) => b[1].reduce((s,x)=>s+x.veces,0) - a[1].reduce((s,x)=>s+x.veces,0))
                    .map(([celda, items]) => (
                      <div key={celda} className="card border" style={{ borderColor: "#ffa65740" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4" style={{ color: "#ffa657" }} />
                          <h3 className="text-sm font-bold text-[var(--text)]">Celda: <span style={{ color: "#ffa657" }}>{celda}</span></h3>
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#ffa65720", color: "#ffa657" }}>
                            {items.length} {items.length === 1 ? "parte" : "partes"}
                          </span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ background: "#ffa65715" }} className="border-b border-[var(--border)]">
                                {["Inventory ID","Veces","QTY","Núm. Orden(es)","Código","Defecto","Fuente"].map(h => (
                                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#ffa657" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((row, i) => (
                                <tr key={i} className={`border-b border-[var(--border)] hover:bg-[var(--surface2)] transition-colors ${i % 2 !== 0 ? "bg-[var(--surface2)]/30" : ""}`}>
                                  <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: "#ffa657" }}>{row.inventory_id}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className="font-bold px-2 py-0.5 rounded-full text-xs" style={{ background: row.veces > 1 ? "#ffa65730" : "#30363d", color: row.veces > 1 ? "#ffa657" : "#8b949e" }}>{row.veces}</span>
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-center text-[var(--text)]">{row.qty}</td>
                                  <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono text-xs">{row.ordenes}</td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-bold px-1.5 py-0.5 rounded text-xs" style={{ background: "#2f81f720", color: "#2f81f7" }}>{row.reason_code}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-[var(--text-muted)] max-w-[200px] truncate" title={row.reason}>{row.reason}</td>
                                  <td className="px-3 py-2.5">
                                    {row.fuente.split(" / ").map(f => (
                                      <span key={f} className="inline-block mr-1 px-1.5 py-0.5 rounded text-xs font-semibold"
                                        style={{ background: f === "Proceso" ? "#2f81f720" : "#f0883e20", color: f === "Proceso" ? "#2f81f7" : "#f0883e" }}>
                                        {f}
                                      </span>
                                    ))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
