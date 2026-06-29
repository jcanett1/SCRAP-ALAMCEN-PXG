import { useState, useEffect, useRef, useCallback } from "react";
import { searchInventory, type InventoryItem } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, PackageSearch, Loader2, CheckCircle2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (inventoryId: string, description: string) => void;
}

const PAGE_SIZE = 30;

export default function InventoryPickerDialog({ open, onClose, onSelect }: Props) {
  const [query, setQuery]       = useState("");
  const [offset, setOffset]     = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems]       = useState<InventoryItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);
  const debouncedQuery          = useDebounce(query, 300);

  useEffect(() => {
    if (open) {
      setQuery(""); setOffset(0); setSelected(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => { setOffset(0); }, [debouncedQuery]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    searchInventory(debouncedQuery, PAGE_SIZE, offset)
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, debouncedQuery, offset]);

  const handleSelect = useCallback((item: InventoryItem) => {
    setSelected(item.inventory_id);
    setTimeout(() => {
      onSelect(item.inventory_id, item.description ?? "");
      onClose();
    }, 150);
  }, [onSelect, onClose]);

  if (!open) return null;

  const totalPages  = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-in flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                <PackageSearch className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  Seleccionar Número de Parte
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {loading ? "Buscando..." : `${total.toLocaleString()} partes disponibles`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID o descripción..."
              className="field-input pl-9"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {items.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <PackageSearch className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">
                {query ? "Sin resultados para ese criterio" : "Escribe para buscar"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {items.map((item) => {
                const isSel = selected === item.inventory_id;
                return (
                  <button
                    key={item.inventory_id}
                    onClick={() => handleSelect(item)}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-lg transition-all duration-100
                      flex items-start gap-3 border
                      ${isSel
                        ? "bg-[var(--primary)]/15 border-[var(--primary)]/40"
                        : "border-transparent hover:bg-[var(--surface2)]"}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[var(--primary)] shrink-0">
                          {item.inventory_id}
                        </span>
                        {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />}
                      </div>
                      {item.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text)]
                           hover:bg-[var(--surface2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text)]
                           hover:bg-[var(--surface2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
