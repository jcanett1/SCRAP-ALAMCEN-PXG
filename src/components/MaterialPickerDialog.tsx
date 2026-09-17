import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, PackageSearch, Search, X } from "lucide-react";
import { MATERIAL_CATALOG, type MaterialCatalogItem } from "../data/materials";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MaterialCatalogItem) => void;
  selectedPartNumber?: string;
}

export default function MaterialPickerDialog({
  open,
  onClose,
  onSelect,
  selectedPartNumber,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return MATERIAL_CATALOG;
    return MATERIAL_CATALOG.filter(
      item =>
        item.partNumber.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized)
    );
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-picker-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="p-2 rounded-lg" style={{ background: "rgba(163,113,247,0.14)" }}>
            <PackageSearch className="w-5 h-5" style={{ color: "#a371f7" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 id="material-picker-title" className="text-base font-bold text-[var(--text)]">
                Seleccionar material / part number
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#a371f7", background: "rgba(163,113,247,0.14)" }}>
                {items.length} de {MATERIAL_CATALOG.length}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Busca por número de parte o descripción y selecciona un material.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector de materiales"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar part number o descripción..."
              className="field-input pl-9"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-[var(--text-muted)]">
              <PackageSearch className="w-10 h-10 mb-3 opacity-35" />
              <p className="text-sm">No se encontraron materiales con esa búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {items.map(item => {
                const isSelected = item.partNumber === selectedPartNumber;
                return (
                  <button
                    type="button"
                    key={item.partNumber}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className={`min-w-0 text-left rounded-lg border px-3 py-2.5 transition-all duration-150 hover:-translate-y-px hover:border-[#a371f7] hover:bg-[rgba(163,113,247,0.08)] ${isSelected ? "border-[#a371f7] bg-[rgba(163,113,247,0.14)]" : "border-[var(--border)] bg-[var(--surface2)]"}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-bold truncate" style={{ color: "#a371f7" }}>
                          {item.partNumber}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">
                          {item.description}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#a371f7" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
