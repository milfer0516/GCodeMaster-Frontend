// src/modules/cam/pages/CamWizardPage.tsx
import { useCamStore } from "../store/camStore";
import { StepCargarStep } from "../components/steps/StepCargarStep";
import { StepAnalisis } from "../components/steps/StepAnalisis";
import { StepOperaciones } from "../components/steps/StepOperaciones";
import { StepMaterial } from "../components/steps/StepMaterial";
import { StepMaquina } from "../components/steps/StepMaquina";
import { StepResumen } from "../components/steps/StepResumen";
import { StepResultado } from "../components/steps/StepResultado";

const PASOS = [
  { key: "cargar", label: "Archivo" },
  { key: "analisis", label: "Análisis" },
  { key: "operaciones", label: "Operaciones" },
  { key: "material", label: "Material" },
  { key: "maquina", label: "Máquina" },
  { key: "resumen", label: "Resumen" },
  { key: "resultado", label: "G-Code" },
];

export function CamWizardPage() {
  const step = useCamStore((s) => s.step);
  const reset = useCamStore((s) => s.reset);
  const pasoActual = PASOS.findIndex((p) => p.key === step);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">CAM Wizard</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Genera G-Code a partir de tu archivo STEP
          </p>
        </div>
        {step !== "cargar" && step !== "resultado" && (
          <button
            onClick={reset}
            className="text-xs text-text-muted hover:text-accent-red transition"
          >
            ✕ Cancelar
          </button>
        )}
      </div>

      {/* ── Stepper ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PASOS.map((p, i) => (
          <div key={p.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < pasoActual
                    ? "bg-green-500 text-white"
                    : i === pasoActual
                      ? "bg-accent-blue text-white"
                      : "border border-border bg-bg-surface text-text-muted"
                }`}
              >
                {i < pasoActual ? "✓" : i + 1}
              </div>
              <span
                className={`mt-1 whitespace-nowrap text-[10px] ${
                  i === pasoActual ? "text-accent-blue" : "text-text-muted"
                }`}
              >
                {p.label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`mb-4 h-px w-6 flex-1 ${
                  i < pasoActual ? "bg-green-500" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Contenido del paso ── */}
      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        {step === "cargar" && <StepCargarStep />}
        {step === "analisis" && <StepAnalisis />}
        {step === "operaciones" && <StepOperaciones />}
        {step === "material" && <StepMaterial />}
        {step === "maquina" && <StepMaquina />}
        {step === "resumen" && <StepResumen />}
        {step === "resultado" && <StepResultado />}
      </div>
    </div>
  );
}
