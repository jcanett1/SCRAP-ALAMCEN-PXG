import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, RotateCcw } from "lucide-react";

const scrapFormSchema = z.object({
  num_orden: z.string().min(1, "Número de orden es requerido"),
  hora: z.string().min(1, "Hora es requerida"),
  serial_number: z.string().min(1, "Serial number es requerido"),
  inventory_id: z.string().min(1, "Inventory ID es requerido"),
  qty: z
    .string()
    .min(1, "Cantidad es requerida")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1, "Debe ser un número mayor a 0"),
  reason: z.string().min(1, "Razón es requerida"),
  reason_code: z.string().min(1, "Código de razón es requerido"),
  description: z.string().min(1, "Descripción es requerida"),
  celda: z.string().min(1, "Celda es requerida"),
  supervisor: z.string().min(1, "Supervisor es requerido"),
  autorizo: z.string().min(1, "Autorizó es requerido"),
  captura: z.string().min(1, "Captura es requerida"),
});

export type ScrapFormValues = z.infer<typeof scrapFormSchema>;

interface ScrapFormProps {
  onSubmit: (data: ScrapFormValues) => Promise<void>;
  isLoading: boolean;
  tableLabel: string;
}

interface FieldConfig {
  name: keyof ScrapFormValues;
  label: string;
  placeholder: string;
  type?: "text" | "time" | "number" | "textarea";
  required?: boolean;
  colSpan?: "half" | "third" | "full";
}

const FIELDS: FieldConfig[] = [
  { name: "num_orden",     label: "Número de Orden",  placeholder: "Ej. ORD-2024-001",  colSpan: "half",  required: true },
  { name: "hora",          label: "Hora",             placeholder: "HH:MM",             type: "time",     colSpan: "third", required: true },
  { name: "serial_number", label: "Serial Number",    placeholder: "Ej. SN-123456",     colSpan: "half",  required: true },
  { name: "inventory_id",  label: "Inventory ID",     placeholder: "Ej. INV-789",       colSpan: "half",  required: true },
  { name: "qty",           label: "Cantidad (QTY)",   placeholder: "Ej. 5",             type: "number",   colSpan: "third", required: true },
  { name: "reason",        label: "Razón",            placeholder: "Motivo del scrap",  colSpan: "half",  required: true },
  { name: "reason_code",   label: "Código de Razón",  placeholder: "Ej. D01",           colSpan: "third", required: true },
  { name: "celda",         label: "Celda",            placeholder: "Ej. C-01",          colSpan: "third", required: true },
  { name: "supervisor",    label: "Supervisor",       placeholder: "Nombre completo",   colSpan: "half",  required: true },
  { name: "autorizo",      label: "Autorizó",         placeholder: "Nombre completo",   colSpan: "half",  required: true },
  { name: "captura",       label: "Captura",          placeholder: "Nombre del operador", colSpan: "half", required: true },
  { name: "description",   label: "Descripción",      placeholder: "Descripción detallada del scrap...", type: "textarea", colSpan: "full", required: true },
];

export function ScrapForm({ onSubmit, isLoading, tableLabel }: ScrapFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScrapFormValues>({
    resolver: zodResolver(scrapFormSchema),
  });

  const handleFormSubmit = async (data: ScrapFormValues) => {
    await onSubmit(data);
    reset();
  };

  const colClass = (span?: string) => {
    if (span === "full") return "col-span-1 md:col-span-2 lg:col-span-3";
    if (span === "half") return "col-span-1 md:col-span-1 lg:col-span-1";
    if (span === "third") return "col-span-1";
    return "col-span-1";
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="animate-slide-up">
      {/* Header del formulario */}
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
            onClick={() => reset()}
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
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading ? "Guardando..." : "Guardar Registro"}
          </Button>
        </div>
      </div>

      {/* Grid de campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELDS.map((field) => (
          <div key={field.name} className={colClass(field.colSpan)}>
            <Label
              htmlFor={field.name}
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block"
            >
              {field.label}
              {field.required && (
                <span className="text-primary ml-1">*</span>
              )}
            </Label>

            {field.type === "textarea" ? (
              <Textarea
                id={field.name}
                placeholder={field.placeholder}
                rows={3}
                {...register(field.name)}
                className={`
                  bg-input border-border text-foreground placeholder:text-muted-foreground/50
                  focus:border-primary focus:ring-1 focus:ring-primary/30
                  resize-none transition-all duration-200 text-sm
                  ${errors[field.name] ? "border-destructive focus:border-destructive focus:ring-destructive/30" : ""}
                `}
              />
            ) : (
              <Input
                id={field.name}
                type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
                placeholder={field.placeholder}
                min={field.type === "number" ? 1 : undefined}
                {...register(field.name)}
                className={`
                  bg-input border-border text-foreground placeholder:text-muted-foreground/50
                  focus:border-primary focus:ring-1 focus:ring-primary/30
                  transition-all duration-200 text-sm h-9
                  ${errors[field.name] ? "border-destructive focus:border-destructive focus:ring-destructive/30" : ""}
                `}
              />
            )}

            {errors[field.name] && (
              <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                {errors[field.name]?.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </form>
  );
}
