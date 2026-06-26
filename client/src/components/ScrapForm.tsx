import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Calendar, Clock } from "lucide-react";

// ─── Zona horaria Pacífico/Arizona (UTC-7, sin horario de verano) ────────────
const AZ_TZ = "America/Phoenix";

function getTodayAZ(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AZ_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getCurrentTimeAZ(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: AZ_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function buildHoraValue(date: string, time: string): string {
  return `${date} ${time}`;
}

// ─── Catálogo de códigos y defectos ─────────────────────────────────────────
export const REASON_CODES: { code: string; defecto: string }[] = [
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

const CODE_TO_DEFECTO = Object.fromEntries(
  REASON_CODES.map(({ code, defecto }) => [code, defecto])
);

// ─── Schema de validación ────────────────────────────────────────────────────
const scrapFormSchema = z.object({
  num_orden:     z.string().min(1, "Número de orden es requerido"),
  hora:          z.string().min(1, "Fecha y hora son requeridas"),
  serial_number: z.string().min(1, "Serial number es requerido"),
  inventory_id:  z.string().min(1, "Inventory ID es requerido"),
  qty: z
    .string()
    .min(1, "Cantidad es requerida")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1, "Debe ser un número mayor a 0"),
  reason_code:  z.string().min(1, "Código de razón es requerido"),
  reason:       z.string().min(1, "Razón / Defecto es requerido"),
  description:  z.string().min(1, "Descripción es requerida"),
  celda:        z.string().min(1, "Celda es requerida"),
  supervisor:   z.string().min(1, "Supervisor es requerido"),
  autorizo:     z.string().min(1, "Autorizó es requerido"),
  captura:      z.string().min(1, "Captura es requerida"),
});

export type ScrapFormValues = z.infer<typeof scrapFormSchema>;

interface ScrapFormProps {
  onSubmit: (data: ScrapFormValues) => Promise<void>;
  isLoading: boolean;
  tableLabel: string;
}

// ─── Valores vacíos para reset ───────────────────────────────────────────────
const makeEmptyValues = (): ScrapFormValues => ({
  num_orden:     "",
  hora:          buildHoraValue(getTodayAZ(), getCurrentTimeAZ()),
  serial_number: "",
  inventory_id:  "",
  qty:           "",
  reason_code:   "",
  reason:        "",
  description:   "",
  celda:         "",
  supervisor:    "",
  autorizo:      "",
  captura:       "",
});

// ─── Componente ──────────────────────────────────────────────────────────────
export function ScrapForm({ onSubmit, isLoading, tableLabel }: ScrapFormProps) {
  const [currentTime, setCurrentTime]   = useState(getCurrentTimeAZ());
  const [selectedDate, setSelectedDate] = useState(getTodayAZ());

  // Reloj en tiempo real
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(getCurrentTimeAZ()), 1000);
    return () => clearInterval(id);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ScrapFormValues>({
    resolver: zodResolver(scrapFormSchema),
    defaultValues: makeEmptyValues(),
  });

  // Sincronizar hora automáticamente cada segundo
  useEffect(() => {
    const id = setInterval(() => {
      setValue("hora", buildHoraValue(selectedDate, getCurrentTimeAZ()));
    }, 1000);
    return () => clearInterval(id);
  }, [setValue, selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setValue("hora", buildHoraValue(e.target.value, getCurrentTimeAZ()), {
      shouldValidate: true,
    });
  };

  // Al seleccionar un código, rellenar automáticamente el defecto
  const handleReasonCodeChange = (code: string) => {
    setValue("reason_code", code, { shouldValidate: true });
    const defecto = CODE_TO_DEFECTO[code] ?? "";
    setValue("reason", defecto, { shouldValidate: true });
  };

  const handleClear = () => {
    const today = getTodayAZ();
    setSelectedDate(today);
    reset({ ...makeEmptyValues(), hora: buildHoraValue(today, getCurrentTimeAZ()) });
  };

  const handleFormSubmit = async (data: ScrapFormValues) => {
    await onSubmit(data);
    handleClear();
  };

  const inputClass = (hasError: boolean) =>
    `bg-input border-border text-foreground placeholder:text-muted-foreground/50
     focus:border-primary focus:ring-1 focus:ring-primary/30
     transition-all duration-200 text-sm h-9
     ${hasError ? "border-destructive focus:border-destructive focus:ring-destructive/30" : ""}`;

  const labelClass = "text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block";

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="animate-slide-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Nuevo Registro</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tabla: <span className="font-mono text-primary text-xs">{tableLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isLoading ? "Guardando..." : "Guardar Registro"}
          </Button>
        </div>
      </div>

      {/* ── Grid de campos ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* 1. Número de Orden */}
        <div>
          <Label htmlFor="num_orden" className={labelClass}>
            Número de Orden <span className="text-primary">*</span>
          </Label>
          <Input
            id="num_orden"
            placeholder="Ej. ORD-2024-001"
            {...register("num_orden")}
            className={inputClass(!!errors.num_orden)}
          />
          {errors.num_orden && <ErrorMsg msg={errors.num_orden.message} />}
        </div>

        {/* 2. Fecha y Hora */}
        <div>
          <Label htmlFor="hora" className={labelClass}>
            Fecha y Hora <span className="text-primary">*</span>
          </Label>
          <div className="space-y-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                id="hora"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={getTodayAZ()}
                className={`
                  w-full pl-8 pr-3 h-9 rounded-md border text-sm
                  bg-input border-border text-foreground
                  focus:border-primary focus:ring-1 focus:ring-primary/30
                  focus:outline-none transition-all duration-200 [color-scheme:dark]
                  ${errors.hora ? "border-destructive" : ""}
                `}
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary pointer-events-none" />
              <div className="w-full pl-8 pr-3 h-9 rounded-md border flex items-center bg-muted/30 border-border/50 text-sm font-mono text-primary select-none">
                {currentTime}
                <span className="ml-2 text-xs text-muted-foreground font-sans">Hora Pacífico (AZ)</span>
              </div>
              <Controller
                name="hora"
                control={control}
                render={({ field: f }) => <input type="hidden" {...f} />}
              />
            </div>
            {errors.hora && <ErrorMsg msg={errors.hora.message} />}
          </div>
        </div>

        {/* 3. Serial Number */}
        <div>
          <Label htmlFor="serial_number" className={labelClass}>
            Serial Number <span className="text-primary">*</span>
          </Label>
          <Input
            id="serial_number"
            placeholder="Ej. SN-123456"
            {...register("serial_number")}
            className={inputClass(!!errors.serial_number)}
          />
          {errors.serial_number && <ErrorMsg msg={errors.serial_number.message} />}
        </div>

        {/* 4. Inventory ID */}
        <div>
          <Label htmlFor="inventory_id" className={labelClass}>
            Inventory ID <span className="text-primary">*</span>
          </Label>
          <Input
            id="inventory_id"
            placeholder="Ej. INV-789"
            {...register("inventory_id")}
            className={inputClass(!!errors.inventory_id)}
          />
          {errors.inventory_id && <ErrorMsg msg={errors.inventory_id.message} />}
        </div>

        {/* 5. Cantidad */}
        <div>
          <Label htmlFor="qty" className={labelClass}>
            Cantidad (QTY) <span className="text-primary">*</span>
          </Label>
          <Input
            id="qty"
            type="number"
            placeholder="Ej. 5"
            min={1}
            {...register("qty")}
            className={inputClass(!!errors.qty)}
          />
          {errors.qty && <ErrorMsg msg={errors.qty.message} />}
        </div>

        {/* 6. Código de Razón — SELECT con catálogo */}
        <div>
          <Label htmlFor="reason_code" className={labelClass}>
            Código de Razón <span className="text-primary">*</span>
          </Label>
          <Controller
            name="reason_code"
            control={control}
            render={({ field: f }) => (
              <Select
                value={f.value}
                onValueChange={(val) => {
                  f.onChange(val);
                  handleReasonCodeChange(val);
                }}
              >
                <SelectTrigger
                  id="reason_code"
                  className={`
                    h-9 text-sm bg-input border-border text-foreground
                    focus:border-primary focus:ring-1 focus:ring-primary/30
                    ${errors.reason_code ? "border-destructive" : ""}
                  `}
                >
                  <SelectValue placeholder="Selecciona un código..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-72 overflow-y-auto">
                  {REASON_CODES.map(({ code, defecto }) => (
                    <SelectItem
                      key={code}
                      value={code}
                      className="text-sm text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <span className="font-mono font-semibold text-primary mr-2">{code}</span>
                      <span className="text-muted-foreground">{defecto}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.reason_code && <ErrorMsg msg={errors.reason_code.message} />}
        </div>

        {/* 7. Razón / Defecto — se llena automáticamente */}
        <div>
          <Label htmlFor="reason" className={labelClass}>
            Razón / Defecto <span className="text-primary">*</span>
          </Label>
          <Input
            id="reason"
            placeholder="Se llena al seleccionar el código"
            readOnly
            {...register("reason")}
            className={`
              ${inputClass(!!errors.reason)}
              bg-muted/30 cursor-default text-foreground/80
            `}
          />
          {errors.reason && <ErrorMsg msg={errors.reason.message} />}
        </div>

        {/* 8. Celda */}
        <div>
          <Label htmlFor="celda" className={labelClass}>
            Celda <span className="text-primary">*</span>
          </Label>
          <Input
            id="celda"
            placeholder="Ej. C-01"
            {...register("celda")}
            className={inputClass(!!errors.celda)}
          />
          {errors.celda && <ErrorMsg msg={errors.celda.message} />}
        </div>

        {/* 9. Supervisor */}
        <div>
          <Label htmlFor="supervisor" className={labelClass}>
            Supervisor <span className="text-primary">*</span>
          </Label>
          <Input
            id="supervisor"
            placeholder="Nombre completo"
            {...register("supervisor")}
            className={inputClass(!!errors.supervisor)}
          />
          {errors.supervisor && <ErrorMsg msg={errors.supervisor.message} />}
        </div>

        {/* 10. Autorizó */}
        <div>
          <Label htmlFor="autorizo" className={labelClass}>
            Autorizó <span className="text-primary">*</span>
          </Label>
          <Input
            id="autorizo"
            placeholder="Nombre completo"
            {...register("autorizo")}
            className={inputClass(!!errors.autorizo)}
          />
          {errors.autorizo && <ErrorMsg msg={errors.autorizo.message} />}
        </div>

        {/* 11. Captura */}
        <div>
          <Label htmlFor="captura" className={labelClass}>
            Captura <span className="text-primary">*</span>
          </Label>
          <Input
            id="captura"
            placeholder="Nombre del operador"
            {...register("captura")}
            className={inputClass(!!errors.captura)}
          />
          {errors.captura && <ErrorMsg msg={errors.captura.message} />}
        </div>

        {/* 12. Descripción — fila completa */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <Label htmlFor="description" className={labelClass}>
            Descripción <span className="text-primary">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Descripción detallada del scrap..."
            rows={3}
            {...register("description")}
            className={`
              bg-input border-border text-foreground placeholder:text-muted-foreground/50
              focus:border-primary focus:ring-1 focus:ring-primary/30
              resize-none transition-all duration-200 text-sm
              ${errors.description ? "border-destructive focus:border-destructive focus:ring-destructive/30" : ""}
            `}
          />
          {errors.description && <ErrorMsg msg={errors.description.message} />}
        </div>

      </div>
    </form>
  );
}

// ─── Componente auxiliar de error ────────────────────────────────────────────
function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
      <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
      {msg}
    </p>
  );
}
