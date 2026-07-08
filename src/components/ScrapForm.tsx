import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, RotateCcw, Calendar, Clock, PackageSearch } from "lucide-react";
import InventoryPickerDialog from "./InventoryPickerDialog";

// ── Zona horaria Pacífico/Arizona ─────────────────────────────────────────────
const AZ_TZ = "America/Phoenix";
const getDateAZ = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: AZ_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const getTimeAZ = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: AZ_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

// ── Catálogos ─────────────────────────────────────────────────────────────────
const SUPERVISORES  = ["OTTO", "CINTHYA", "MILAGROS", "ALAN", "DENNISE", "VIANETH"];
const AUTORIZADORES = ["OTTON", "LUPITA", "VIANETH"];

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

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  num_orden:    z.string().min(1, "Requerido"),
  hora:         z.string().min(1, "Requerido"),
  serial_number:z.string().min(1, "Requerido"),
  inventory_id: z.string().min(1, "Requerido"),
  qty:          z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 1, "Debe ser ≥ 1"),
  reason_code:  z.string().min(1, "Requerido"),
  reason:       z.string().min(1, "Requerido"),
  description:  z.string().min(1, "Requerido"),
  celda:        z.string().min(1, "Requerido"),
  supervisor:   z.string().min(1, "Requerido"),
  autorizo:     z.string().min(1, "Requerido"),
  captura:      z.string().min(1, "Requerido"),
});
export type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading: boolean;
  tableLabel: string;
  accentColor?: string;
}

const emptyValues = (): FormValues => ({
  num_orden: "", hora: `${getDateAZ()} ${getTimeAZ()}`,
  serial_number: "", inventory_id: "", qty: "",
  reason_code: "", reason: "", description: "",
  celda: "", supervisor: "", autorizo: "", captura: "",
});

// ── Componente ────────────────────────────────────────────────────────────────
export function ScrapForm({ onSubmit, isLoading, tableLabel, accentColor = "#2f81f7" }: Props) {
  const [time, setTime]         = useState(getTimeAZ());
  const [date, setDate]         = useState(getDateAZ());
  const [pickerOpen, setPicker] = useState(false);
  const [invId, setInvId]       = useState("");
  const [invDesc, setInvDesc]   = useState("");

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeAZ()), 1000);
    return () => clearInterval(t);
  }, []);

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues() });

  useEffect(() => {
    const t = setInterval(() => setValue("hora", `${date} ${getTimeAZ()}`), 1000);
    return () => clearInterval(t);
  }, [date, setValue]);

  const handleClear = () => {
    const d = getDateAZ();
    setDate(d); setInvId(""); setInvDesc("");
    reset({ ...emptyValues(), hora: `${d} ${getTimeAZ()}` });
  };

  const handleInvSelect = (id: string, desc: string) => {
    setValue("inventory_id", id, { shouldValidate: true });
    setInvId(id); setInvDesc(desc);
  };

  const onValid = async (data: FormValues) => {
    await onSubmit(data);
    handleClear();
  };

  const lbl = "field-label";
  const inp = (err: boolean) => `field-input${err ? " error" : ""}`;

  return (
    <form onSubmit={handleSubmit(onValid)} className="animate-slide-up space-y-5">

      {/* Fila 1: Orden / Fecha-Hora / Serial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Número de Orden */}
        <div>
          <label className={lbl}>Número de Orden <span className="text-[var(--primary)]">*</span></label>
          <input placeholder="Ej. ORD-2024-001" {...register("num_orden")} className={inp(!!errors.num_orden)} />
          {errors.num_orden && <p className="text-xs text-[var(--danger)] mt-1">{errors.num_orden.message}</p>}
        </div>

        {/* Fecha y Hora */}
        <div>
          <label className={lbl}>Fecha y Hora <span className="text-[var(--primary)]">*</span></label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="date"
              value={date}
              max={getDateAZ()}
              onChange={e => { setDate(e.target.value); setValue("hora", `${e.target.value} ${getTimeAZ()}`, { shouldValidate: true }); }}
              className={`${inp(!!errors.hora)} pl-8`}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <Clock className="w-3 h-3" style={{ color: accentColor }} />
            <span className="font-mono text-xs font-semibold" style={{ color: accentColor }}>{time}</span>
            <span className="text-xs text-[var(--text-muted)]">Hora Pacífico (AZ)</span>
          </div>
          <Controller name="hora" control={control} render={({ field }) => <input type="hidden" {...field} />} />
        </div>

        {/* Serial Number */}
        <div>
          <label className={lbl}>Serial Number <span className="text-[var(--primary)]">*</span></label>
          <input placeholder="Ej. SN-123456" {...register("serial_number")} className={inp(!!errors.serial_number)} />
          {errors.serial_number && <p className="text-xs text-[var(--danger)] mt-1">{errors.serial_number.message}</p>}
        </div>
      </div>

      {/* Fila 2: Inventory ID / QTY / Código de Razón */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inventory ID */}
        <div>
          <label className={lbl}>Inventory ID <span className="text-[var(--primary)]">*</span></label>
          <button
            type="button"
            onClick={() => setPicker(true)}
            className={`
              w-full h-9 px-3 rounded-md border text-sm text-left flex items-center justify-between gap-2
              bg-[var(--surface2)] transition-all duration-150
              hover:border-[var(--primary)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30
              ${errors.inventory_id ? "border-[var(--danger)]" : "border-[var(--border)]"}
            `}
          >
            <span className="truncate text-sm">
              {invId
                ? <><span className="font-mono text-[var(--primary)] text-xs mr-2">{invId}</span><span className="text-[var(--text-muted)]">{invDesc}</span></>
                : <span className="text-[var(--text-muted)]">Buscar número de parte...</span>}
            </span>
            <PackageSearch className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          </button>
          <Controller name="inventory_id" control={control} render={({ field }) => <input type="hidden" {...field} />} />
          {errors.inventory_id && <p className="text-xs text-[var(--danger)] mt-1">Selecciona un número de parte</p>}
          <InventoryPickerDialog open={pickerOpen} onClose={() => setPicker(false)} onSelect={handleInvSelect} />
        </div>

        {/* QTY */}
        <div>
          <label className={lbl}>Cantidad (QTY) <span className="text-[var(--primary)]">*</span></label>
          <input type="number" min={1} placeholder="Ej. 5" {...register("qty")} className={inp(!!errors.qty)} />
          {errors.qty && <p className="text-xs text-[var(--danger)] mt-1">{errors.qty.message}</p>}
        </div>

        {/* Código de Razón */}
        <div>
          <label className={lbl}>Código de Razón <span className="text-[var(--primary)]">*</span></label>
          <Controller
            name="reason_code"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select
                  value={field.value}
                  onChange={e => {
                    field.onChange(e.target.value);
                    setValue("reason", CODE_MAP[e.target.value] ?? "", { shouldValidate: true });
                  }}
                  className={`select-field pr-8${errors.reason_code ? " error" : ""}`}
                >
                  <option value="">Selecciona un código...</option>
                  {REASON_CODES.map(r => (
                    <option key={r.code} value={r.code}>{r.code} — {r.defecto}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          />
          {errors.reason_code && <p className="text-xs text-[var(--danger)] mt-1">{errors.reason_code.message}</p>}
        </div>
      </div>

      {/* Fila 3: Razón / Celda / Supervisor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Razón / Defecto */}
        <div>
          <label className={lbl}>Razón / Defecto <span className="text-[var(--primary)]">*</span></label>
          <input
            readOnly
            placeholder="Se llena al seleccionar el código"
            {...register("reason")}
            className={`${inp(!!errors.reason)} bg-[var(--surface)] cursor-default text-[var(--text-muted)]`}
          />
        </div>

        {/* Celda */}
        <div>
          <label className={lbl}>Celda <span className="text-[var(--primary)]">*</span></label>
          <input placeholder="Ej. C-01" {...register("celda")} className={inp(!!errors.celda)} />
          {errors.celda && <p className="text-xs text-[var(--danger)] mt-1">{errors.celda.message}</p>}
        </div>

        {/* Supervisor */}
        <div>
          <label className={lbl}>Supervisor <span className="text-[var(--primary)]">*</span></label>
          <Controller
            name="supervisor"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select value={field.value} onChange={field.onChange} className={`select-field pr-8${errors.supervisor ? " error" : ""}`}>
                  <option value="">Selecciona supervisor...</option>
                  {SUPERVISORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          />
          {errors.supervisor && <p className="text-xs text-[var(--danger)] mt-1">{errors.supervisor.message}</p>}
        </div>
      </div>

      {/* Fila 4: Autorizó / Captura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Autorizó */}
        <div>
          <label className={lbl}>Autorizó <span className="text-[var(--primary)]">*</span></label>
          <Controller
            name="autorizo"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select value={field.value} onChange={field.onChange} className={`select-field pr-8${errors.autorizo ? " error" : ""}`}>
                  <option value="">Selecciona autorizador...</option>
                  {AUTORIZADORES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          />
          {errors.autorizo && <p className="text-xs text-[var(--danger)] mt-1">{errors.autorizo.message}</p>}
        </div>

        {/* Captura */}
        <div>
          <label className={lbl}>Captura <span className="text-[var(--primary)]">*</span></label>
          <input placeholder="Nombre del operador" {...register("captura")} className={inp(!!errors.captura)} />
          {errors.captura && <p className="text-xs text-[var(--danger)] mt-1">{errors.captura.message}</p>}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className={lbl}>Descripción <span className="text-[var(--primary)]">*</span></label>
        <textarea
          rows={3}
          placeholder="Descripción detallada del scrap..."
          {...register("description")}
          className={`${inp(!!errors.description)} h-auto resize-none py-2`}
        />
        {errors.description && <p className="text-xs text-[var(--danger)] mt-1">{errors.description.message}</p>}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <button type="button" onClick={handleClear} className="btn-ghost">
          <RotateCcw className="w-4 h-4" />
          Limpiar
        </button>
        <button type="submit" disabled={isLoading} className="btn-primary" style={{ background: accentColor }}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isLoading ? "Guardando..." : `Guardar en ${tableLabel}`}
        </button>
      </div>
    </form>
  );
}
