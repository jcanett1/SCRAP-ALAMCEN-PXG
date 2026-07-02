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
  revisado boolean NOT NULL DEFAULT false,
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
  revisado boolean NOT NULL DEFAULT false,
  CONSTRAINT scrap_pxg_componentes_proveedor_pkey PRIMARY KEY (id)
);
`;

// SQL para agregar la columna revisado a tablas existentes
const SQL_ALTER_PROCESO = `
ALTER TABLE public.scrap_pxg_componentes_proceso
  ADD COLUMN IF NOT EXISTS revisado boolean NOT NULL DEFAULT false;
`;

const SQL_ALTER_PROVEEDOR = `
ALTER TABLE public.scrap_pxg_componentes_proveedor
  ADD COLUMN IF NOT EXISTS revisado boolean NOT NULL DEFAULT false;
`;

// Intentar via rpc exec_sql si existe
async function tryRpc(sql, label) {
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.log(`[${label}] RPC exec_sql falló: ${error.message}`);
    return false;
  }
  console.log(`[${label}] Ejecutado correctamente via RPC`);
  return true;
}

// Verificar si la tabla ya existe intentando hacer un select
async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select("id").limit(1);
  return !error;
}

// Verificar si la columna revisado ya existe
async function columnExists(tableName) {
  const { data, error } = await supabase.from(tableName).select("revisado").limit(1);
  return !error;
}

async function main() {
  console.log("Verificando tablas en Supabase...\n");

  const procesoExists = await tableExists("scrap_pxg_componentes_proceso");
  const proveedorExists = await tableExists("scrap_pxg_componentes_proveedor");

  console.log(`scrap_pxg_componentes_proceso: ${procesoExists ? "✓ EXISTE" : "✗ NO EXISTE"}`);
  console.log(`scrap_pxg_componentes_proveedor: ${proveedorExists ? "✓ EXISTE" : "✗ NO EXISTE"}`);

  if (!procesoExists || !proveedorExists) {
    console.log("\nLas tablas deben crearse manualmente en el panel de Supabase.");
    console.log("Ve a: https://supabase.com/dashboard/project/hckbtzbcmijdstyazwoz/editor");
    console.log("\nEjecuta el siguiente SQL:\n");
    if (!procesoExists) console.log(SQL_PROCESO);
    if (!proveedorExists) console.log(SQL_PROVEEDOR);
    return;
  }

  // Verificar y agregar columna revisado si no existe
  console.log("\nVerificando columna 'revisado'...");

  const procesoHasRevisado = await columnExists("scrap_pxg_componentes_proceso");
  const proveedorHasRevisado = await columnExists("scrap_pxg_componentes_proveedor");

  console.log(`  scrap_pxg_componentes_proceso.revisado: ${procesoHasRevisado ? "✓ EXISTE" : "✗ NO EXISTE"}`);
  console.log(`  scrap_pxg_componentes_proveedor.revisado: ${proveedorHasRevisado ? "✓ EXISTE" : "✗ NO EXISTE"}`);

  if (procesoHasRevisado && proveedorHasRevisado) {
    console.log("\n✓ Todas las columnas están al día. No se requiere acción.");
    return;
  }

  console.log("\nSe necesita agregar la columna 'revisado'. Intentando via RPC...\n");

  if (!procesoHasRevisado) {
    const ok = await tryRpc(SQL_ALTER_PROCESO, "ALTER proceso");
    if (!ok) {
      console.log("\nEjecuta manualmente en el panel de Supabase:");
      console.log(SQL_ALTER_PROCESO);
    }
  }

  if (!proveedorHasRevisado) {
    const ok = await tryRpc(SQL_ALTER_PROVEEDOR, "ALTER proveedor");
    if (!ok) {
      console.log("\nEjecuta manualmente en el panel de Supabase:");
      console.log(SQL_ALTER_PROVEEDOR);
    }
  }
}

main().catch(console.error);
