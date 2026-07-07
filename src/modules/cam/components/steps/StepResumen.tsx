// Placeholder for CAM step 7 (Resumen). Implemented in session 4.

import { WizardNavButtons } from "./WizardNavButtons";

export const StepResumen = () => {
  return (
    <div className="space-y-4">
      <div className="text-center py-8 text-text-muted">
        <p className="text-sm">Paso de resumen (pendiente de implementar)</p>
      </div>
      <WizardNavButtons
        prevStep="operaciones"
        nextStep="simulacion"
        canAdvance={true}
      />
    </div>
  );
};
