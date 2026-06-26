# SCRAP-ALAMCEN-PXG — TODO

## Backend
- [x] Configurar cliente Supabase en el servidor usando variables de entorno
- [x] Crear helper `server/supabase.ts` para conexión a Supabase
- [x] Crear procedimiento tRPC `scrap.proceso.insert` para insertar en scrap_pxg_componentes_proceso
- [x] Crear procedimiento tRPC `scrap.proceso.list` para consultar últimos registros de proceso
- [x] Crear procedimiento tRPC `scrap.proveedor.insert` para insertar en scrap_pxg_componentes_proveedor
- [x] Crear procedimiento tRPC `scrap.proveedor.list` para consultar últimos registros de proveedor
- [x] Agregar router de scrap a appRouter en server/routers.ts
- [x] Escribir tests Vitest para los procedimientos de scrap

## Frontend
- [x] Configurar tema visual elegante (colores, tipografía, variables CSS) en index.css
- [x] Actualizar client/index.html con fuente Google Fonts (Inter + JetBrains Mono)
- [x] Crear componente ScrapForm.tsx reutilizable con todos los campos y validación
- [x] Crear componente ScrapRecordsTable.tsx para tabla de registros recientes
- [x] Crear página ScrapProceso.tsx con formulario + tabla de registros recientes
- [x] Crear página ScrapProveedor.tsx con formulario + tabla de registros recientes
- [x] Crear layout principal con tabs de navegación entre las dos secciones en Home.tsx
- [x] Actualizar App.tsx con tema oscuro como default
- [x] Implementar mensajes de confirmación/error con toast (sonner)
- [x] Validación de campos obligatorios en ambos formularios

## Configuración
- [x] Registrar SUPABASE_URL y SUPABASE_KEY como secrets del proyecto
- [x] Instalar @supabase/supabase-js
