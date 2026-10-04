// src/modules/cam/components/montaje/SeccionNotas.tsx
//
// "Notas de montaje" — sección opcional del paso Montaje.
import { useCamStore } from "../../store/camStore";

export function SeccionNotas() {
  const notas = useCamStore((s) => s.montajeConfig.notas);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);

  return (
    <textarea
      value={notas}
      onChange={(e) => setMontajeConfig({ notas: e.target.value })}
      placeholder="Instrucciones especiales de sujeción…"
      rows={3}
      className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none resize-none"
    />
  );
}
