// src/modules/cam/components/steps/WizardNavButtons.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCamStore } from "../../store/camStore";
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

  const handleNext = () => {
    if (onNext) {
      onNext();
    }
    setStep(nextStep);
  };

  return (
    <div className="flex justify-between">
      {prevStep ? (
        <button
          onClick={() => setStep(prevStep)}
          className="flex items-center gap-2 rounded-xl border border-border px-4 md:px-5 py-3 md:py-2.5 min-h-[44px] text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Atrás</span>
        </button>
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
