import { useState } from "react";
import { AlertTriangle, Loader2, PackageSearch, Pencil, Trash2, X } from "lucide-react";
import MaterialPickerDialog from "./MaterialPickerDialog";
import { DELIVERERS, REQUESTERS } from "./MaterialRequestForm";
import type { MaterialDeliverer, MaterialRequest, MaterialRequester } from "../lib/supabase";

type EditableMaterialRequest = Omit<MaterialRequest, "id" | "created_at" | "updated_at">;
type ActionFormValues = Omit<EditableMaterialRequest, "cantidad"> & { cantidad: string };

interface Props {
  mode: "edit" | "delete";
  record: MaterialRequest;
  isSaving: boolean;
  accentColor: string;
  onCancel: () => void;
  onConfirm: (values: EditableMaterialRequest | null, changeReason: string) => Promise<void>;
}

export function MaterialRequestActionDialog({
  mode,
  record,
  isSaving,
  accentColor,
  onCancel,
  onConfirm,
}: Props) {
  const [values, setValues] = useState<ActionFormValues>({
    fecha: record.fecha,
    material_part_number: record.material_part_number,
    material_description: record.material_description,
    cantidad: String(record.cantidad),
    motivo: record.motivo,
    quien_pide: record.quien_pide,
    entrego: record.entrego,
  });
  const [changeReason, setChangeReason] = useState("");
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const isDelete = mode === "delete";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const reason = changeReason.trim();
    if (!reason) {
      setError(`Escribe el motivo de la ${isDelete ? "eliminación" : "edición"} antes de continuar.`);
      return;
    }

    if (isDelete) {
      try {
        await onConfirm(null, reason);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo eliminar la requisición.");
      }
      return;
    }

    const quantity = Number(values.cantidad);
    if (!values.fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    if (!values.material_part_number.trim() || !values.material_description.trim()) {
      setError("Selecciona un material y su descripción.");
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setError("La cantidad debe ser un número entero mayor que 0.");
      return;
    }
    if (!values.motivo.trim()) {
      setError("El motivo de la requisición es obligatorio.");
      return;
    }
    if (!values.quien_pide || !values.entrego) {
      setError("Selecciona quién pide y quién entrega el material.");
      return;
    }

    const updatedValues: EditableMaterialRequest = {
      ...values,
      cantidad: quantity,
      motivo: values.motivo.trim(),
    };

    try {
      await onConfirm(updatedValues, reason);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la edición.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-request-action-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isSaving) onCancel();
      }}
    >
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-in">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div
            className="p-2 rounded-lg"
            style={{ background: isDelete ? "rgba(248,81,73,0.12)" : `${accentColor}20` }}
          >
            {isDelete ? (
              <Trash2 className="w-5 h-5" style={{ color: isDelete ? "var(--danger)" : accentColor }} />
            ) : (
              <Pencil className="w-5 h-5" style={{ color: accentColor }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="material-request-action-title" className="text-base font-bold text-[var(--text)]">
              {isDelete ? "Eliminar requisición" : "Editar requisición"}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Requisición <span className="font-mono font-semibold">#{record.id}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cerrar"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {isDelete ? (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
                <div className="text-sm text-[var(--text)]">
                  <p className="font-semibold">Confirma la eliminación de esta requisición.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Sus datos y el motivo de eliminación quedarán guardados en el historial de auditoría.
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 mt-4 text-xs">
                <div><dt className="text-[var(--text-muted)]">Fecha</dt><dd className="text-[var(--text)]">{record.fecha}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Cantidad</dt><dd className="text-[var(--text)]">{record.cantidad}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Material</dt><dd className="font-mono text-[var(--text)] break-all">{record.material_part_number}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Quién pide</dt><dd className="text-[var(--text)]">{record.quien_pide}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-request-date" className="field-label">Fecha <span className="text-[var(--primary)]">*</span></label>
                <input
                  id="edit-request-date"
                  type="date"
                  required
                  value={values.fecha}
                  onChange={event => setValues(current => ({ ...current, fecha: event.target.value }))}
                  className="field-input"
                />
              </div>

              <div>
                <label className="field-label">Material / Part Number <span className="text-[var(--primary)]">*</span></label>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="w-full min-h-9 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface2)] text-sm text-left flex items-center justify-between gap-2 hover:border-[#a371f7] focus:outline-none focus:border-[#a371f7]"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-xs font-semibold mr-2" style={{ color: accentColor }}>{values.material_part_number}</span>
                    <span className="text-[var(--text-muted)]">{values.material_description}</span>
                  </span>
                  <PackageSearch className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                </button>
              </div>

              <div>
                <label htmlFor="edit-request-quantity" className="field-label">Cantidad <span className="text-[var(--primary)]">*</span></label>
                <input
                  id="edit-request-quantity"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={values.cantidad}
                  onChange={event => setValues(current => ({ ...current, cantidad: event.target.value }))}
                  className="field-input"
                />
              </div>

              <div>
                <label htmlFor="edit-request-requester" className="field-label">Quién pide <span className="text-[var(--primary)]">*</span></label>
                <div className="relative">
                  <select
                    id="edit-request-requester"
                    required
                    value={values.quien_pide}
                    onChange={event => setValues(current => ({ ...current, quien_pide: event.target.value as MaterialRequester }))}
                    className="select-field pr-8"
                  >
                    <option value="">Selecciona quién pide...</option>
                    {REQUESTERS.map(requester => <option key={requester} value={requester}>{requester}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">⌄</div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-request-deliverer" className="field-label">Entregó <span className="text-[var(--primary)]">*</span></label>
                <div className="relative">
                  <select
                    id="edit-request-deliverer"
                    required
                    value={values.entrego}
                    onChange={event => setValues(current => ({ ...current, entrego: event.target.value as MaterialDeliverer }))}
                    className="select-field pr-8"
                  >
                    <option value="">Selecciona quién entregó...</option>
                    {DELIVERERS.map(deliverer => <option key={deliverer} value={deliverer}>{deliverer}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">⌄</div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-request-reason" className="field-label">Motivo de la requisición <span className="text-[var(--primary)]">*</span></label>
                <textarea
                  id="edit-request-reason"
                  rows={3}
                  required
                  value={values.motivo}
                  onChange={event => setValues(current => ({ ...current, motivo: event.target.value }))}
                  className="field-input h-auto resize-y py-2"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="material-request-change-reason" className="field-label">
              Motivo de la {isDelete ? "eliminación" : "edición"} <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea
              id="material-request-change-reason"
              rows={3}
              required
              maxLength={1000}
              value={changeReason}
              onChange={event => { setChangeReason(event.target.value); setError(""); }}
              placeholder={isDelete ? "Escribe por qué se elimina esta requisición..." : "Escribe por qué se modifica esta requisición..."}
              className="field-input h-auto resize-y py-2"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Este motivo se guardará junto con el historial del cambio.</p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <button type="button" onClick={onCancel} disabled={isSaving} className="btn-ghost border border-[var(--border)]">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !changeReason.trim()}
              className="btn-primary"
              style={{ background: isDelete ? "var(--danger)" : accentColor }}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isDelete ? <Trash2 className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              {isSaving ? "Guardando..." : isDelete ? "Eliminar requisición" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>

      <MaterialPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={item => setValues(current => ({
          ...current,
          material_part_number: item.partNumber,
          material_description: item.description,
        }))}
        selectedPartNumber={values.material_part_number}
      />
    </div>
  );
}

export type { EditableMaterialRequest };
