// src/modules/cam/components/steps/WizardNavButtons.tsx
// "Atrás" / "Siguiente" del paso ACTUAL. Los destinos, la condición para avanzar
// y lo que se hace al salir los da el registro (domain/pasos.ts); el paso solo
// aporta el texto del botón y, si la pantalla tiene un bloqueo propio que no
// está en el store (p. ej. el catálogo no cargó), `bloqueado`.
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useCamStore } from "../../store/camStore";
import {
  MOTIVO_PASO_CERRADO,
  pasoAnterior,
  pasoCerrado,
  pasoPorId,
  pasoSiguiente,
} from "../../domain/pasos";

interface WizardNavButtonsProps {
  nextLabel?: string;
  /** Bloqueo propio de la pantalla, además de la regla del registro. */
  bloqueado?: boolean;
}

export function WizardNavButtons({
  nextLabel = "Siguiente",
  bloqueado = false,
}: WizardNavButtonsProps) {
  const step = useCamStore((s) => s.step);
  const avanzar = useCamStore((s) => s.avanzar);
  const retroceder = useCamStore((s) => s.retroceder);
  const avanzando = useCamStore((s) => s.avanzando);
  const errorAvance = useCamStore((s) => s.errorAvance);
  const montajeCerrado = useCamStore((s) => s.montajeCerrado);
  const puedeAvanzar = useCamStore((s) => pasoPorId(s.step).puedeAvanzar(s));

  const anterior = pasoAnterior(step);
  const siguiente = pasoSiguiente(step);
  // Tras avanzar desde Montaje con la orientación sellada, volver a Montaje
  // (o a Cargar) ya no está permitido.
  const atrasCerrado = !!anterior && pasoCerrado(anterior.id, montajeCerrado);
  const canAdvance = !!siguiente && puedeAvanzar && !bloqueado && !avanzando;

  return (
    <div>
      <div className="flex justify-between gap-3">
        {anterior ? (
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={retroceder}
              disabled={atrasCerrado}
              title={atrasCerrado ? MOTIVO_PASO_CERRADO : undefined}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 md:px-5 py-3 md:py-2.5 min-h-[44px] text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted"
            >
              <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Atrás</span>
            </button>
            {atrasCerrado && (
              <p className="text-[11px] leading-snug text-text-muted">
                Montaje ya no se puede modificar: la orientación quedó fija.
              </p>
            )}
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={() => void avanzar()}
          disabled={!canAdvance}
          className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 md:px-6 py-3 md:py-2.5 min-h-[44px] text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="hidden sm:inline">{nextLabel}</span>
          <span className="sm:hidden">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {/* El avance falló (alSalir lanzó): el operario sigue en este paso. */}
      {errorAvance && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-accent-red"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {errorAvance}
        </p>
      )}
    </div>
  );
}
