import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex shrink-0 flex-col gap-1.5"
      aria-label="Selector de tema"
    >
      <span className="text-xs font-medium text-foreground/80">Tema</span>
      <div
        className="flex items-center gap-1.5"
        role="radiogroup"
        aria-label="Tema de la aplicación"
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isSelected = theme === value;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              title={label}
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-[60px] min-w-[78px] flex-col items-center justify-center gap-1 rounded-xl border px-3 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-[88px] sm:px-4",
                isSelected
                  ? "border-foreground bg-foreground/[0.04] text-foreground shadow-sm"
                  : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
