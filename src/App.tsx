import { useState } from "react";
import { Toaster, toast } from "sonner";
import { ScrapForm, type FormValues } from "./components/ScrapForm";
import { RecordsTable } from "./components/RecordsTable";
import { StatsPage } from "./components/StatsPage";
import { MaterialRequestForm, type MaterialRequestFormValues } from "./components/MaterialRequestForm";
import { MaterialRequestsTable } from "./components/MaterialRequestsTable";
import {
  insertMaterialRequest,
  insertScrap,
  type MaterialDeliverer,
  type MaterialRequester,
} from "./lib/supabase";
import { BarChart2, Truck, Activity, LineChart, ClipboardList } from "lucide-react";

type ScrapTable = "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor";
type Tab = "proceso" | "proveedor" | "estadisticas" | "requisicion";

// Colores por pestaña
const TAB_COLORS = {
  proceso: {
    accent: "#2f81f7",
    accentLight: "rgba(47,129,247,0.12)",
    accentBorder: "rgba(47,129,247,0.5)",
  },
  proveedor: {
    accent: "#f0883e",
    accentLight: "rgba(240,136,62,0.12)",
    accentBorder: "rgba(240,136,62,0.5)",
  },
  estadisticas: {
    accent: "#3fb950",
    accentLight: "rgba(63,185,80,0.12)",
    accentBorder: "rgba(63,185,80,0.5)",
  },
  requisicion: {
    accent: "#a371f7",
    accentLight: "rgba(163,113,247,0.12)",
    accentBorder: "rgba(163,113,247,0.5)",
  },
} as const;

const TABS: {
  id: Tab;
  label: string;
  icon: (color: string) => React.ReactNode;
  table?: ScrapTable;
  tableLabel: string;
}[] = [
  {
    id: "proceso",
    label: "Scrap Proceso",
    icon: color => <BarChart2 className="w-4 h-4" style={{ color }} />,
    table: "scrap_pxg_componentes_proceso",
    tableLabel: "scrap_pxg_componentes_proceso",
  },
  {
    id: "proveedor",
    label: "Scrap Proveedor",
    icon: color => <Truck className="w-4 h-4" style={{ color }} />,
    table: "scrap_pxg_componentes_proveedor",
    tableLabel: "scrap_pxg_componentes_proveedor",
  },
  {
    id: "requisicion",
    label: "Requisición de material",
    icon: color => <ClipboardList className="w-4 h-4" style={{ color }} />,
    tableLabel: "requisiciones_material",
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    icon: color => <LineChart className="w-4 h-4" style={{ color }} />,
    tableLabel: "",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("proceso");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const current = TABS.find(t => t.id === activeTab)!;
  const colors = TAB_COLORS[activeTab];

  const handleScrapSubmit = async (data: FormValues) => {
    if (!current.table) return;
    setLoading(true);
    try {
      await insertScrap(current.table, { ...data, qty: Number(data.qty) });
      toast.success("Registro guardado correctamente", {
        description: `Tabla: ${current.table}`,
        duration: 4000,
      });
      setRefreshKey(key => key + 1);
    } catch (caught) {
      toast.error("Error al guardar el registro", {
        description: (caught as Error).message,
        duration: 6000,
      });
      throw caught;
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialSubmit = async (data: MaterialRequestFormValues) => {
    setLoading(true);
    try {
      await insertMaterialRequest({
        fecha: data.fecha,
        material_part_number: data.material_part_number,
        material_description: data.material_description,
        cantidad: Number(data.cantidad),
        motivo: data.motivo,
        quien_pide: data.quien_pide as MaterialRequester,
        entrego: data.entrego as MaterialDeliverer,
      });
      toast.success("Requisición guardada correctamente", {
        description: `Material: ${data.material_part_number}`,
        duration: 4000,
      });
      setRefreshKey(key => key + 1);
    } catch (caught) {
      toast.error("Error al guardar la requisición", {
        description: (caught as Error).message,
        duration: 6000,
      });
      throw caught;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" },
        }}
      />

      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg" style={{ background: colors.accentLight }}>
              <Activity className="w-7 h-7" style={{ color: colors.accent }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text)] leading-none">PXG Scrap System</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">Almacén — Captura de Componentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-sm text-[var(--text-muted)]">Sistema activo</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const tabColors = TAB_COLORS[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={isActive ? {
                  borderBottomColor: tabColors.accent,
                  color: tabColors.accent,
                  background: tabColors.accentLight,
                } : {}}
                className={`relative flex shrink-0 items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all duration-200 rounded-t-md ${isActive ? "border-b-2" : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"}`}
              >
                <span style={{ color: isActive ? tabColors.accent : undefined }}>
                  {tab.icon(isActive ? tabColors.accent : "#8b949e")}
                </span>
                {tab.label}
                {isActive && (
                  <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: tabColors.accent, color: "#fff" }}>
                    ACTIVO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Banda de color de contexto */}
      <div className="h-1 w-full transition-all duration-300" style={{ background: `linear-gradient(90deg, ${colors.accent} 0%, transparent 60%)` }} />

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6 p-4 rounded-xl border transition-all duration-300" style={{ background: colors.accentLight, borderColor: colors.accentBorder }}>
          <div className="p-2 rounded-lg" style={{ background: colors.accentLight }}>
            {current.icon(colors.accent)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: colors.accent }}>{current.label}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: colors.accent, color: "#fff" }}>
                {activeTab === "proceso" ? "Proceso" : activeTab === "proveedor" ? "Proveedor" : activeTab === "requisicion" ? "Almacén" : "Analytics"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {activeTab === "estadisticas" ? "Consulta estadísticas por rango de fechas y descarga reportes" : <>Tabla: <span className="font-mono" style={{ color: colors.accent }}>{current.tableLabel}</span></>}
            </p>
          </div>
        </div>

        {activeTab === "estadisticas" && <StatsPage />}

        {activeTab === "requisicion" && (
          <>
            <div className="card border transition-all duration-300" style={{ borderColor: colors.accentBorder }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full" style={{ background: colors.accent }} />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Nueva requisición</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Solicita material al almacén</p>
                </div>
              </div>
              <MaterialRequestForm
                key={activeTab}
                onSubmit={handleMaterialSubmit}
                isLoading={loading}
                accentColor={colors.accent}
              />
            </div>
            <div className="mt-6">
              <MaterialRequestsTable refreshKey={refreshKey} accentColor={colors.accent} />
            </div>
          </>
        )}

        {activeTab !== "estadisticas" && activeTab !== "requisicion" && current.table && (
          <>
            <div className="card border transition-all duration-300" style={{ borderColor: colors.accentBorder }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full" style={{ background: colors.accent }} />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Nuevo Registro</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Tabla: <span className="font-mono" style={{ color: colors.accent }}>{current.table}</span></p>
                </div>
              </div>
              <ScrapForm key={activeTab} onSubmit={handleScrapSubmit} isLoading={loading} tableLabel={current.label} accentColor={colors.accent} />
            </div>
            <RecordsTable table={current.table} refreshKey={refreshKey} accentColor={colors.accent} />
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-[var(--text-muted)] border-t border-[var(--border)] mt-8">
        PXG Scrap System — Almacén © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
