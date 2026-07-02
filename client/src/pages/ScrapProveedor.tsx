import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ScrapForm, ScrapFormValues } from "@/components/ScrapForm";
import { ScrapRecordsTable } from "@/components/ScrapRecordsTable";
import { Separator } from "@/components/ui/separator";

const TABLE_NAME = "scrap_pxg_componentes_proveedor";

export default function ScrapProveedor() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: records = [], isLoading: isLoadingRecords, refetch } =
    trpc.scrap.proveedor.list.useQuery({ limit: 20 });

  const insertMutation = trpc.scrap.proveedor.insert.useMutation({
    onSuccess: () => {
      toast.success("Registro guardado correctamente", {
        description: `El registro fue insertado en ${TABLE_NAME}`,
        duration: 4000,
      });
      void refetch();
    },
    onError: (error) => {
      toast.error("Error al guardar el registro", {
        description: error.message,
        duration: 6000,
      });
    },
  });

  const handleSubmit = async (data: ScrapFormValues) => {
    setIsSubmitting(true);
    try {
      await insertMutation.mutateAsync({
        ...data,
        qty: Number(data.qty),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <ScrapForm
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          tableLabel={TABLE_NAME}
        />
      </div>

      <Separator className="bg-border/50" />

      {/* Tabla de registros */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <ScrapRecordsTable
          records={records}
          isLoading={isLoadingRecords}
          onRefresh={() => void refetch()}
          tableLabel={TABLE_NAME}
          tableType="proveedor"
        />
      </div>
    </div>
  );
}
