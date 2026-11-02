import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Loader2, PackageSearch, RotateCcw, Save } from "lucide-react";
import MaterialPickerDialog from "./MaterialPickerDialog";
import type { MaterialCatalogItem } from "../data/materials";
import type { MaterialDeliverer, MaterialRequester } from "../lib/supabase";

const getDateAZ = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const REQUESTERS: MaterialRequester[] = [
  "CELDA 11",
  "CELDA 10",
  "CELDA 16",
  "CELDA 15",
  "PREP AREA",
  "TECNICOS",
  "INGENIERIA",
];

export const DELIVERERS: MaterialDeliverer[] = [
  "DENISSE SANZARRIC",
  "YODELI LOPEZ",
  "DIANA MENDEZ",
  "YAJAIRA ONTIVEROS",
  "MAREDNA PUIG",
];

const schema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  material_part_number: z.string().min(1, "Selecciona un material"),
  material_description: z.string().min(1, "Selecciona un material"),
  cantidad: z.string().refine(value => /^\d+$/.test(value) && Number(value) > 0, "Debe ser un número mayor que 0"),
  motivo: z.string().trim().min(1, "Escribe el motivo de la requisición"),
  quien_pide: z.string().min(1, "Selecciona quién pide") as z.ZodType<MaterialRequester>,
  entrego: z.string().min(1, "Selecciona quién entrega") as z.ZodType<MaterialDeliverer>,
});

export type MaterialRequestFormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: MaterialRequestFormValues) => Promise<void>;
  isLoading: boolean;
  accentColor?: string;
}

const emptyValues = (): MaterialRequestFormValues => ({
  fecha: getDateAZ(),
  material_part_number: "",
  material_description: "",
  cantidad: "",
  motivo: "",
  quien_pide: "" as MaterialRequester,
  entrego: "" as MaterialDeliverer,
});

export function MaterialRequestForm({ onSubmit, isLoading, accentColor = "#a371f7" }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialCatalogItem | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<MaterialRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });

  const handleMaterialSelect = (item: MaterialCatalogItem) => {
    setSelectedMaterial(item);
    setValue("material_part_number", item.partNumber, { shouldValidate: true });
    setValue("material_description", item.description, { shouldValidate: true });
  };

  const handleClear = () => {
    setSelectedMaterial(null);
    reset(emptyValues());
  };

  const onValid = async (data: MaterialRequestFormValues) => {
    await onSubmit(data);
    handleClear();
  };

  const labelClass = "field-label";
  const inputClass = (hasError: boolean) => `field-input${hasError ? " error" : ""}`;
  const errorMessage = (message?: string) =>
    message ? <p className="text-xs text-[var(--danger)] mt-1">{message}</p> : null;

  return (
    <form onSubmit={handleSubmit(onValid)} className="animate-slide-up space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Fecha <span className="text-[var(--primary)]">*</span></label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="date"
              readOnly
              {...register("fecha")}
              className={`${inputClass(!!errors.fecha)} pl-8 cursor-default`}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Se asigna automáticamente.</p>
          {errorMessage(errors.fecha?.message)}
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Material / Part Number <span className="text-[var(--primary)]">*</span></label>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`w-full h-9 px-3 rounded-md border text-sm text-left flex items-center justify-between gap-2 bg-[var(--surface2)] transition-all duration-150 hover:border-[#a371f7] focus:outline-none focus:border-[#a371f7] ${errors.material_part_number ? "border-[var(--danger)]" : "border-[var(--border)]"}`}
          >
            <span className="truncate">
              {selectedMaterial ? (
                <>
                  <span className="font-mono text-xs font-bold mr-2" style={{ color: accentColor }}>{selectedMaterial.partNumber}</span>
                  <span className="text-[var(--text-muted)]">{selectedMaterial.description}</span>
                </>
              ) : (
                <span className="text-[var(--text-muted)]">Buscar número de parte...</span>
              )}
            </span>
            <PackageSearch className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          </button>
          <Controller name="material_part_number" control={control} render={({ field }) => <input type="hidden" {...field} />} />
          <Controller name="material_description" control={control} render={({ field }) => <input type="hidden" {...field} />} />
          {errorMessage(errors.material_part_number?.message)}
          <MaterialPickerDialog
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={handleMaterialSelect}
            selectedPartNumber={selectedMaterial?.partNumber}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Cantidad que están pidiendo <span className="text-[var(--primary)]">*</span></label>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Ej. 10"
            {...register("cantidad")}
            className={inputClass(!!errors.cantidad)}
          />
          {errorMessage(errors.cantidad?.message)}
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Quién pide <span className="text-[var(--primary)]">*</span></label>
          <div className="relative">
            <select {...register("quien_pide")} className={`select-field pr-8${errors.quien_pide ? " error" : ""}`}>
              <option value="">Selecciona quién pide...</option>
              {REQUESTERS.map(requester => <option key={requester} value={requester}>{requester}</option>)}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">⌄</div>
          </div>
          {errorMessage(errors.quien_pide?.message)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Motivo <span className="text-[var(--primary)]">*</span></label>
          <textarea
            rows={3}
            placeholder="Describe por qué se requiere el material..."
            {...register("motivo")}
            className={`${inputClass(!!errors.motivo)} h-auto resize-none py-2`}
          />
          {errorMessage(errors.motivo?.message)}
        </div>

        <div>
          <label className={labelClass}>Entregó <span className="text-[var(--primary)]">*</span></label>
          <div className="relative">
            <select {...register("entrego")} className={`select-field pr-8${errors.entrego ? " error" : ""}`}>
              <option value="">Selecciona quién entregó...</option>
              {DELIVERERS.map(deliverer => <option key={deliverer} value={deliverer}>{deliverer}</option>)}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">⌄</div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Persona que entrega el material.</p>
          {errorMessage(errors.entrego?.message)}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <button type="button" onClick={handleClear} className="btn-ghost">
          <RotateCcw className="w-4 h-4" />
          Limpiar
        </button>
        <button type="submit" disabled={isLoading} className="btn-primary" style={{ background: accentColor }}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isLoading ? "Guardando..." : "Guardar requisición"}
        </button>
      </div>
    </form>
  );
}
