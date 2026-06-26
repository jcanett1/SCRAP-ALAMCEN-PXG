import { Loader2, RefreshCw, Database, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}

interface ScrapRecordsTableProps {
  records: ScrapRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  tableLabel: string;
}

export function ScrapRecordsTable({
  records,
  isLoading,
  onRefresh,
  tableLabel,
}: ScrapRecordsTableProps) {
  return (
    <div className="animate-fade-in">
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
        </div>
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
              {records.map((record, idx) => (
                <tr
                  key={record.id}
                  className={`
                    border-t border-border transition-colors duration-150
                    hover:bg-secondary/40
                    ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"}
                  `}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground">#{record.id}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-foreground text-xs whitespace-nowrap">
                      {record.num_orden ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {record.hora ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-foreground/80 whitespace-nowrap">
                      {record.serial_number ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-foreground/80 whitespace-nowrap">
                      {record.inventory_id ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold border-primary/30 text-primary bg-primary/5"
                    >
                      {record.qty ?? 0}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                      {record.reason_code ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-foreground/80">{record.celda ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-foreground/80 whitespace-nowrap">
                      {record.supervisor ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {record.captura ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
