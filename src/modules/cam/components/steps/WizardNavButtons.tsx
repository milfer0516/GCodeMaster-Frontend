// src/modules/cam/components/steps/WizardNavButtons.tsx
// Barra de acciones del paso ACTUAL, la misma en todos los pasos:
//   izquierda → "Cancelar proceso" (pide confirmación antes de reiniciar).
//   derecha   → "Para continuar falta: …", "Atrás" y "Siguiente paso".
// Los destinos, la condición para avanzar, lo que falta y lo que se hace al
// salir los da el registro (domain/pasos.ts). El paso solo puede aportar
// `bloqueado` si la pantalla tiene un bloqueo propio que no está en el store
// (p. ej. el catálogo no cargó).
import { useState } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useCamStore } from "../../store/camStore";
import { Modal } from "../../../../components/ui/Modal";
import {
  MOTIVO_PASO_CERRADO,
  faltantesDePaso,
  pasoAnterior,
  pasoCerrado,
  pasoPorId,
  pasoSiguiente,
  puedeCancelarseEn,
} from "../../domain/pasos";

interface WizardNavButtonsProps {
  /** Bloqueo propio de la pantalla, además de la regla del registro. */
  bloqueado?: boolean;
}

export function WizardNavButtons({ bloqueado = false }: WizardNavButtonsProps) {
  const step = useCamStore((s) => s.step);
  const avanzar = useCamStore((s) => s.avanzar);
  const retroceder = useCamStore((s) => s.retroceder);
  const reset = useCamStore((s) => s.reset);
  const avanzando = useCamStore((s) => s.avanzando);
  const errorAvance = useCamStore((s) => s.errorAvance);
  const montajeCerrado = useCamStore((s) => s.montajeCerrado);
  const puedeAvanzar = useCamStore((s) => pasoPorId(s.step).puedeAvanzar(s));
  // Misma lista de la que se deriva puedeAvanzar (domain/pasos.ts).
  const faltantes = useCamStore(
    useShallow((s) => faltantesDePaso(s.step, s)),
  );
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  const anterior = pasoAnterior(step);
  const siguiente = pasoSiguiente(step);
  // Tras avanzar desde Montaje con la orientación sellada, volver a Montaje
  // (o a Cargar) ya no está permitido.
  const atrasCerrado = !!anterior && pasoCerrado(anterior.id, montajeCerrado);
  const canAdvance = !!siguiente && puedeAvanzar && !bloqueado && !avanzando;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {puedeCancelarseEn(step) && (
          <button
            type="button"
            onClick={() => setConfirmarCancelar(true)}
            className="min-h-[44px] shrink-0 rounded-xl px-2 text-sm font-medium text-accent-red transition hover:bg-accent-red/10"
          >
            Cancelar proceso
          </button>
        )}

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {faltantes.length > 0 && (
            <p className="min-w-0 basis-full text-right text-xs text-text-muted sm:basis-auto">
              Para continuar falta: {faltantes.join(", ")}.
            </p>
          )}
          {anterior && (
            <button
              type="button"
              onClick={retroceder}
              disabled={atrasCerrado}
              title={atrasCerrado ? MOTIVO_PASO_CERRADO : undefined}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 md:px-5 py-3 md:py-2.5 min-h-[44px] text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted"
            >
              <ChevronLeft className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">Atrás</span>
              <span className="sr-only sm:hidden">Atrás</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void avanzar()}
            disabled={!canAdvance}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-accent-blue px-4 md:px-6 py-3 md:py-2.5 min-h-[44px] text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente paso
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {atrasCerrado && (
        <p className="mt-2 text-right text-[11px] leading-snug text-text-muted">
          Montaje ya no se puede modificar: la orientación quedó fija.
        </p>
      )}

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

      {/* En un portal: la barra inferior usa backdrop-blur, que encerraría un
          overlay `fixed` dentro de ella. */}
      {createPortal(
        <Modal
          open={confirmarCancelar}
          onClose={() => setConfirmarCancelar(false)}
          size="sm"
        >
          <p className="text-sm text-text-primary">
            ¿Cancelar el proceso? Se perderá el avance de esta pieza.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmarCancelar(false)}
              className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
            >
              Seguir aquí
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmarCancelar(false);
                reset();
              }}
              className="min-h-[44px] rounded-xl bg-accent-red px-4 text-sm font-semibold text-white transition hover:bg-accent-red/90"
            >
              Cancelar proceso
            </button>
          </div>
        </Modal>,
        document.body,
      )}
    </div>
  );
}
