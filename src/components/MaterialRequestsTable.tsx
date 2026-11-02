import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, Download, Loader2, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { toast } from "sonner";
import {
  deleteMaterialRequest,
  listAllMaterialRequests,
  listMaterialRequestsPage,
  type MaterialRequest,
  toggleMaterialRequestReviewed,
  updateMaterialRequest,
} from "../lib/supabase";
import { MaterialRequestActionDialog, type EditableMaterialRequest } from "./MaterialRequestActionDialog";
import { Check, Lock } from "lucide-react";

interface Props {
  refreshKey: number;
  accentColor: string;
}

type ActionTarget = {
  mode: "edit" | "delete";
  record: MaterialRequest;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const escapeCsv = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return `"${text.split('"').join('""')}"`;
};

function downloadCsv(records: MaterialRequest[], selectedOnly = false) {
  const headers = [
    "ID",
    "Fecha",
    "Material / Part Number",
    "Descripción",
    "Cantidad",
    "Motivo",
    "Quién pide",
    "Entregó",
    "Estado",
  ];
  const rows = records.map(record => [
    record.id,
    record.fecha,
    record.material_part_number,
    record.material_description,
    record.cantidad,
    record.motivo,
    record.quien_pide,
    record.entrego,
    record.revisado ? "Revisado" : "Pendiente",
  ]);
  const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const prefix = selectedOnly ? "requisiciones_material_seleccionadas" : "requisiciones_material";
  anchor.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function recordMatches(record: MaterialRequest, query: string) {
  const text = [
    record.id,
    record.fecha,
    record.material_part_number,
    record.material_description,
    record.cantidad,
    record.motivo,
    record.quien_pide,
    record.entrego,
    record.revisado ? "Revisado" : "Pendiente",
  ].join(" ");
  return normalizeSearch(text).includes(query);
}

export function MaterialRequestsTable({ refreshKey, accentColor }: Props) {
  const [records, setRecords] = useState<MaterialRequest[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [allRecords, setAllRecords] = useState<MaterialRequest[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const recordsRequestId = useRef(0);
  const selectAllVisibleRef = useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const normalizedQuery = normalizeSearch(debouncedSearchQuery);

  const loadRecords = useCallback(async (page: number, size: number) => {
    const requestId = ++recordsRequestId.current;
    setIsLoading(true);
    setError("");
    try {
      const result = await listMaterialRequestsPage(size, page * size);
      if (requestId !== recordsRequestId.current) return;
      setRecords(result.records);
      setRecordCount(result.total);
    } catch (caught) {
      if (requestId === recordsRequestId.current) setError((caught as Error).message);
    } finally {
      if (requestId === recordsRequestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords(pageIndex, pageSize);
  }, [loadRecords, pageIndex, pageSize, refreshKey]);

  useEffect(() => {
    setAllRecords(null);
  }, [refreshKey]);

  useEffect(() => {
    if (!normalizedQuery) {
      setIsSearchingAll(false);
      return;
    }
    if (allRecords !== null) {
      setIsSearchingAll(false);
      return;
    }

    let cancelled = false;
    setIsSearchingAll(true);
    void listAllMaterialRequests()
      .then(data => {
        if (cancelled) return;
        setAllRecords(data);
        setError("");
      })
      .catch(caught => {
        if (!cancelled) setError((caught as Error).message);
      })
      .finally(() => {
        if (!cancelled) setIsSearchingAll(false);
      });
    return () => { cancelled = true; };
  }, [normalizedQuery, allRecords, searchRefreshKey, refreshKey]);

  const filteredRecords = useMemo(() => {
    if (!normalizedQuery || allRecords === null) return [];
    return allRecords.filter(record => recordMatches(record, normalizedQuery));
  }, [allRecords, normalizedQuery]);

  const displayTotal = normalizedQuery
    ? (allRecords === null ? 0 : filteredRecords.length)
    : recordCount;
  const pageCount = Math.max(1, Math.ceil(displayTotal / pageSize));
  const startIndex = displayTotal === 0 ? 0 : pageIndex * pageSize + 1;
  const endIndex = Math.min((pageIndex + 1) * pageSize, displayTotal);
  const visibleRecords = useMemo(
    () => normalizedQuery
      ? filteredRecords.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
      : records,
    [filteredRecords, normalizedQuery, pageIndex, pageSize, records]
  );
  const pageQuantity = useMemo(
    () => visibleRecords.reduce((total, record) => total + Number(record.cantidad || 0), 0),
    [visibleRecords]
  );
  const visibleIds = visibleRecords.flatMap(record => record.id == null ? [] : [record.id]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));

  useEffect(() => {
    if (selectAllVisibleRef.current) {
      selectAllVisibleRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  useEffect(() => {
    if (pageIndex >= pageCount) setPageIndex(pageCount - 1);
  }, [pageCount, pageIndex]);

  const handleRefresh = () => {
    setAllRecords(null);
    setSearchRefreshKey(key => key + 1);
    void loadRecords(pageIndex, pageSize);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const all = await listAllMaterialRequests();
      setAllRecords(all);
      downloadCsv(all);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDownloading(true);
    try {
      const all = await listAllMaterialRequests();
      setAllRecords(all);
      const selected = all.filter(record => record.id != null && selectedIds.has(record.id));
      if (selected.length === 0) {
        setSelectedIds(new Set());
        toast.error("No se encontraron requisiciones seleccionadas. Actualiza la tabla y vuelve a seleccionar.");
        return;
      }
      downloadCsv(selected, true);
      toast.success(`Se descargaron ${selected.length} requisiciones seleccionadas.`);
    } catch (caught) {
      setError((caught as Error).message);
      toast.error("No se pudieron descargar las requisiciones seleccionadas", { description: (caught as Error).message });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleToggleRowSelection = (record: MaterialRequest) => {
    const recordId = record.id;
    if (recordId == null) return;
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const handleToggleVisibleSelection = () => {
    if (visibleIds.length === 0) return;
    setSelectedIds(current => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleToggleReviewed = async (record: MaterialRequest) => {
    const recordId = record.id;
    if (recordId == null || reviewingId !== null) return;

    const nextReviewed = !Boolean(record.revisado);
    setReviewingId(recordId);
    try {
      await toggleMaterialRequestReviewed(recordId, nextReviewed);
      const updateRecord = (items: MaterialRequest[]) => items.map(item =>
        item.id === recordId ? { ...item, revisado: nextReviewed } : item
      );
      setRecords(updateRecord);
      setAllRecords(current => current ? updateRecord(current) : current);
      toast.success(nextReviewed ? "Requisición marcada como revisada." : "Requisición marcada como pendiente.");
    } catch (caught) {
      toast.error("No se pudo actualizar el estado", { description: (caught as Error).message });
    } finally {
      setReviewingId(null);
    }
  };

  const handleActionConfirm = async (values: EditableMaterialRequest | null, changeReason: string) => {
    if (actionTarget?.record.id == null) throw new Error("No se encontró el identificador de la requisición.");

    setIsSavingAction(true);
    try {
      if (actionTarget.mode === "edit") {
        if (!values) throw new Error("Faltan los datos editados de la requisición.");
        await updateMaterialRequest(actionTarget.record.id, values, changeReason);
        setActionTarget(null);
        setAllRecords(null);
        setSearchRefreshKey(key => key + 1);
        toast.success("Requisición actualizada", {
          description: "El motivo y el antes/después quedaron registrados en la auditoría.",
        });
      } else {
        await deleteMaterialRequest(actionTarget.record.id, changeReason);
        setSelectedIds(current => {
          const next = new Set(current);
          next.delete(actionTarget.record.id!);
          return next;
        });
        setActionTarget(null);
        setAllRecords(null);
        setSearchRefreshKey(key => key + 1);
        toast.success("Requisición eliminada", {
          description: "Los datos anteriores y el motivo quedaron guardados en la auditoría.",
        });
      }
      await loadRecords(pageIndex, pageSize);
    } catch (caught) {
      toast.error("No se pudo completar la acción", { description: (caught as Error).message });
      throw caught;
    } finally {
      setIsSavingAction(false);
    }
  };

  const searching = Boolean(normalizedQuery);
  const summary = searching
    ? isSearchingAll
      ? "Buscando en todas las requisiciones..."
      : allRecords
        ? `${filteredRecords.length} coincidencias de ${allRecords.length} requisiciones · ${pageQuantity} piezas en esta página`
        : "Preparando búsqueda..."
    : `${recordCount} requisiciones registradas · ${pageQuantity} piezas en esta página`;
  const isBusy = isLoading || (searching && isSearchingAll);
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex >= pageCount - 1;

  return (
    <section className="card border" style={{ borderColor: "rgba(163,113,247,0.5)" }}>
      {actionTarget && (
        <MaterialRequestActionDialog
          mode={actionTarget.mode}
          record={actionTarget.record}
          isSaving={isSavingAction}
          accentColor={accentColor}
          onCancel={() => setActionTarget(null)}
          onConfirm={handleActionConfirm}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full" style={{ background: accentColor }} />
        <div className="flex-1 min-w-[210px]">
          <h3 className="text-sm font-semibold text-[var(--text)]">Requisiciones recientes</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{summary}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <label htmlFor="material-requests-search" className="sr-only">Buscar requisiciones</label>
          <input
            id="material-requests-search"
            type="search"
            value={searchQuery}
            onChange={event => {
              setSearchQuery(event.target.value);
              setPageIndex(0);
            }}
            placeholder="Buscar por ID, fecha, material..."
            autoComplete="off"
            className="field-input pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isSearchingAll}
            className="btn-ghost border border-[var(--border)]"
            title="Actualizar requisiciones"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isSearchingAll ? "animate-spin" : ""}`} />
            Actualizar
          </button>
              <button
                type="button"
                onClick={() => void handleDownloadSelected()}
                disabled={isDownloading || selectedIds.size === 0}
                className="btn-ghost border border-[var(--border)] disabled:cursor-not-allowed disabled:opacity-40"
                title={`Descargar las ${selectedIds.size} requisiciones seleccionadas en CSV`}
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                CSV seleccionados ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="btn-ghost border border-[var(--border)]"
            title="Descargar todas las requisiciones en CSV"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          {error}. Verifica la conexión con Supabase y que la migración de requisiciones esté aplicada.
        </div>
      )}

      {isBusy ? (
        <div className="flex items-center justify-center py-14 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {searching ? "Buscando en todas las requisiciones..." : "Cargando requisiciones..."}
        </div>
      ) : records.length === 0 && !searching ? (
        <div className="flex flex-col items-center justify-center py-14 text-[var(--text-muted)]">
          <Database className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Todavía no hay requisiciones registradas.</p>
          <p className="text-xs mt-1">La primera requisición aparecerá aquí después de guardarla.</p>
        </div>
      ) : searching && filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-[var(--text-muted)]">
          <Search className="w-9 h-9 mb-3 opacity-30" />
          <p className="text-sm">No se encontraron requisiciones con esa búsqueda.</p>
          <p className="text-xs mt-1">Prueba con un ID, fecha, part number, descripción, motivo, solicitante o quien entregó.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm min-w-[1220px]">
              <thead>
                <tr className="bg-[var(--surface2)] text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-3 text-left">ID</th>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3 text-left">Material / Part Number</th>
                  <th className="px-3 py-3 text-left">Descripción</th>
                  <th className="px-3 py-3 text-right">Cantidad</th>
                  <th className="px-3 py-3 text-left">Motivo</th>
                  <th className="px-3 py-3 text-left">Quién pide</th>
                  <th className="px-3 py-3 text-left">Entregó</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3 text-center">Acciones</th>
                  <th className="px-3 py-3 text-center">
                    <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                      <span>Seleccionar</span>
                      <input
                        ref={selectAllVisibleRef}
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleToggleVisibleSelection}
                        disabled={visibleIds.length === 0 || isDownloading}
                        aria-label="Seleccionar todas las requisiciones de esta página"
                        title="Seleccionar todas las requisiciones de esta página"
                        className="h-4 w-4 rounded accent-[#a371f7]"
                      />
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map(record => (
                  <tr key={record.id} className="border-t border-[var(--border)] hover:bg-[var(--surface2)]/60 transition-colors">
                    <td className="px-3 py-3 font-mono text-[var(--text-muted)]">#{record.id}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.fecha}</td>
                    <td className="px-3 py-3 font-mono font-semibold whitespace-nowrap" style={{ color: accentColor }}>{record.material_part_number}</td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">{record.material_description}</td>
                    <td className="px-3 py-3 text-right font-semibold" style={{ color: accentColor }}>{record.cantidad}</td>
                    <td className="px-3 py-3 max-w-[260px] text-[var(--text)]">{record.motivo}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.quien_pide}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.entrego}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => void handleToggleReviewed(record)}
                        disabled={reviewingId !== null || isLoading || isSearchingAll || isSavingAction}
                        aria-pressed={Boolean(record.revisado)}
                        aria-label={record.revisado ? `Marcar requisición ${record.id} como pendiente` : `Marcar requisición ${record.id} como revisada`}
                        title={record.revisado ? "Marcar como pendiente" : "Marcar como revisado"}
                        className="inline-flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className={`flex h-7 w-7 items-center justify-center rounded-md border-2 ${record.revisado ? "border-[#238636] bg-[#238636] text-white" : "border-[var(--border)] text-transparent hover:border-[#238636]"}`}>
                          {reviewingId === record.id ? <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" /> : record.revisado ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${record.revisado ? "text-[#3fb950]" : "text-[var(--text-muted)]"}`}>
                          {record.revisado && <Lock className="h-3 w-3" />}
                          {record.revisado ? "Revisado" : "Pendiente"}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActionTarget({ mode: "edit", record })}
                          disabled={Boolean(record.revisado) || isSavingAction || isLoading}
                          title={record.revisado ? "Requisición revisada: desmárcala para editar" : "Editar requisición"}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-[var(--surface2)] disabled:opacity-50"
                          style={{ borderColor: `${accentColor}70`, color: accentColor }}
                          aria-label={`Editar requisición ${record.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTarget({ mode: "delete", record })}
                          disabled={Boolean(record.revisado) || isSavingAction || isLoading}
                          title={record.revisado ? "Requisición revisada: desmárcala para eliminar" : "Eliminar requisición"}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--danger)]/40 px-2 py-1 text-xs font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10 disabled:opacity-50"
                          aria-label={`Eliminar requisición ${record.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={record.id != null && selectedIds.has(record.id)}
                        onChange={() => handleToggleRowSelection(record)}
                        disabled={record.id == null || isDownloading}
                        aria-label={`Seleccionar requisición ${record.id} para descargar`}
                        title={`Seleccionar requisición ${record.id}`}
                        className="h-4 w-4 rounded accent-[#a371f7]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>
                Mostrando {startIndex}–{endIndex} de {displayTotal} requisiciones
              </span>
              <label htmlFor="material-requests-page-size" className="ml-1">Filas por página</label>
              <select
                id="material-requests-page-size"
                value={pageSize}
                onChange={event => {
                  setPageSize(Number(event.target.value));
                  setPageIndex(0);
                }}
                className="field-input !w-auto !py-1.5 !px-2 text-xs"
                aria-label="Filas por página"
              >
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>

            <nav className="flex flex-wrap items-center justify-start gap-1 sm:justify-end" aria-label="Paginación de requisiciones">
              <button
                type="button"
                onClick={() => setPageIndex(0)}
                disabled={isFirstPage || isLoading}
                className="btn-ghost border border-[var(--border)] px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Ir a la primera página"
              >
                Primera
              </button>
              <button
                type="button"
                onClick={() => setPageIndex(page => Math.max(0, page - 1))}
                disabled={isFirstPage || isLoading}
                className="btn-ghost border border-[var(--border)] px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Página anterior"
              >
                Anterior
              </button>
              <span className="px-2 text-xs text-[var(--text-muted)]" aria-live="polite">
                Página {pageIndex + 1} de {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex(page => Math.min(pageCount - 1, page + 1))}
                disabled={isLastPage || isLoading}
                className="btn-ghost border border-[var(--border)] px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Página siguiente"
              >
                Siguiente
              </button>
              <button
                type="button"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={isLastPage || isLoading}
                className="btn-ghost border border-[var(--border)] px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Ir a la última página"
              >
                Última
              </button>
            </nav>
          </div>
        </div>
      )}
    </section>
  );
}
