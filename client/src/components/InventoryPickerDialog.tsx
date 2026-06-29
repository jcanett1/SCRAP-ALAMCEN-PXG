import { useState, useCallback, useRef, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, PackageSearch, CheckCircle2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (inventoryId: string, description: string) => void;
}

const PAGE_SIZE = 30;

export default function InventoryPickerDialog({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery("");
      setOffset(0);
      setSelected(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Reset paginación cuando cambia la búsqueda
  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery]);

  const { data, isFetching } = trpc.scrap.searchInventory.useQuery(
    { query: debouncedQuery, limit: PAGE_SIZE, offset },
    { enabled: open, placeholderData: keepPreviousData }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const handleSelect = useCallback(
    (item: { inventory_id: string; description: string | null }) => {
      setSelected(item.inventory_id);
      setTimeout(() => {
        onSelect(item.inventory_id, item.description ?? "");
        onClose();
      }, 150);
    },
    [onSelect, onClose]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl w-full p-0 overflow-hidden border border-border bg-card"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <PackageSearch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Seleccionar Número de Parte
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {total > 0
                  ? `${total.toLocaleString()} partes disponibles`
                  : isFetching
                  ? "Buscando..."
                  : "Sin resultados"}
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID o descripción..."
              className="pl-9 h-9 bg-input border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </DialogHeader>

        {/* Lista de resultados */}
        <div
          className="overflow-y-auto px-3 py-2"
          style={{ maxHeight: "calc(85vh - 200px)" }}
        >
          {items.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PackageSearch className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">
                {query ? "No se encontraron partes con ese criterio" : "Escribe para buscar"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {items.map((item) => {
                const isSelected = selected === item.inventory_id;
                return (
                  <button
                    key={item.inventory_id}
                    onClick={() => handleSelect(item)}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-md transition-all duration-100
                      flex items-start gap-3 group
                      ${isSelected
                        ? "bg-primary/15 border border-primary/40"
                        : "hover:bg-accent/60 border border-transparent"
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs px-1.5 py-0 border-primary/40 text-primary shrink-0"
                        >
                          {item.inventory_id}
                        </Badge>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
          <div className="px-6 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1 text-xs rounded border border-border text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-3 py-1 text-xs rounded border border-border text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
