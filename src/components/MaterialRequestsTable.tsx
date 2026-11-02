import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Download, Loader2, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { toast } from "sonner";
import {
  deleteMaterialRequest,
  listAllMaterialRequests,
  listMaterialRequests,
  type MaterialRequest,
  updateMaterialRequest,
} from "../lib/supabase";
import { MaterialRequestActionDialog, type EditableMaterialRequest } from "./MaterialRequestActionDialog";

interface Props {
  refreshKey: number;
  accentColor: string;
}

type ActionTarget = {
  mode: "edit" | "delete";
  record: MaterialRequest;
};

const escapeCsv = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return `"${text.split('"').join('""')}"`;
};

function downloadCsv(records: MaterialRequest[]) {
  const headers = [
    "ID",
    "Fecha",
    "Material / Part Number",
    "Descripción",
    "Cantidad",
    "Motivo",
    "Quién pide",
    "Entregó",
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
  ]);
  const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `requisiciones_material_${new Date().toISOString().slice(0, 10)}.csv`;
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
  ].join(" ");
  return normalizeSearch(text).includes(query);
}

export function MaterialRequestsTable({ refreshKey, accentColor }: Props) {
  const [records, setRecords] = useState<MaterialRequest[]>([]);
  const [allRecords, setAllRecords] = useState<MaterialRequest[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const normalizedQuery = normalizeSearch(debouncedSearchQuery);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setRecords(await listMaterialRequests(50));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, refreshKey]);

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
    if (!normalizedQuery) return records;
    return (allRecords ?? records).filter(record => recordMatches(record, normalizedQuery));
  }, [records, allRecords, normalizedQuery]);

  const totalQuantity = useMemo(
    () => records.reduce((total, record) => total + Number(record.cantidad || 0), 0),
    [records]
  );
  const filteredQuantity = useMemo(
    () => filteredRecords.reduce((total, record) => total + Number(record.cantidad || 0), 0),
    [filteredRecords]
  );

  const handleRefresh = () => {
    setAllRecords(null);
    setSearchRefreshKey(key => key + 1);
    void loadRecords();
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
        setActionTarget(null);
        setAllRecords(null);
        setSearchRefreshKey(key => key + 1);
        toast.success("Requisición eliminada", {
          description: "Los datos anteriores y el motivo quedaron guardados en la auditoría.",
        });
      }
      await loadRecords();
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
        ? `${filteredRecords.length} coincidencias de ${allRecords.length} requisiciones · ${filteredQuantity} piezas`
        : "Preparando búsqueda..."
    : `Últimas ${records.length} requisiciones · ${totalQuantity} piezas solicitadas`;
  const isBusy = isLoading || (searching && isSearchingAll);

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
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Buscar por ID, fecha, material..."
            autoComplete="off"
            className="field-input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
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
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm min-w-[1120px]">
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
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record.id} className="border-t border-[var(--border)] hover:bg-[var(--surface2)]/60 transition-colors">
                  <td className="px-3 py-3 font-mono text-[var(--text-muted)]">#{record.id}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.fecha}</td>
                  <td className="px-3 py-3 font-mono font-semibold whitespace-nowrap" style={{ color: accentColor }}>{record.material_part_number}</td>
                  <td className="px-3 py-3 text-[var(--text-muted)]">{record.material_description}</td>
                  <td className="px-3 py-3 text-right font-semibold" style={{ color: accentColor }}>{record.cantidad}</td>
                  <td className="px-3 py-3 max-w-[260px] text-[var(--text)]">{record.motivo}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.quien_pide}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--text)]">{record.entrego}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActionTarget({ mode: "edit", record })}
                        disabled={isSavingAction || isLoading}
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
                        disabled={isSavingAction || isLoading}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--danger)]/40 px-2 py-1 text-xs font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10 disabled:opacity-50"
                        aria-label={`Eliminar requisición ${record.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
