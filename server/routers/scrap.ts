import { publicProcedure, router } from "../_core/trpc";
import { supabase } from "../supabase";
import { z } from "zod";

// Schema de validación compartido para ambas tablas
const scrapSchema = z.object({
  num_orden: z.string().min(1, "Número de orden es requerido"),
  hora: z.string().min(1, "Hora es requerida"),
  serial_number: z.string().min(1, "Serial number es requerido"),
  inventory_id: z.string().min(1, "Inventory ID es requerido"),
  qty: z.number().int().min(1, "La cantidad debe ser mayor a 0"),
  reason: z.string().min(1, "Razón es requerida"),
  reason_code: z.string().min(1, "Código de razón es requerido"),
  description: z.string().min(1, "Descripción es requerida"),
  celda: z.string().min(1, "Celda es requerida"),
  supervisor: z.string().min(1, "Supervisor es requerido"),
  autorizo: z.string().min(1, "Autorizó es requerido"),
  captura: z.string().min(1, "Captura es requerida"),
});

const listInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

export const scrapRouter = router({
  proceso: router({
    insert: publicProcedure
      .input(scrapSchema)
      .mutation(async ({ input }) => {
        const { data, error } = await supabase
          .from("scrap_pxg_componentes_proceso")
          .insert([input])
          .select()
          .single();

        if (error) {
          throw new Error(`Error al insertar registro de proceso: ${error.message}`);
        }

        return { success: true, record: data };
      }),

    list: publicProcedure
      .input(listInputSchema)
      .query(async ({ input }) => {
        const { data, error } = await supabase
          .from("scrap_pxg_componentes_proceso")
          .select("*")
          .order("id", { ascending: false })
          .limit(input.limit);

        if (error) {
          throw new Error(`Error al consultar registros de proceso: ${error.message}`);
        }

        return data ?? [];
      }),
  }),

  proveedor: router({
    insert: publicProcedure
      .input(scrapSchema)
      .mutation(async ({ input }) => {
        const { data, error } = await supabase
          .from("scrap_pxg_componentes_proveedor")
          .insert([input])
          .select()
          .single();

        if (error) {
          throw new Error(`Error al insertar registro de proveedor: ${error.message}`);
        }

        return { success: true, record: data };
      }),

    list: publicProcedure
      .input(listInputSchema)
      .query(async ({ input }) => {
        const { data, error } = await supabase
          .from("scrap_pxg_componentes_proveedor")
          .select("*")
          .order("id", { ascending: false })
          .limit(input.limit);

        if (error) {
          throw new Error(`Error al consultar registros de proveedor: ${error.message}`);
        }

        return data ?? [];
      }),
  }),
});
