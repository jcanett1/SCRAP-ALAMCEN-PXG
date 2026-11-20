import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, PackagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { insertInventoryCatalogItem } from "../lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function InventoryCatalogDialog({ open, onClose }: Props) {
  const [inventoryId, setInventoryId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inventoryIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setInventoryId("");
    setDescription("");
    setError("");
    const focusTimer = window.setTimeout(() => inventoryIdRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const closeDialog = () => {
    if (isSaving) return;
    setError("");
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedInventoryId = inventoryId.trim();
    const normalizedDescription = description.trim();
    if (!normalizedInventoryId || !normalizedDescription) {
      setError("Completa el Inventory ID y la descripción.");
      return;
    }

    setIsSaving(true);
    try {
      const item = await insertInventoryCatalogItem({
        inventory_id: normalizedInventoryId,
        description: normalizedDescription,
      });
      toast.success("Número de parte agregado", {
        description: `${item.inventory_id} quedó guardado en el catálogo PXG.`,
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar el número de parte."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-catalog-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-in">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="p-2 rounded-lg" style={{ background: "rgba(47,129,247,0.14)" }}>
            <PackagePlus className="w-5 h-5" style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="inventory-catalog-title" className="text-base font-bold text-[var(--text)]">
              Nuevo número de parte
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Agrega un Inventory ID y su descripción al catálogo PXG.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={isSaving}
            aria-label="Cerrar"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="new-inventory-id" className="field-label">
              Inventory ID <span className="text-[var(--primary)]">*</span>
            </label>
            <input
              ref={inventoryIdRef}
              id="new-inventory-id"
              value={inventoryId}
              onChange={event => {
                setInventoryId(event.target.value);
                setError("");
              }}
              placeholder="Ej. A-SHAFT-ADAPTER-DRIV"
              autoComplete="off"
              maxLength={160}
              required
              disabled={isSaving}
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor="new-inventory-description" className="field-label">
              Descripción <span className="text-[var(--primary)]">*</span>
            </label>
            <textarea
              id="new-inventory-description"
              value={description}
              onChange={event => {
                setDescription(event.target.value);
                setError("");
              }}
              placeholder="Descripción del número de parte"
              rows={3}
              maxLength={500}
              required
              disabled={isSaving}
              className="field-input h-auto resize-y py-2"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isSaving}
              className="btn-ghost border border-[var(--border)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !inventoryId.trim() || !description.trim()}
              className="btn-primary"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
              {isSaving ? "Guardando..." : "Guardar número"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
