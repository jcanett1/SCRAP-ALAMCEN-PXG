import { useState, useEffect, useCallback } from "react";
import { listScrap, updateScrap, deleteScrap, toggleRevisado, type ScrapRecord } from "@/lib/supabase";
import {
  RefreshCw, Database, Loader2, FileSpreadsheet, FileText,
  Pencil, Trash2, AlertTriangle, Eye, EyeOff, X, Save,
  CheckCircle2, Lock,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Contraseñas de seguridad ─────────────────────────────────────────────────
const ADMIN_PASSWORD   = "PXGMXscrap";  // Para editar / eliminar
const UNLOCK_ESTATUS   = "PXGscrap123"; // Para desmarcar ESTATUS

// ── Catálogos ─────────────────────────────────────────────────────────────────
const SUPERVISORES  = ["OTTO", "CINTHYA", "MILAGROS", "ALAN", "DENNISE", "VIANETH"];
const AUTORIZADORES = ["OTTON", "VIANETH", "LUPITA"];
const REASON_CODES: { code: string; defecto: string }[] = [
  { code: "G1",  defecto: "ROTO (REVENTADO, TROZADO)" },
  { code: "G2",  defecto: "FLOJO (HUECO)" },
  { code: "G3",  defecto: "DEFORME" },
  { code: "G4",  defecto: "LOGO DESPINTADO (RAJADO)" },
  { code: "G5",  defecto: "LOGO INVERTIDO" },
  { code: "G6",  defecto: "DESHILADO" },
  { code: "G7",  defecto: "MAL ALINEADO" },
  { code: "G8",  defecto: "CRAQUEADO" },
  { code: "G9",  defecto: "TAPADO" },
  { code: "C1",  defecto: "DESPINTADO FRENTE" },
  { code: "C2",  defecto: "DESPINTADO DETRAS" },
  { code: "C3",  defecto: "DESPINTADO EN BENDING" },
  { code: "C4",  defecto: "DAÑADO EN BENDING" },
  { code: "C5",  defecto: "RAYADO FRENTE" },
  { code: "C6",  defecto: "RAYADO DETRAS" },
  { code: "C7",  defecto: "DAÑADO EN ADAPTER (DRIVER, WOOD, HYBRID)" },
  { code: "C8",  defecto: "DAÑADO EN FERRULE" },
  { code: "C9",  defecto: "DAÑADO EN HOSEL (IRON)" },
  { code: "C10", defecto: "DAÑADO POR RETRABAJO (QUEMADO, QUEBRADO, RAYADO, ETC)" },
  { code: "C11", defecto: "MANCHADO" },
  { code: "S1",  defecto: "MAL CORTE" },
  { code: "S2",  defecto: "MAL DESVASTE" },
  { code: "S3",  defecto: "LOGO DAÑADO" },
  { code: "S4",  defecto: "GOLPEADO" },
  { code: "S5",  defecto: "MANCHADO" },
  { code: "S6",  defecto: "MAL DIAMETRO" },
  { code: "S7",  defecto: "DAÑADO POR RETRABAJO" },
  { code: "S8",  defecto: "ETIQUETA DAÑADA" },
  { code: "S9",  defecto: "RAYADO (ESPECIFICAR)" },
  { code: "S10", defecto: "DESPINTADO" },
  { code: "S11", defecto: "POROSO" },
  { code: "S12", defecto: "QUEBRADO" },
  { code: "H1",  defecto: "DESPINTADO" },
  { code: "H2",  defecto: "RAYADO (ESPECIFICAR)" },
  { code: "H3",  defecto: "SUELTO" },
  { code: "H4",  defecto: "DESPINTADO" },
  { code: "H5",  defecto: "DAÑADO POR RETRABAJO" },
];
const CODE_MAP = Object.fromEntries(REASON_CODES.map(r => [r.code, r.defecto]));

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor";
  refreshKey: number;
  accentColor: string;
}

// ── Helpers de exportación ────────────────────────────────────────────────────
function downloadExcel(records: ScrapRecord[], tableName: string) {
  const filtered = records.filter(r => !r.revisado);
  const headers = ["ID","Orden","Fecha/Hora","Serial","Inventory ID","QTY","Código","Defecto","Descripción","Celda","Supervisor","Autorizó","Captura"];
  const rows = filtered.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.description, r.celda, r.supervisor, r.autorizo, r.captura]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [6,14,16,14,14,6,8,28,28,10,12,10,12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, tableName.replace("scrap_pxg_componentes_","").toUpperCase());
  XLSX.writeFile(wb, `${tableName}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function downloadPDF(records: ScrapRecord[], tableName: string, accentColor: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const label = tableName.includes("proceso") ? "SCRAP PROCESO" : "SCRAP PROVEEDOR";
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 210, "F");
  const rgb = accentColor === "#2f81f7" ? [47,129,247] : [240,136,62];
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(0, 0, 297, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(`PXG SCRAP SYSTEM — ${label}`, 14, 12);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleString("es-MX")} | ${records.length} registros`, 297 - 14, 12, { align: "right" });
  autoTable(doc, {
    startY: 22,
    head: [["ID","Orden","Fecha/Hora","Serial","Inv. ID","QTY","Código","Defecto","Celda","Supervisor","Autorizó","Captura","Estatus"]],
    body: records.map(r => [r.id, r.num_orden, r.hora, r.serial_number, r.inventory_id, r.qty, r.reason_code, r.reason, r.celda, r.supervisor, r.autorizo, r.captura, r.revisado ? "Revisado" : "Pendiente"]),
    theme: "grid",
    styles: { fontSize: 7, textColor: [230,237,243], fillColor: [22,33,62], lineColor: [48,54,61] },
    headStyles: { fillColor: rgb as [number,number,number], textColor: [255,255,255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [30,41,59] },
    margin: { left: 10, right: 10 },
  });
  doc.save(`${tableName}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ── Modal para desmarcar ESTATUS ─────────────────────────────────────────────
interface UnlockEstatusModalProps {
  recordId: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function UnlockEstatusModal({ recordId, onConfirm, onCancel }: UnlockEstatusModalProps) {
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");

  const handleConfirm = () => {
    if (password !== UNLOCK_ESTATUS) {
      setError("Contraseña incorrecta. Intenta de nuevo.");
      setPassword("");
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]" style={{ background: "#d2992215" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#d2992225" }}>
            <Lock className="w-5 h-5" style={{ color: "#d29922" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text)]">Desmarcar ESTATUS</p>
            <p className="text-xs text-[var(--text-muted)]">Registro <span className="font-mono font-semibold">#{recordId}</span> está marcado como revisado.</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg border px-4 py-3 text-xs text-[var(--text-muted)]" style={{ borderColor: "#d2992230", background: "#d2992208" }}>
            Para desmarcar este registro como revisado se requiere la contraseña de administrador.
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              Contraseña de administrador
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleConfirm()}
                placeholder="Ingresa la contraseña..."
                autoFocus
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2.5 pr-10 text-sm text-[var(--text)] focus:outline-none transition-colors"
                style={{ borderColor: error ? "#f85149" : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs mt-1.5" style={{ color: "#f85149" }}>{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border)]">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-all">
            Cancelar
          </button>
          <button onClick={handleConfirm}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#d29922" }}>
            Confirmar y desmarcar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de confirmación con contraseña ──────────────────────────────────────
type ActionType = "edit" | "delete";

interface PasswordModalProps {
  action: ActionType;
  record: ScrapRecord;
  accentColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function PasswordModal({ action, record, accentColor, onConfirm, onCancel }: PasswordModalProps) {
  const [password, setPassword]   = useState("");
  const [showPwd,  setShowPwd]    = useState(false);
  const [error,    setError]      = useState("");

  const isDelete = action === "delete";
  const actionColor = isDelete ? "#f85149" : accentColor;

  const handleConfirm = () => {
    if (password !== ADMIN_PASSWORD) {
      setError("Contraseña incorrecta. Intenta de nuevo.");
      setPassword("");
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]" style={{ background: `${actionColor}15` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${actionColor}25` }}>
            <AlertTriangle className="w-5 h-5" style={{ color: actionColor }} />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text)]">
              {isDelete ? "Eliminar Registro" : "Editar Registro"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Registro #{record.id} — {record.inventory_id}</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg border px-4 py-3 text-xs text-[var(--text-muted)]" style={{ borderColor: `${actionColor}30`, background: `${actionColor}08` }}>
            {isDelete
              ? "Esta acción eliminará permanentemente el registro. No se puede deshacer."
              : "Para editar este registro debes confirmar tu identidad con la contraseña de administrador."}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              Contraseña de administrador
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleConfirm()}
                placeholder="Ingresa la contraseña..."
                autoFocus
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2.5 pr-10 text-sm text-[var(--text)] focus:outline-none transition-colors"
                style={{ borderColor: error ? "#f85149" : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs mt-1.5" style={{ color: "#f85149" }}>{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border)]">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-all">
            Cancelar
          </button>
          <button onClick={handleConfirm}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: actionColor }}>
            {isDelete ? "Sí, eliminar" : "Confirmar y editar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de edición ──────────────────────────────────────────────────────────
interface EditModalProps {
  record: ScrapRecord;
  accentColor: string;
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor";
  onSaved: () => void;
  onCancel: () => void;
}

function EditModal({ record, accentColor, table, onSaved, onCancel }: EditModalProps) {
  const [form, setForm] = useState<Omit<ScrapRecord,"id">>({
    num_orden:     record.num_orden     ?? "",
    hora:          record.hora          ?? "",
    serial_number: record.serial_number ?? "",
    inventory_id:  record.inventory_id  ?? "",
    qty:           record.qty           ?? 1,
    reason_code:   record.reason_code   ?? "",
    reason:        record.reason        ?? "",
    description:   record.description   ?? "",
    celda:         record.celda         ?? "",
    supervisor:    record.supervisor    ?? "",
    autorizo:      record.autorizo      ?? "",
    captura:       record.captura       ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (field: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleCodeChange = (code: string) => {
    set("reason_code", code);
    set("reason", CODE_MAP[code] ?? "");
  };

  const handleSave = async () => {
    if (!form.num_orden || !form.inventory_id || !form.reason_code || !form.celda || !form.supervisor || !form.autorizo || !form.captura) {
      setError("Completa todos los campos obligatorios."); return;
    }
    setSaving(true); setError("");
    try {
      await updateScrap(table, record.id!, form);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] transition-colors";
  const labelCls = "block text-xs font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] shrink-0" style={{ background: `${accentColor}15` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${accentColor}25` }}>
            <Pencil className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text)]">Editar Registro #{record.id}</p>
            <p className="text-xs text-[var(--text-muted)]">{record.inventory_id} — {record.hora}</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Num Orden */}
            <div>
              <label className={labelCls}>Núm. Orden *</label>
              <input className={inputCls} value={form.num_orden} onChange={e => set("num_orden", e.target.value)} />
            </div>

            {/* Fecha/Hora */}
            <div>
              <label className={labelCls}>Fecha y Hora *</label>
              <input className={inputCls} value={form.hora} onChange={e => set("hora", e.target.value)} />
            </div>

            {/* Serial */}
            <div>
              <label className={labelCls}>Serial Number *</label>
              <input className={inputCls} value={form.serial_number} onChange={e => set("serial_number", e.target.value)} />
            </div>

            {/* Inventory ID */}
            <div>
              <label className={labelCls}>Inventory ID *</label>
              <input className={inputCls} value={form.inventory_id} onChange={e => set("inventory_id", e.target.value)} />
            </div>

            {/* QTY */}
            <div>
              <label className={labelCls}>QTY *</label>
              <input type="number" min={1} className={inputCls} value={form.qty} onChange={e => set("qty", parseInt(e.target.value) || 1)} />
            </div>

            {/* Código de Razón */}
            <div>
              <label className={labelCls}>Código de Razón *</label>
              <select className={inputCls} value={form.reason_code} onChange={e => handleCodeChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {REASON_CODES.map(r => (
                  <option key={r.code} value={r.code}>{r.code} — {r.defecto}</option>
                ))}
              </select>
            </div>

            {/* Razón / Defecto */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Razón / Defecto</label>
              <input className={`${inputCls} opacity-70`} value={form.reason} readOnly />
            </div>

            {/* Descripción */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Descripción *</label>
              <input className={inputCls} value={form.description} onChange={e => set("description", e.target.value)} />
            </div>

            {/* Celda */}
            <div>
              <label className={labelCls}>Celda *</label>
              <input className={inputCls} value={form.celda} onChange={e => set("celda", e.target.value)} />
            </div>

            {/* Supervisor */}
            <div>
              <label className={labelCls}>Supervisor *</label>
              <select className={inputCls} value={form.supervisor} onChange={e => set("supervisor", e.target.value)}>
                <option value="">Seleccionar...</option>
                {SUPERVISORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Autorizó */}
            <div>
              <label className={labelCls}>Autorizó *</label>
              <select className={inputCls} value={form.autorizo} onChange={e => set("autorizo", e.target.value)}>
                <option value="">Seleccionar...</option>
                {AUTORIZADORES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Captura */}
            <div>
              <label className={labelCls}>Captura *</label>
              <input className={inputCls} value={form.captura} onChange={e => set("captura", e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="mt-4 text-xs text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/20 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: accentColor }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function RecordsTable({ table, refreshKey, accentColor }: Props) {
  const [records, setRecords] = useState<ScrapRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Estados de modales
  const [pendingAction, setPendingAction] = useState<{ type: ActionType; record: ScrapRecord } | null>(null);
  const [editRecord,    setEditRecord]    = useState<ScrapRecord | null>(null);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [togglingId,          setTogglingId]          = useState<number | null>(null);
  const [unlockEstatusRecord, setUnlockEstatusRecord] = useState<ScrapRecord | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

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

  // Cuando el usuario confirma la contraseña
  const handlePasswordConfirmed = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "delete") {
      // Eliminar directamente
      deleteScrap(table, pendingAction.record.id!)
        .then(() => { showToast("Registro eliminado correctamente.", true); load(); })
        .catch(e => showToast(`Error: ${e.message}`, false));
      setPendingAction(null);
    } else {
      // Abrir modal de edición
      setEditRecord(pendingAction.record);
      setPendingAction(null);
    }
  };

  const handleEditSaved = () => {
    setEditRecord(null);
    showToast("Registro actualizado correctamente.", true);
    load();
  };

  // Manejar el cambio del checkbox de ESTATUS
  const handleToggleRevisado = (record: ScrapRecord) => {
    if (togglingId === record.id) return;
    if (record.revisado) {
      // Quiere desmarcar → pedir contraseña primero
      setUnlockEstatusRecord(record);
    } else {
      // Quiere marcar → directo sin contraseña
      void doToggleRevisado(record, true);
    }
  };

  const doToggleRevisado = async (record: ScrapRecord, nuevoEstado: boolean) => {
    setTogglingId(record.id!);
    try {
      await toggleRevisado(table, record.id!, nuevoEstado);
      showToast(
        nuevoEstado ? "Registro marcado como revisado." : "Registro desmarcado correctamente.",
        true
      );
      load();
    } catch (e) {
      showToast(`Error: ${(e as Error).message}`, false);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all"
          style={{ background: toast.ok ? "#238636" : "#da3633" }}
        >
          {toast.msg}
        </div>
      )}

      {/* Modal de contraseña */}
      {pendingAction && (
        <PasswordModal
          action={pendingAction.type}
          record={pendingAction.record}
          accentColor={accentColor}
          onConfirm={handlePasswordConfirmed}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {/* Modal para desmarcar ESTATUS */}
      {unlockEstatusRecord && (
        <UnlockEstatusModal
          recordId={unlockEstatusRecord.id!}
          onConfirm={() => {
            const rec = unlockEstatusRecord;
            setUnlockEstatusRecord(null);
            void doToggleRevisado(rec, false);
          }}
          onCancel={() => setUnlockEstatusRecord(null)}
        />
      )}

      {/* Modal de edición */}
      {editRecord && (
        <EditModal
          record={editRecord}
          accentColor={accentColor}
          table={table}
          onSaved={handleEditSaved}
          onCancel={() => setEditRecord(null)}
        />
      )}

      <div className="card mt-6 border" style={{ borderColor: `${accentColor}40` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Database className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="text-sm font-semibold text-[var(--text)]">Registros Recientes</h3>
            {records.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${accentColor}20`, color: accentColor }}>
                {records.length}
              </span>
            )}
            {/* Contador de revisados */}
            {records.some(r => r.revisado) && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-semibold bg-[#238636]/20 text-[#3fb950]">
                <CheckCircle2 className="w-3 h-3" />
                {records.filter(r => r.revisado).length} revisado{records.filter(r => r.revisado).length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <>
                <button onClick={() => downloadExcel(records, table)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#3fb950]/40 text-[#3fb950] hover:bg-[#3fb950]/10 transition-all">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
                <button onClick={() => downloadPDF(records, table, accentColor)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d29922]/40 text-[#d29922] hover:bg-[#d29922]/10 transition-all">
                  <FileText className="w-3.5 h-3.5" /> PDF
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
          <div className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-3 py-2 mb-3">{error}</div>
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
                  {/* Columna ESTATUS */}
                  <th className="px-3 py-2.5 text-center font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap w-24">
                    ESTATUS
                  </th>
                  {["ACCIONES","ID","ORDEN","HORA","SERIAL","INV. ID","QTY","CÓDIGO","CELDA","SUPERVISOR","CAPTURA"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const isRevisado = Boolean(r.revisado);
                  const isToggling = togglingId === r.id;

                  return (
                    <tr key={r.id}
                      className={`border-b border-[var(--border)] transition-colors ${
                        isRevisado
                          ? "bg-[#238636]/5 hover:bg-[#238636]/10"
                          : `hover:bg-[var(--surface2)] ${i % 2 === 0 ? "" : "bg-[var(--surface2)]/40"}`
                      }`}
                    >
                      {/* Celda ESTATUS con checkbox */}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {isToggling ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
                          ) : (
                            <button
                              onClick={() => handleToggleRevisado(r)}
                              title={isRevisado ? "Marcar como pendiente" : "Marcar como revisado"}
                              className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
                                ${isRevisado
                                  ? "bg-[#238636] border-[#238636] hover:bg-[#1a6b2a] hover:border-[#1a6b2a]"
                                  : "bg-transparent border-[var(--border)] hover:border-[#238636] hover:bg-[#238636]/10"
                                }
                              `}
                            >
                              {isRevisado && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )}
                          {/* Badge de estatus */}
                          {isRevisado ? (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#3fb950] leading-none">
                              <Lock className="w-2.5 h-2.5" />
                              Revisado
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-[var(--text-muted)] leading-none">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Botones de acción — deshabilitados si está revisado */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => !isRevisado && setPendingAction({ type: "edit", record: r })}
                            title={isRevisado ? "Registro bloqueado — desmarca ESTATUS para editar" : "Editar registro"}
                            disabled={isRevisado}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all ${
                              isRevisado
                                ? "opacity-30 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)] bg-transparent"
                                : "hover:opacity-90 active:scale-95"
                            }`}
                            style={!isRevisado ? { borderColor: `${accentColor}50`, color: accentColor, background: `${accentColor}12` } : undefined}
                          >
                            <Pencil className="w-3 h-3" /> Editar
                          </button>
                          <button
                            onClick={() => !isRevisado && setPendingAction({ type: "delete", record: r })}
                            title={isRevisado ? "Registro bloqueado — desmarca ESTATUS para eliminar" : "Eliminar registro"}
                            disabled={isRevisado}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all ${
                              isRevisado
                                ? "opacity-30 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)] bg-transparent"
                                : "hover:opacity-90 active:scale-95"
                            }`}
                            style={!isRevisado ? { borderColor: "#f8514950", color: "#f85149", background: "#f8514912" } : undefined}
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </td>

                      {/* Resto de columnas */}
                      <td className={`px-3 py-2.5 font-mono text-[var(--text-muted)] ${isRevisado ? "opacity-60" : ""}`}>#{r.id}</td>
                      <td className={`px-3 py-2.5 font-semibold text-[var(--text)] whitespace-nowrap ${isRevisado ? "opacity-60" : ""}`}>{r.num_orden}</td>
                      <td className={`px-3 py-2.5 text-[var(--text-muted)] whitespace-nowrap ${isRevisado ? "opacity-60" : ""}`}>{r.hora}</td>
                      <td className={`px-3 py-2.5 font-mono text-[var(--text)] ${isRevisado ? "opacity-60" : ""}`}>{r.serial_number}</td>
                      <td className={`px-3 py-2.5 font-mono whitespace-nowrap ${isRevisado ? "opacity-60" : ""}`} style={{ color: isRevisado ? undefined : accentColor }}>{r.inventory_id}</td>
                      <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                        <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: `${accentColor}20`, color: accentColor }}>{r.qty}</span>
                      </td>
                      <td className={`px-3 py-2.5 font-mono font-semibold text-[var(--text)] ${isRevisado ? "opacity-60" : ""}`}>{r.reason_code}</td>
                      <td className={`px-3 py-2.5 text-[var(--text)] ${isRevisado ? "opacity-60" : ""}`}>{r.celda}</td>
                      <td className={`px-3 py-2.5 text-[var(--text)] ${isRevisado ? "opacity-60" : ""}`}>{r.supervisor}</td>
                      <td className={`px-3 py-2.5 text-[var(--text-muted)] ${isRevisado ? "opacity-60" : ""}`}>{r.captura}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Leyenda */}
        {records.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#3fb950]" />
              Marcar ESTATUS como revisado bloquea Editar y Eliminar
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-[var(--text-muted)]" />
              Desmarca el checkbox para volver a habilitar las acciones
            </span>
          </div>
        )}
      </div>
    </>
  );
}
