import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error("ERROR: SUPABASE_URL o SUPABASE_KEY no están configuradas");
  process.exit(1);
}

const supabase = createClient(url, key);

const SQL_PROCESO = `
CREATE TABLE IF NOT EXISTS public.scrap_pxg_componentes_proceso (
  id serial NOT NULL,
  num_orden text NULL,
  hora text NULL,
  serial_number text NULL,
  inventory_id text NULL,
  qty integer NULL,
  reason text NULL,
  reason_code text NULL,
  description text NULL,
  celda text NULL,
  supervisor text NULL,
  autorizo text NULL,
  captura text NULL,
  CONSTRAINT scrap_pxg_componentes_proceso_pkey PRIMARY KEY (id)
);
`;

const SQL_PROVEEDOR = `
CREATE TABLE IF NOT EXISTS public.scrap_pxg_componentes_proveedor (
  id serial NOT NULL,
  num_orden text NULL,
  hora text NULL,
  serial_number text NULL,
  inventory_id text NULL,
  qty integer NULL,
  reason text NULL,
  reason_code text NULL,
  description text NULL,
  celda text NULL,
  supervisor text NULL,
  autorizo text NULL,
  captura text NULL,
  CONSTRAINT scrap_pxg_componentes_proveedor_pkey PRIMARY KEY (id)
);
`;

// Intentar via rpc exec_sql si existe
async function tryRpc(sql, label) {
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.log(`[${label}] RPC exec_sql falló: ${error.message}`);
    return false;
  }
  console.log(`[${label}] Creada correctamente via RPC`);
  return true;
}

// Verificar si la tabla ya existe intentando hacer un select
async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select("id").limit(1);
  return !error;
}

async function main() {
  console.log("Verificando tablas en Supabase...\n");

  const procesoExists = await tableExists("scrap_pxg_componentes_proceso");
  const proveedorExists = await tableExists("scrap_pxg_componentes_proveedor");

  console.log(`scrap_pxg_componentes_proceso: ${procesoExists ? "✓ EXISTE" : "✗ NO EXISTE"}`);
  console.log(`scrap_pxg_componentes_proveedor: ${proveedorExists ? "✓ EXISTE" : "✗ NO EXISTE"}`);

  if (procesoExists && proveedorExists) {
    console.log("\n✓ Ambas tablas ya existen. No se requiere acción.");
    return;
  }

  console.log("\nLas tablas deben crearse manualmente en el panel de Supabase.");
  console.log("Ve a: https://supabase.com/dashboard/project/bdrxcilsuxbkpmolfbgu/editor");
  console.log("\nEjecuta el siguiente SQL:\n");
  console.log(SQL_PROCESO);
  console.log(SQL_PROVEEDOR);
}

main().catch(console.error);
