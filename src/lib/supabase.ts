import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://placeholder.supabase.co";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ?? "placeholder-key";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Tipos de las tablas ───────────────────────────────────────────────────────
export interface ScrapRecord {
  id?: number;
  num_orden: string;
  hora: string;
  serial_number: string;
  inventory_id: string;
  qty: number;
  reason: string;
  reason_code: string;
  description: string;
  celda: string;
  supervisor: string;
  autorizo: string;
  captura: string;
  revisado?: boolean | null;
}

export interface InventoryItem {
  inventory_id: string;
  description: string | null;
}

export type MaterialRequester =
  | "CELDA 11"
  | "CELDA 10"
  | "CELDA 16"
  | "CELDA 15"
  | "PREP AREA"
  | "TECNICOS"
  | "INGENIERIA";

export type MaterialDeliverer = "DENISSE SANZARRIC" | "YODELI LOPEZ";

export interface MaterialRequest {
  id?: number;
  fecha: string;
  material_part_number: string;
  material_description: string;
  cantidad: number;
  motivo: string;
  quien_pide: MaterialRequester;
  entrego: MaterialDeliverer;
  created_at?: string;
  updated_at?: string;
}

// ── Helpers de acceso a datos ─────────────────────────────────────────────────
export async function insertScrap(
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor",
  record: Omit<ScrapRecord, "id">
) {
  const { data, error } = await supabase.from(table).insert([record]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listScrap(
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor",
  limit = 20
): Promise<ScrapRecord[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ScrapRecord[];
}

export async function listAllScrap(
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor"
): Promise<ScrapRecord[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScrapRecord[];
}

export async function listScrapByDate(
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor",
  dateFrom: string,
  dateTo: string
): Promise<ScrapRecord[]> {
  // El campo hora contiene "YYYY-MM-DD HH:MM" — filtramos por prefijo de fecha
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .gte("hora", dateFrom)
    .lte("hora", dateTo + " 23:59")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScrapRecord[];
}

export async function updateScrap(
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor",
  id: number,
  record: Omit<ScrapRecord, "id">
) {
  const { error } = await supabase.from(table).update(record).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteScrap(
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor",
  id: number
) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleRevisado(
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor",
  id: number,
  revisado: boolean
) {
  const { error } = await supabase.from(table).update({ revisado }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function searchInventory(
  query: string,
  limit = 30,
  offset = 0
): Promise<{ items: InventoryItem[]; total: number }> {
  const trimmed = query.trim();
  let req = supabase
    .from("pxg_inventory_catalog")
    .select("inventory_id, description", { count: "exact" })
    .order("inventory_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (trimmed) {
    req = req.or(
      `inventory_id.ilike.${trimmed}%,description.ilike.%${trimmed}%`
    );
  }

  const { data, error, count } = await req;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as InventoryItem[], total: count ?? 0 };
}

export async function insertMaterialRequest(
  record: Omit<MaterialRequest, "id" | "created_at" | "updated_at">
): Promise<MaterialRequest> {
  const { data, error } = await supabase
    .from("requisiciones_material")
    .insert([record])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as MaterialRequest;
}

export async function listMaterialRequests(limit = 50): Promise<MaterialRequest[]> {
  const { data, error } = await supabase
    .from("requisiciones_material")
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as MaterialRequest[];
}

export async function listAllMaterialRequests(): Promise<MaterialRequest[]> {
  const { data, error } = await supabase
    .from("requisiciones_material")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MaterialRequest[];
}
