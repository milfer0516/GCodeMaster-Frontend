import { useOnboardingStore } from "../store/onboardingStore";
import { BienvenidaStep } from "../components/BienvenidaStep";
import { MachineStep } from "../components/MachineStep";
import { HerramientasStep } from "../components/HerramientasStep";
import { ConfirmStep } from "../components/ConfirmStep";

const PASOS = ["Bienvenida", "Máquina", "Herramientas", "Confirmación"];

const PASO_INDEX: Record<string, number> = {
  bienvenida: 0,
  maquina: 1,
  herramientas: 2,
  confirmacion: 3,
};

export function OnboardingPage() {
  const step = useOnboardingStore((s) => s.step);
  const pasoActual = PASO_INDEX[step];

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8">
      {/* Header */}
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg text-accent-blue">⚙</span>
          <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
            GCodeMaster CNC — Configuración inicial
          </span>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {PASOS.map((nombre, i) => (
            <div key={nombre} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    i < pasoActual
                      ? "bg-accent-green text-white"
                      : i === pasoActual
                        ? "bg-accent-blue text-white"
                        : "border border-border bg-bg-surface text-text-muted"
                  }`}
                >
                  {i < pasoActual ? "✓" : i + 1}
                </div>
                <span
                  className={`mt-1 text-[10px] ${
                    i === pasoActual ? "text-accent-blue" : "text-text-muted"
                  }`}
                >
                  {nombre}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div
                  className={`mb-4 h-px w-8 flex-1 ${
                    i < pasoActual ? "bg-accent-green" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Contenido del paso actual */}
        <div className="rounded-2xl border border-border bg-bg-surface p-6 sm:p-8">
          {step === "bienvenida" && <BienvenidaStep />}
          {step === "maquina" && <MachineStep />}
          {step === "herramientas" && <HerramientasStep />}
          {step === "confirmacion" && <ConfirmStep />}
        </div>
      </div>
    </div>
  );
}
// Placeholder for the onboarding wizard page. Implemented in session 2.
