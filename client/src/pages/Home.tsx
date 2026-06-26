import { useState } from "react";
import { Factory, Truck, BarChart3, Package } from "lucide-react";
import ScrapProceso from "./ScrapProceso";
import ScrapProveedor from "./ScrapProveedor";

type Tab = "proceso" | "proveedor";

interface TabConfig {
  id: Tab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  table: string;
}

const TABS: TabConfig[] = [
  {
    id: "proceso",
    label: "Scrap Proceso",
    sublabel: "Componentes en proceso",
    icon: Factory,
    table: "scrap_pxg_componentes_proceso",
  },
  {
    id: "proveedor",
    label: "Scrap Proveedor",
    sublabel: "Componentes de proveedor",
    icon: Truck,
    table: "scrap_pxg_componentes_proveedor",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("proceso");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top Header ── */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground tracking-tight">
                  PXG Scrap System
                </span>
                <span className="hidden sm:block text-xs text-muted-foreground">
                  Almacén — Captura de Componentes
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border px-3 py-1.5 rounded-full">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Sistema activo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-14 z-20">
        <div className="container">
          <nav className="flex gap-0 -mb-px" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium
                    border-b-2 transition-all duration-200 select-none
                    ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === "proceso" ? "Proceso" : "Proveedor"}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Page Title ── */}
      <div
        className="border-b border-border/50"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.62 0.19 215 / 0.08), oklch(0.65 0.18 145 / 0.04))",
        }}
      >
        <div className="container py-5">
          <div className="flex items-start gap-4">
            <div
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${
                  activeTab === "proceso"
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-emerald-500/10 border border-emerald-500/20"
                }
              `}
            >
              <current.icon
                className={`h-5 w-5 ${
                  activeTab === "proceso" ? "text-blue-400" : "text-emerald-400"
                }`}
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {current.label}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {current.sublabel} —{" "}
                <code className="text-xs font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                  {current.table}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 container py-6">
        <div className="animate-slide-up" key={activeTab}>
          {activeTab === "proceso" ? <ScrapProceso /> : <ScrapProveedor />}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-4">
        <div className="container">
          <p className="text-xs text-muted-foreground/50 text-center">
            PXG Scrap System — Almacén © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
