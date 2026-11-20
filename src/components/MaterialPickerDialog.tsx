import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, PackageSearch, Search, X } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import {
  INVENTORY_CATALOG_UPDATED_EVENT,
  searchInventory,
  type MaterialCatalogItem,
} from "../lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MaterialCatalogItem) => void;
  selectedPartNumber?: string;
}

const PAGE_SIZE = 30;

export default function MaterialPickerDialog({
  open,
  onClose,
  onSelect,
  selectedPartNumber,
}: Props) {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<MaterialCatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [catalogVersion, setCatalogVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setOffset(0);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery]);

  useEffect(() => {
    const refreshCatalog = () => setCatalogVersion(version => version + 1);
    window.addEventListener(INVENTORY_CATALOG_UPDATED_EVENT, refreshCatalog);
    return () =>
      window.removeEventListener(INVENTORY_CATALOG_UPDATED_EVENT, refreshCatalog);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    searchInventory(debouncedQuery, PAGE_SIZE, offset)
      .then(({ items: inventoryItems, total: itemCount }) => {
        if (cancelled) return;
        setItems(
          inventoryItems.map(item => ({
            partNumber: item.inventory_id,
            description: item.description ?? "",
          }))
        );
        setTotal(itemCount);
      })
      .catch(caught => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setLoadError(
          caught instanceof Error
            ? caught.message
            : "No se pudo cargar el catálogo de números de parte."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, offset, catalogVersion]);

  if (!open) return null;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

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
                {total.toLocaleString()} partes
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Busca por Inventory ID o descripción en el catálogo de PXG.
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
              maxLength={200}
              className="field-input pl-9"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loadError && !loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-[var(--danger)]">
              <PackageSearch className="w-10 h-10 mb-3 opacity-70" />
              <p className="text-sm">No se pudo cargar el catálogo.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{loadError}</p>
            </div>
          ) : items.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-[var(--text-muted)]">
              <PackageSearch className="w-10 h-10 mb-3 opacity-35" />
              <p className="text-sm">{query ? "No se encontraron materiales con esa búsqueda." : "El catálogo no contiene números de parte."}</p>
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

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
