// src/modules/cam/pages/CamWizardPage.tsx
import { useEffect } from "react";
import { useCamStore } from "../store/camStore";
import { getMaquinas } from "../../../services/maquinasService";
import { StepCargarStep } from "../components/steps/StepCargarStep";
import { StepAnalisis } from "../components/steps/StepAnalisis";
import { StepOperaciones } from "../components/steps/StepOperaciones";
import { StepMaterial } from "../components/steps/StepMaterial";
import { StepStock } from "../components/steps/StepStock";
import { StepContexto } from "../components/steps/StepContexto";
import { StepResumen } from "../components/steps/StepResumen";
import { StepSimulacion } from "../components/steps/StepSimulacion";
import { StepResultado } from "../components/steps/StepResultado";
import { StepMontaje } from "../components/steps/StepMontaje";

const PASOS = [
  { key: "cargar", label: "Archivo" },
  { key: "analisis", label: "Análisis" },
  { key: "montaje", label: "Montaje" },
  { key: "material", label: "Material" },
  { key: "stock", label: "Stock" },
  { key: "contexto", label: "Contexto" },
  { key: "operaciones", label: "Operaciones" },
  { key: "resumen", label: "Resumen" },
  { key: "simulacion", label: "Simulación" },
  { key: "resultado", label: "G-Code" },
];

export function CamWizardPage() {
  const step = useCamStore((s) => s.step);
  const setStep = useCamStore((s) => s.setStep);
  const reset = useCamStore((s) => s.reset);
  const maquina = useCamStore((s) => s.maquina);
  const setMaquina = useCamStore((s) => s.setMaquina);
  const pasoActual = PASOS.findIndex((p) => p.key === step);

  // Cargar la máquina registrada UNA sola vez al entrar al flujo CAM, a nivel del
  // wizard (no dentro de un paso). Así sus dimensiones (mesa_x/y_mm) están en el
  // store para CUALQUIER paso que monte el visor (Montaje, Stock, Operaciones),
  // sin depender de que Montaje se haya montado primero. No añade una llamada
  // nueva: reemplaza la que hacía StepMontaje y no re-pide si ya está cargada.
  useEffect(() => {
    if (maquina) return;
    let cancelado = false;
    getMaquinas().then((lista) => {
      const maq = lista[0];
      if (!cancelado && maq) setMaquina(maq);
    });
    return () => {
      cancelado = true;
    };
  }, [maquina, setMaquina]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-text-primary">CAM Wizard</h1>
          <p className="mt-0.5 text-xs md:text-sm text-text-muted">
            Genera G-Code a partir de tu archivo STEP
          </p>
        </div>
        {step !== "cargar" && step !== "resultado" && (
          <button
            onClick={reset}
            className="text-xs text-text-muted hover:text-accent-red transition min-h-[44px] px-2"
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
                onClick={() => {
                  if (i < pasoActual) {
                    setStep(p.key as any);
                  }
                }}
                className={`flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < pasoActual
                    ? "bg-green-500 text-white cursor-pointer hover:bg-green-600"
                    : i === pasoActual
                      ? "bg-accent-blue text-white"
                      : "border border-border bg-bg-surface text-text-muted"
                }`}
              >
                {i < pasoActual ? "✓" : i + 1}
              </div>
              <span
                className={`mt-1 whitespace-nowrap text-[9px] md:text-[10px] ${
                  i === pasoActual ? "text-accent-blue" : "text-text-muted"
                }`}
              >
                {p.label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`mb-4 h-px w-4 md:w-6 flex-1 ${
                  i < pasoActual ? "bg-green-500" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Contenido del paso ── */}
      <div className="rounded-xl md:rounded-2xl border border-border bg-bg-surface p-4 md:p-6">
        {step === "cargar" && <StepCargarStep />}
        {step === "analisis" && <StepAnalisis />}
        {step === "montaje" && <StepMontaje />}
        {step === "material" && <StepMaterial />}
        {step === "stock" && <StepStock />}
        {step === "contexto" && <StepContexto />}
        {step === "operaciones" && <StepOperaciones />}
        {step === "resumen" && <StepResumen />}
        {step === "simulacion" && <StepSimulacion />}
        {step === "resultado" && <StepResultado />}
      </div>
    </div>
  );
}
