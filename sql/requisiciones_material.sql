-- Catálogo de materiales y tabla de requisiciones para Supabase/PostgreSQL.
-- Ejecuta este archivo completo en Supabase > SQL Editor.

create table if not exists public.requisiciones_material_catalogo (
  part_number text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

insert into public.requisiciones_material_catalogo (part_number, description)
values
  ('A-SHAFT-ADAPTER-DRIV', 'Driver Shaft Adapter RH'),
  ('A-SHAFT-ADAPTER-HYB', 'Hybrid Shaft Adapter RH'),
  ('A-SHAFT-ADPTR-DRIVLH', 'Driver Shaft Adapter LH'),
  ('A-SHAFT-ADPTR-HYBLH', 'Hybrid Shaft Adapter LH'),
  ('A-SHAFT-CTR-PC', 'Shaft Centering Pieces'),
  ('A-SSWEIGHT-25G', 'SuperStroke 25G Weight'),
  ('A-SSWEIGHT-50G', 'SuperStroke 50G Weight'),
  ('A-TORQUETOOL', 'TorqueTool-Woods/Hybrids'),
  ('A-TORQUETOOL-GEN4IR', 'T20 Tamper Proof Torque Wrench (GEN4 Irons)'),
  ('T-DISCWEIGHT-10G', '10g Disc Weight'),
  ('T-DISCWEIGHT-12.5G', '12.5g Disc Weight'),
  ('T-DISCWEIGHT-15G', '15g Disc Weight'),
  ('T-DISCWEIGHT-17.5G', '17.5g Disc Weight'),
  ('T-DISCWEIGHT-2.5G-TI', '2.5g Ti Disc Weight'),
  ('T-DISCWEIGHT-20G', '20g Disc Weight'),
  ('T-DISCWEIGHT-5G', '5g Disc Weight'),
  ('T-DISCWEIGHT-7.5G', '7.5g Disc Weight'),
  ('T-FERRULE-IRON-355', '.355 ID Iron Ferrule (MF9017C-15.24*14.2)'),
  ('T-FERRULE-IRON-360', '.360 ID Iron Ferrule (MF914C-15.24*14.2)'),
  ('T-FERRULE-PUTTER', 'Putter Ferrule (F80C-2.54*9.65)'),
  ('T-FERRULE-WEDGE-355', '.355 ID Wedge Ferrule (MF9017C-15.9*14.7)'),
  ('T-FERRULE-WEDGE-360', '.360 ID Wedge Ferrule (MF914C-15.9*14.7)'),
  ('T-G4IRONWGHT-10.5G', 'Iron Weight Black- 10.5g'),
  ('T-G4IRONWGHT-10G', 'Iron Weight Black- 10g'),
  ('T-G4IRONWGHT-11.5G', 'Iron Weight Black- 11.5g'),
  ('T-G4IRONWGHT-11G', 'Iron Weight Black- 11g'),
  ('T-G4IRONWGHT-12.5G', 'Iron Weight Black- 12.5g'),
  ('T-G4IRONWGHT-12G', 'Iron Weight Black- 12g'),
  ('T-G4IRONWGHT-13.5G', 'Iron Weight Black- 13.5g'),
  ('T-G4IRONWGHT-13G', 'Iron Weight Black- 13g'),
  ('T-G4IRONWGHT-14.5G', 'Iron Weight Black- 14.5g'),
  ('T-G4IRONWGHT-14G', 'Iron Weight Black- 14g'),
  ('T-G4IRONWGHT-15.5G', 'Iron Weight Black- 15.5g'),
  ('T-G4IRONWGHT-15G', 'Iron Weight Black- 15g'),
  ('T-G4IRONWGHT-16.5G', 'Iron Weight Black- 16.5g'),
  ('T-G4IRONWGHT-16G', 'Iron Weight Black- 16g'),
  ('T-G4IRONWGHT-17.5G', 'Iron Weight Black- 17.5g'),
  ('T-G4IRONWGHT-17G', 'Iron Weight Black- 17g'),
  ('T-G4IRONWGHT-18G', 'Iron Weight Black- 18g'),
  ('T-G4IRONWGHT-2.5G', 'Iron Weight Black- 2.5g'),
  ('T-G4IRONWGHT-3.5G', 'Iron Weight Black- 3.5g'),
  ('T-G4IRONWGHT-3G', 'Iron Weight Black- 3g'),
  ('T-G4IRONWGHT-4.5G', 'Iron Weight Black- 4.5g'),
  ('T-G4IRONWGHT-4G', 'Iron Weight Black- 4g'),
  ('T-G4IRONWGHT-5.5G', 'Iron Weight Black- 5.5g'),
  ('T-G4IRONWGHT-5G', 'Iron Weight Black- 5g'),
  ('T-G4IRONWGHT-6.5G', 'Iron Weight Black- 6.5g'),
  ('T-G4IRONWGHT-6G', 'Iron Weight Black- 6g'),
  ('T-G4IRONWGHT-7.5G', 'Iron Weight Black- 7.5g'),
  ('T-G4IRONWGHT-7G', 'Iron Weight Black- 7g'),
  ('T-G4IRONWGHT-8.5G', 'Iron Weight Black- 8.5g'),
  ('T-G4IRONWGHT-8G', 'Iron Weight Black- 8g'),
  ('T-G4IRONWGHT-9.5G', 'Iron Weight Black- 9.5g'),
  ('T-G4IRONWGHT-9G', 'Iron Weight Black- 9g'),
  ('T-G4IRONWGHT-SIL-10.5G', 'Iron Weight Silver- 10.5g'),
  ('T-G4IRONWGHT-SIL-10G', 'Iron Weight Silver- 10g'),
  ('T-G4IRONWGHT-SIL-11.5G', 'Iron Weight Silver- 11.5g'),
  ('T-G4IRONWGHT-SIL-11G', 'Iron Weight Silver- 11g'),
  ('T-G4IRONWGHT-SIL-12.5G', 'Iron Weight Silver- 12.5g'),
  ('T-G4IRONWGHT-SIL-12G', 'Iron Weight Silver- 12g'),
  ('T-G4IRONWGHT-SIL-13.5G', 'Iron Weight Silver- 13.5g'),
  ('T-G4IRONWGHT-SIL-13G', 'Iron Weight Silver- 13g'),
  ('T-G4IRONWGHT-SIL-14.5G', 'Iron Weight Silver- 14.5g'),
  ('T-G4IRONWGHT-SIL-14G', 'Iron Weight Silver- 14g'),
  ('T-G4IRONWGHT-SIL-15.5G', 'Iron Weight Silver- 15.5g'),
  ('T-G4IRONWGHT-SIL-15G', 'Iron Weight Silver- 15g'),
  ('T-G4IRONWGHT-SIL-16.5G', 'Iron Weight Silver- 16.5g'),
  ('T-G4IRONWGHT-SIL-16G', 'Iron Weight Silver- 16g'),
  ('T-G4IRONWGHT-SIL-17.5G', 'Iron Weight Silver- 17.5g'),
  ('T-G4IRONWGHT-SIL-17G', 'Iron Weight Silver- 17g'),
  ('T-G4IRONWGHT-SIL-18G', 'Iron Weight Silver- 18g'),
  ('T-G4IRONWGHT-SIL-3.5G', 'Iron Weight Silver- 3.5g'),
  ('T-G4IRONWGHT-SIL-3G', 'Iron Weight Silver- 3g'),
  ('T-G4IRONWGHT-SIL-4.5G', 'Iron Weight Silver- 4.5g'),
  ('T-G4IRONWGHT-SIL-4G', 'Iron Weight Silver- 4g'),
  ('T-G4IRONWGHT-SIL-5.5G', 'Iron Weight Silver- 5.5g'),
  ('T-G4IRONWGHT-SIL-5G', 'Iron Weight Silver- 5g'),
  ('T-G4IRONWGHT-SIL-6.5G', 'Iron Weight Silver- 6.5g'),
  ('T-G4IRONWGHT-SIL-6G', 'Iron Weight Silver- 6g'),
  ('T-G4IRONWGHT-SIL-7.5G', 'Iron Weight Silver- 7.5g'),
  ('T-G4IRONWGHT-SIL-7G', 'Iron Weight Silver- 7g'),
  ('T-G4IRONWGHT-SIL-8.5G', 'Iron Weight Silver- 8.5g'),
  ('T-G4IRONWGHT-SIL-8G', 'Iron Weight Silver- 8g'),
  ('T-G4IRONWGHT-SIL-9.5G', 'Iron Weight Silver- 9.5g'),
  ('T-G4IRONWGHT-SIL-9G', 'Iron Weight Silver- 9g'),
  ('T-GEN8IRWGT-BLK-10G', 'GEN8 Iron Weight - Black - 10g'),
  ('T-GEN8IRWGT-BLK-11G', 'GEN8 Iron Weight - Black - 11g'),
  ('T-GEN8IRWGT-BLK-12G', 'GEN8 Iron Weight - Black - 12g'),
  ('T-GEN8IRWGT-BLK-2G', 'GEN8 Iron Weight - Black - 2g'),
  ('T-GEN8IRWGT-BLK-3G', 'GEN8 Iron Weight - Black - 3g'),
  ('T-GEN8IRWGT-BLK-4G', 'GEN8 Iron Weight - Black - 4g'),
  ('T-GEN8IRWGT-BLK-5G', 'GEN8 Iron Weight - Black - 5g'),
  ('T-GEN8IRWGT-BLK-6G', 'GEN8 Iron Weight - Black - 6g'),
  ('T-GEN8IRWGT-BLK-7G', 'GEN8 Iron Weight - Black - 7g'),
  ('T-GEN8IRWGT-BLK-8G', 'GEN8 Iron Weight - Black - 8g'),
  ('T-GEN8IRWGT-BLK-9G', 'GEN8 Iron Weight - Black - 9g'),
  ('T-GEN8IRWGT-SIL-10G', 'GEN8 Iron Weight - Silver - 10g'),
  ('T-GEN8IRWGT-SIL-11G', 'GEN8 Iron Weight - Silver - 11g'),
  ('T-GEN8IRWGT-SIL-12G', 'GEN8 Iron Weight - Silver - 12g'),
  ('T-GEN8IRWGT-SIL-2G', 'GEN8 Iron Weight - Silver - 2g'),
  ('T-GEN8IRWGT-SIL-3G', 'GEN8 Iron Weight - Silver - 3g'),
  ('T-GEN8IRWGT-SIL-4G', 'GEN8 Iron Weight - Silver - 4g'),
  ('T-GEN8IRWGT-SIL-5G', 'GEN8 Iron Weight - Silver - 5g'),
  ('T-GEN8IRWGT-SIL-6G', 'GEN8 Iron Weight - Silver - 6g'),
  ('T-GEN8IRWGT-SIL-7G', 'GEN8 Iron Weight - Silver - 7g'),
  ('T-GEN8IRWGT-SIL-8G', 'GEN8 Iron Weight - Silver - 8g'),
  ('T-GEN8IRWGT-SIL-9G', 'GEN8 Iron Weight - Silver - 9g'),
  ('T-IRON-FITTING-SLEEV', 'Fitting Head Iron Shaft Sleeve'),
  ('T-TIPWEIGHT-1G', 'Tip Weight- 1 gram'),
  ('T-TIPWEIGHT-2G', 'Tip Weight- 2 gram'),
  ('T-TIPWEIGHT-3G', 'Tip Weight- 3 gram'),
  ('T-TIPWEIGHT-4G', 'Tip Weight- 4 gram'),
  ('T-TIPWEIGHT-5G', 'Tip Weight- 5 gram'),
  ('T-TIPWEIGHT-6G', 'Tip Weight- 6 gram'),
  ('T-TIPWEIGHT-7G', 'Tip Weight- 7 gram'),
  ('T-TIPWEIGHT-8G', 'Tip Weight- 8 gram')
on conflict (part_number) do update set description = excluded.description;

create table if not exists public.requisiciones_material (
  id bigint generated by default as identity primary key,
  fecha date not null default current_date,
  material_part_number text not null references public.requisiciones_material_catalogo(part_number) on update cascade,
  material_description text not null,
  cantidad integer not null check (cantidad > 0),
  motivo text not null check (char_length(trim(motivo)) > 0),
  quien_pide text not null check (quien_pide in ('CELDA 11', 'CELDA 10', 'CELDA 16', 'CELDA 15', 'PREP AREA', 'TECNICOS', 'INGENIERIA')),
  entrego text not null check (entrego in ('DENISSE SANZARRIC', 'YODELI LOPEZ')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requisiciones_material_fecha_idx on public.requisiciones_material (fecha desc);
create index if not exists requisiciones_material_part_number_idx on public.requisiciones_material (material_part_number);

-- Mantiene la descripción guardada sincronizada con el catálogo al insertar o actualizar.
create or replace function public.sync_requisicion_material_description()
returns trigger
language plpgsql
as $$
begin
  select description into new.material_description
  from public.requisiciones_material_catalogo
  where part_number = new.material_part_number;
  if new.material_description is null or btrim(new.material_description) = '' then
    raise exception 'El número de parte % no existe en el catálogo', new.material_part_number;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists requisiciones_material_sync_description on public.requisiciones_material;
create trigger requisiciones_material_sync_description
before insert or update of material_part_number, material_description on public.requisiciones_material
for each row execute function public.sync_requisicion_material_description();

-- Activa RLS y permite a la aplicación pública leer el catálogo, insertar requisiciones y consultar requisiciones.
alter table public.requisiciones_material_catalogo enable row level security;
alter table public.requisiciones_material enable row level security;

drop policy if exists requisiciones_catalogo_select on public.requisiciones_material_catalogo;
create policy requisiciones_catalogo_select on public.requisiciones_material_catalogo
for select to anon, authenticated using (true);

drop policy if exists requisiciones_material_select on public.requisiciones_material;
create policy requisiciones_material_select on public.requisiciones_material
for select to anon, authenticated using (true);

drop policy if exists requisiciones_material_insert on public.requisiciones_material;
create policy requisiciones_material_insert on public.requisiciones_material
for insert to anon, authenticated with check (true);

-- Opcional: habilita estas políticas solo si la pestaña deberá editar o borrar registros.
-- create policy requisiciones_material_update on public.requisiciones_material
-- for update to anon, authenticated using (true) with check (true);
-- create policy requisiciones_material_delete on public.requisiciones_material
-- for delete to anon, authenticated using (true);

comment on table public.requisiciones_material is 'Requisiciones de material del almacén';
