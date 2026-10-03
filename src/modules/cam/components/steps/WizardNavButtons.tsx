// src/modules/cam/components/steps/WizardNavButtons.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCamStore,
  pasoCerrado,
  MOTIVO_PASO_CERRADO,
} from "../../store/camStore";
import type { CamStep } from "../../store/camStore";

interface WizardNavButtonsProps {
  prevStep?: CamStep | null;
  nextStep: CamStep;
  nextLabel?: string;
  canAdvance?: boolean;
  onNext?: () => void;
}

export function WizardNavButtons({
  prevStep,
  nextStep,
  nextLabel = "Siguiente",
  canAdvance = true,
  onNext,
}: WizardNavButtonsProps) {
  const setStep = useCamStore((s) => s.setStep);
  const montajeCerrado = useCamStore((s) => s.montajeCerrado);
  // Tras avanzar desde Montaje con la orientación sellada, volver a Montaje
  // (o a Cargar) ya no está permitido.
  const atrasCerrado = !!prevStep && pasoCerrado(prevStep, montajeCerrado);

  const handleNext = () => {
    if (onNext) {
      onNext();
    }
    setStep(nextStep);
  };

  return (
    <div className="flex justify-between gap-3">
      {prevStep ? (
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setStep(prevStep)}
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
        onClick={handleNext}
        disabled={!canAdvance}
        className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 md:px-6 py-3 md:py-2.5 min-h-[44px] text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="hidden sm:inline">{nextLabel}</span>
        <span className="sm:hidden">Siguiente</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
