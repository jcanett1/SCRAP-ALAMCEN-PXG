import { useState } from "react";
import { Loader2, RefreshCw, Database, AlertCircle, Lock, Unlock, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ScrapRecord {
  id: number;
  num_orden: string | null;
  hora: string | null;
  serial_number: string | null;
  inventory_id: string | null;
  qty: number | null;
  reason: string | null;
  reason_code: string | null;
  description: string | null;
  celda: string | null;
  supervisor: string | null;
  autorizo: string | null;
  captura: string | null;
  revisado?: boolean | null;
}

type TableType = "proceso" | "proveedor";

interface ScrapRecordsTableProps {
  records: ScrapRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  tableLabel: string;
  tableType: TableType;
}

// ─── Utilidad CSV ─────────────────────────────────────────────────────────────

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function recordsToCsv(data: ScrapRecord[]): string {
  const headers = [
    "ID", "Num Orden", "Hora", "Serial Number", "Inventory ID",
    "QTY", "Razón", "Código Razón", "Descripción", "Celda",
    "Supervisor", "Autorizó", "Captura", "Revisado",
  ];

  const rows = data.map((r) =>
    [
      r.id,
      r.num_orden,
      r.hora,
      r.serial_number,
      r.inventory_id,
      r.qty,
      r.reason,
      r.reason_code,
      r.description,
      r.celda,
      r.supervisor,
      r.autorizo,
      r.captura,
      r.revisado ? "Sí" : "No",
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(content: string, filename: string) {
  const bom = "\uFEFF"; // BOM para compatibilidad con Excel
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Botón de descarga global ─────────────────────────────────────────────────

interface GlobalDownloadButtonProps {
  tableType: TableType;
  tableLabel: string;
}

function GlobalDownloadButton({ tableType, tableLabel }: GlobalDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const listAllProceso = trpc.scrap.proceso.listAll.useQuery(undefined, {
    enabled: false,
  });

  const listAllProveedor = trpc.scrap.proveedor.listAll.useQuery(undefined, {
    enabled: false,
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let data: ScrapRecord[] = [];

      if (tableType === "proceso") {
        const result = await listAllProceso.refetch();
        data = result.data ?? [];
      } else {
        const result = await listAllProveedor.refetch();
        data = result.data ?? [];
      }

      if (data.length === 0) {
        toast.info("Sin registros para descargar", {
          description: "No hay datos en la tabla para exportar.",
          duration: 3000,
        });
        return;
      }

      const csv = recordsToCsv(data);
      const fecha = new Date().toISOString().slice(0, 10);
      const filename = `${tableLabel}_${fecha}.csv`;
      downloadCsv(csv, filename);

      toast.success(`Descarga completada`, {
        description: `${data.length} registros exportados a ${filename}`,
        duration: 4000,
      });
    } catch (err) {
      toast.error("Error al descargar registros", {
        description: err instanceof Error ? err.message : "Error desconocido",
        duration: 6000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isDownloading}
      className="h-7 gap-1.5 text-xs border-emerald-500/40 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 hover:border-emerald-500/60 transition-colors"
      title="Descargar todos los registros como CSV"
    >
      {isDownloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {isDownloading ? "Descargando..." : "Descargar Todo"}
    </Button>
  );
}

// ─── Modal de contraseña ──────────────────────────────────────────────────────

interface UnlockModalProps {
  recordId: number;
  tableType: TableType;
  onSuccess: () => void;
  onCancel: () => void;
}

function UnlockModal({ recordId, tableType, onSuccess, onCancel }: UnlockModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const desbloquearProceso = trpc.scrap.proceso.desbloquear.useMutation({
    onSuccess: () => {
      toast.success("Registro desbloqueado correctamente");
      onSuccess();
    },
    onError: (err) => {
      setError(err.message.includes("Contraseña incorrecta")
        ? "Contraseña incorrecta. Intenta de nuevo."
        : err.message);
      setIsSubmitting(false);
    },
  });

  const desbloquearProveedor = trpc.scrap.proveedor.desbloquear.useMutation({
    onSuccess: () => {
      toast.success("Registro desbloqueado correctamente");
      onSuccess();
    },
    onError: (err) => {
      setError(err.message.includes("Contraseña incorrecta")
        ? "Contraseña incorrecta. Intenta de nuevo."
        : err.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Ingresa la contraseña de administrador.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    if (tableType === "proceso") {
      await desbloquearProceso.mutateAsync({ id: recordId, password });
    } else {
      await desbloquearProveedor.mutateAsync({ id: recordId, password });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in">
        {/* Ícono y título */}
        <div className="flex flex-col items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Unlock className="h-6 w-6 text-amber-500" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold text-foreground">Desbloquear Registro</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Registro <span className="font-mono font-semibold text-foreground">#{recordId}</span> está marcado como revisado.
              <br />Ingresa la contraseña de administrador para desbloquearlo.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Contraseña de administrador
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••••••"
              autoFocus
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  Desbloquear
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ScrapRecordsTable({
  records,
  isLoading,
  onRefresh,
  tableLabel,
  tableType,
}: ScrapRecordsTableProps) {
  const [unlockTarget, setUnlockTarget] = useState<number | null>(null);
  const [pendingCheck, setPendingCheck] = useState<number | null>(null);

  const marcarProceso = trpc.scrap.proceso.marcarRevisado.useMutation({
    onSuccess: () => {
      toast.success("Registro marcado como revisado y bloqueado", {
        description: "Para editar o eliminar este registro se requerirá contraseña.",
        duration: 4000,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      onRefresh();
    },
    onError: (err) => {
      toast.error("Error al actualizar el registro", { description: err.message });
    },
    onSettled: () => setPendingCheck(null),
  });

  const marcarProveedor = trpc.scrap.proveedor.marcarRevisado.useMutation({
    onSuccess: () => {
      toast.success("Registro marcado como revisado y bloqueado", {
        description: "Para editar o eliminar este registro se requerirá contraseña.",
        duration: 4000,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      onRefresh();
    },
    onError: (err) => {
      toast.error("Error al actualizar el registro", { description: err.message });
    },
    onSettled: () => setPendingCheck(null),
  });

  const handleCheckboxChange = (record: ScrapRecord, checked: boolean) => {
    if (record.revisado && !checked) {
      // Quiere desmarcar → pedir contraseña
      setUnlockTarget(record.id);
      return;
    }

    if (!record.revisado && checked) {
      // Quiere marcar como revisado → bloquear directamente
      setPendingCheck(record.id);
      if (tableType === "proceso") {
        marcarProceso.mutate({ id: record.id, revisado: true });
      } else {
        marcarProveedor.mutate({ id: record.id, revisado: true });
      }
    }
  };

  const handleUnlockSuccess = () => {
    setUnlockTarget(null);
    onRefresh();
  };

  return (
    <div className="animate-fade-in">
      {/* Modal de desbloqueo */}
      {unlockTarget !== null && (
        <UnlockModal
          recordId={unlockTarget}
          tableType={tableType}
          onSuccess={handleUnlockSuccess}
          onCancel={() => setUnlockTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Registros Recientes</h3>
          {records.length > 0 && (
            <Badge
              variant="secondary"
              className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
            >
              {records.length}
            </Badge>
          )}
          {/* Contador de revisados */}
          {records.some((r) => r.revisado) && (
            <Badge
              variant="secondary"
              className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 border-green-500/20 flex items-center gap-1"
            >
              <Lock className="h-2.5 w-2.5" />
              {records.filter((r) => r.revisado).length} revisado{records.filter((r) => r.revisado).length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          <GlobalDownloadButton tableType={tableType} tableLabel={tableLabel} />
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando registros...</p>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!isLoading && records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-lg">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Sin registros</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Los registros de <span className="font-mono">{tableLabel}</span> aparecerán aquí
          </p>
        </div>
      )}

      {/* Tabla */}
      {!isLoading && records.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                {/* Columna Revisado */}
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap w-20">
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Revisado
                  </span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">ID</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Orden</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Hora</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Serial</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Inv. ID</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">QTY</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Código</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Celda</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Supervisor</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Captura</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => {
                const isRevisado = Boolean(record.revisado);
                const isPending = pendingCheck === record.id;

                return (
                  <tr
                    key={record.id}
                    className={`
                      border-t border-border transition-colors duration-150
                      ${isRevisado
                        ? "bg-green-500/5 hover:bg-green-500/10"
                        : idx % 2 === 0
                          ? "bg-transparent hover:bg-secondary/40"
                          : "bg-muted/10 hover:bg-secondary/40"
                      }
                    `}
                  >
                    {/* Celda Revisado */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <div className="relative group flex items-center justify-center">
                            <Checkbox
                              checked={isRevisado}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(record, Boolean(checked))
                              }
                              className={`
                                h-4 w-4 transition-all duration-200
                                ${isRevisado
                                  ? "border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                  : "border-border hover:border-primary"
                                }
                              `}
                            />
                            {isRevisado && (
                              <Lock className="h-2.5 w-2.5 text-green-600 ml-1 flex-shrink-0" />
                            )}
                          </div>
                        )}
                      </div>
                      {isRevisado && (
                        <span className="block text-[10px] text-green-600 font-medium mt-0.5 leading-none">
                          Bloqueado
                        </span>
                      )}
                    </td>

                    {/* Resto de columnas — opacidad reducida si está bloqueado */}
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="font-mono text-xs text-muted-foreground">#{record.id}</span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="font-medium text-foreground text-xs whitespace-nowrap">
                        {record.num_orden ?? "—"}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {record.hora ?? "—"}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="font-mono text-xs text-foreground/80 whitespace-nowrap">
                        {record.serial_number ?? "—"}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="font-mono text-xs text-foreground/80 whitespace-nowrap">
                        {record.inventory_id ?? "—"}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold border-primary/30 text-primary bg-primary/5"
                      >
                        {record.qty ?? 0}
                      </Badge>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                        {record.reason_code ?? "—"}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="text-xs text-foreground/80">{record.celda ?? "—"}</span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="text-xs text-foreground/80 whitespace-nowrap">
                        {record.supervisor ?? "—"}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 ${isRevisado ? "opacity-60" : ""}`}>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {record.captura ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda */}
      {records.length > 0 && (
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Marcar como revisado bloquea el registro
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-amber-500" />
            Desbloquear requiere contraseña de administrador
          </span>
        </div>
      )}
    </div>
  );
}
