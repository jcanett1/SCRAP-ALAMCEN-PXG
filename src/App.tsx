import { useState } from "react";
import { Toaster, toast } from "sonner";
import { ScrapForm, type FormValues } from "./components/ScrapForm";
import { RecordsTable } from "./components/RecordsTable";
import { insertScrap } from "./lib/supabase";
import { BarChart2, Truck, Activity } from "lucide-react";

type Tab = "proceso" | "proveedor";

const TABS: { id: Tab; label: string; icon: React.ReactNode; table: "scrap_pxg_componentes_proceso" | "scrap_pxg_componentes_proveedor" }[] = [
  { id: "proceso",   label: "Scrap Proceso",   icon: <BarChart2 className="w-4 h-4" />, table: "scrap_pxg_componentes_proceso" },
  { id: "proveedor", label: "Scrap Proveedor", icon: <Truck className="w-4 h-4" />,     table: "scrap_pxg_componentes_proveedor" },
];

export default function App() {
  const [activeTab, setActiveTab]   = useState<Tab>("proceso");
  const [loading, setLoading]       = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const current = TABS.find(t => t.id === activeTab)!;

  const handleSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await insertScrap(current.table, {
        ...data,
        qty: Number(data.qty),
      });
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
            <div className="p-1.5 rounded-lg bg-[var(--primary)]/15">
              <Activity className="w-5 h-5 text-[var(--primary)]" />
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
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150
                ${activeTab === tab.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border)]"}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Título de sección */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[var(--primary)]/10">
            {current.icon}
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">
              {current.label}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Componentes en {activeTab} —{" "}
              <span className="font-mono text-[var(--primary)]">{current.table}</span>
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Nuevo Registro</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Tabla:{" "}
                <span className="font-mono text-[var(--primary)]">{current.table}</span>
              </p>
            </div>
          </div>
          <ScrapForm
            key={activeTab}
            onSubmit={handleSubmit}
            isLoading={loading}
            tableLabel={current.label}
          />
        </div>

        {/* Tabla de registros */}
        <RecordsTable table={current.table} refreshKey={refreshKey} />
      </main>

      <footer className="text-center py-6 text-xs text-[var(--text-muted)] border-t border-[var(--border)] mt-8">
        PXG Scrap System — Almacén © 2026
      </footer>
    </div>
  );
}
