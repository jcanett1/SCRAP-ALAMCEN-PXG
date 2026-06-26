import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[Supabase] SUPABASE_URL y SUPABASE_KEY son requeridas. Verifica las variables de entorno."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos para las tablas de scrap
export interface ScrapComponente {
  id?: number;
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

export type ScrapComponenteInsert = Omit<ScrapComponente, "id">;
