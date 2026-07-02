"""
Script para agregar la columna 'revisado' a las tablas de scrap en Supabase.
Usa la API REST de Supabase directamente.
"""
import os
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# SQL para agregar la columna revisado
ALTER_SQLS = [
    (
        "scrap_pxg_componentes_proceso",
        "ALTER TABLE public.scrap_pxg_componentes_proceso ADD COLUMN IF NOT EXISTS revisado boolean NOT NULL DEFAULT false;"
    ),
    (
        "scrap_pxg_componentes_proveedor",
        "ALTER TABLE public.scrap_pxg_componentes_proveedor ADD COLUMN IF NOT EXISTS revisado boolean NOT NULL DEFAULT false;"
    ),
]

def run_sql(sql, label):
    """Ejecutar SQL via Supabase RPC exec_sql."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"sql": sql},
    )
    if resp.status_code in (200, 204):
        print(f"  ✓ [{label}] Columna agregada correctamente")
        return True
    else:
        print(f"  ✗ [{label}] Error: {resp.status_code} - {resp.text}")
        return False

def check_column(table):
    """Verificar si la columna revisado ya existe."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}?select=revisado&limit=1",
        headers=headers,
    )
    return resp.status_code == 200

print("=== Verificando columna 'revisado' en tablas de scrap ===\n")

for table, sql in ALTER_SQLS:
    exists = check_column(table)
    if exists:
        print(f"  ✓ [{table}] Columna 'revisado' ya existe")
    else:
        print(f"  → [{table}] Columna 'revisado' no existe, agregando...")
        ok = run_sql(sql, table)
        if not ok:
            print(f"\n  MANUAL: Ejecuta en el panel de Supabase:")
            print(f"  {sql}\n")

print("\n=== Listo ===")
