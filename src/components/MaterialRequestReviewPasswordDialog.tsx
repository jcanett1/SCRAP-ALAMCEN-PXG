import { useState } from "react";
import { Loader2, LockKeyhole, X } from "lucide-react";

interface Props {
  recordId: number;
  nextReviewed: boolean;
  accentColor: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export function MaterialRequestReviewPasswordDialog({
  recordId,
  nextReviewed,
  accentColor,
  isSubmitting,
  onCancel,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!password) {
      setError("Escribe la contraseña para continuar.");
      return;
    }
    try {
      await onConfirm(password);
    } catch (caught) {
      setPassword("");
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar el estado de revisión.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-password-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-in">
        <div className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="rounded-lg p-2" style={{ background: `${accentColor}20` }}>
            <LockKeyhole className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="review-password-title" className="text-base font-bold text-[var(--text)]">
              Confirmar {nextReviewed ? "revisión" : "cambio a pendiente"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Requisición <span className="font-mono font-semibold">#{recordId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <p className="text-sm text-[var(--text-muted)]">
            Introduce la contraseña para {nextReviewed ? "marcar esta requisición como revisada" : "desmarcarla y dejarla pendiente"}.
          </p>
          <div>
            <label htmlFor="material-request-review-password" className="field-label">
              Contraseña <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              id="material-request-review-password"
              type="password"
              required
              autoFocus
              autoComplete="off"
              value={password}
              onChange={event => { setPassword(event.target.value); setError(""); }}
              className="field-input"
              aria-describedby={error ? "material-request-review-password-error" : undefined}
            />
          </div>

          {error && (
            <p id="material-request-review-password-error" role="alert" className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-ghost border border-[var(--border)]">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || !password} className="btn-primary" style={{ background: accentColor }}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {isSubmitting ? "Verificando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
