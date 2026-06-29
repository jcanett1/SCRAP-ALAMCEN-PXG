import { useState } from "react";
import { Toaster, toast } from "sonner";
import { ScrapForm, type FormValues } from "./components/ScrapForm";
import { RecordsTable } from "./components/RecordsTable";
import { insertScrap } from "./lib/supabase";
import { BarChart2, Truck, Activity } from "lucide-react";

type Tab = "proceso" | "proveedor";

// Colores por pestaña: Proceso = azul, Proveedor = naranja/ámbar
const TAB_COLORS = {
  proceso: {
    accent:      "#2f81f7",
    accentLight: "rgba(47,129,247,0.12)",
    accentBorder:"rgba(47,129,247,0.5)",
    badge:       "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    tabActive:   "border-blue-400 text-blue-400 bg-blue-500/8",
    tabHover:    "hover:text-blue-300 hover:border-blue-500/40",
    iconBg:      "bg-blue-500/12",
    iconColor:   "text-blue-400",
    headerBg:    "bg-blue-500/6",
    pill:        "bg-blue-500 text-white",
  },
  proveedor: {
    accent:      "#f0883e",
    accentLight: "rgba(240,136,62,0.12)",
    accentBorder:"rgba(240,136,62,0.5)",
    badge:       "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    tabActive:   "border-orange-400 text-orange-400 bg-orange-500/8",
    tabHover:    "hover:text-orange-300 hover:border-orange-500/40",
    iconBg:      "bg-orange-500/12",
    iconColor:   "text-orange-400",
    headerBg:    "bg-orange-500/6",
    pill:        "bg-orange-500 text-white",
  },
} as const;

const TABS: {
  id: Tab;
  label: string;
  icon: (color: string) => React.ReactNode;
  table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor";
}[] = [
  {
    id: "proceso",
    label: "Scrap Proceso",
    icon: (color) => <BarChart2 className="w-4 h-4" style={{ color }} />,
    table: "scrap_pxg_componentes_proceso",
  },
  {
    id: "proveedor",
    label: "Scrap Proveedor",
    icon: (color) => <Truck className="w-4 h-4" style={{ color }} />,
    table: "scrap_pxg_componentes_proveedor",
  },
];

export default function App() {
  const [activeTab, setActiveTab]   = useState<Tab>("proceso");
  const [loading, setLoading]       = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const current = TABS.find(t => t.id === activeTab)!;
  const colors  = TAB_COLORS[activeTab];

  const handleSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await insertScrap(current.table, { ...data, qty: Number(data.qty) });
      toast.success("Registro guardado correctamente", {
        description: `Tabla: ${current.table}`,
        duration: 4000,
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      toast.error("Error al guardar el registro", {
        description: (e as Error).message,
        duration: 6000,
      });
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
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg" style={{ background: colors.accentLight }}>
              <Activity className="w-5 h-5" style={{ color: colors.accent }} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text)] leading-none">PXG Scrap System</h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Almacén — Captura de Componentes</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs text-[var(--text-muted)]">Sistema activo</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {TABS.map(tab => {
            const c      = TAB_COLORS[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={isActive ? {
                  borderBottomColor: c.accent,
                  color: c.accent,
                  background: c.accentLight,
                } : {}}
                className={`
                  relative flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 rounded-t-md
                  ${isActive
                    ? "border-b-2"
                    : `border-transparent text-[var(--text-muted)] hover:bg-[var(--surface2)] ${c.tabHover}`}
                `}
              >
                {/* Ícono con color de la pestaña */}
                <span style={{ color: isActive ? c.accent : undefined }}>
                  {tab.icon(isActive ? c.accent : "#8b949e")}
                </span>

                {tab.label}

                {/* Indicador de pestaña activa */}
                {isActive && (
                  <span
                    className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: c.accent, color: "#fff" }}
                  >
                    ACTIVO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Banda de color de contexto */}
      <div
        className="h-1 w-full transition-all duration-300"
        style={{ background: `linear-gradient(90deg, ${colors.accent} 0%, transparent 60%)` }}
      />

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Título de sección con badge de color */}
        <div
          className="flex items-center gap-3 mb-6 p-4 rounded-xl border transition-all duration-300"
          style={{ background: colors.accentLight, borderColor: colors.accentBorder }}
        >
          <div className="p-2 rounded-lg" style={{ background: colors.accentLight }}>
            {current.icon(colors.accent)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: colors.accent }}>
                {current.label}
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: colors.accent, color: "#fff" }}
              >
                {activeTab === "proceso" ? "Proceso" : "Proveedor"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Tabla:{" "}
              <span className="font-mono" style={{ color: colors.accent }}>{current.table}</span>
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div
          className="card border transition-all duration-300"
          style={{ borderColor: colors.accentBorder }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div
                className="w-1 h-6 rounded-full"
                style={{ background: colors.accent }}
              />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Nuevo Registro</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Tabla:{" "}
                  <span className="font-mono" style={{ color: colors.accent }}>{current.table}</span>
                </p>
              </div>
            </div>
          </div>
          <ScrapForm
            key={activeTab}
            onSubmit={handleSubmit}
            isLoading={loading}
            tableLabel={current.label}
            accentColor={colors.accent}
          />
        </div>

        {/* Tabla de registros */}
        <RecordsTable table={current.table} refreshKey={refreshKey} accentColor={colors.accent} />
      </main>

      <footer className="text-center py-6 text-xs text-[var(--text-muted)] border-t border-[var(--border)] mt-8">
        PXG Scrap System — Almacén © 2026
      </footer>
    </div>
  );
}
