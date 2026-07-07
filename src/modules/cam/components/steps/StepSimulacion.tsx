// Placeholder for CAM step 8 (Simulación). Pro-only Three.js toolpath viewer.

import { WizardNavButtons } from "./WizardNavButtons";

export const StepSimulacion = () => {
  return (
    <div className="space-y-4">
      <div className="text-center py-8 text-text-muted">
        <p className="text-sm">Paso de simulación (pendiente de implementar)</p>
        <p className="text-xs mt-2">Visor de trayectorias 3D (Pro)</p>
      </div>
      <WizardNavButtons
        prevStep="resumen"
        nextStep="resultado"
        canAdvance={true}
      />
    </div>
  );
};
