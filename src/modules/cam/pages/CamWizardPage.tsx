// src/modules/cam/pages/CamWizardPage.tsx
import { useEffect, type ComponentType } from "react";
import { useCamStore } from "../store/camStore";
import {
  PASOS,
  MOTIVO_PASO_CERRADO,
  indiceDePaso,
  pasoCerrado,
  type CamStep,
} from "../domain/pasos";
import { getMaquinas } from "../../../services/maquinasService";
import { StepCargarStep } from "../components/steps/StepCargarStep";
import { StepOperaciones } from "../components/steps/StepOperaciones";
import { StepMaterial } from "../components/steps/StepMaterial";
import { StepStock } from "../components/steps/StepStock";
import { StepResumen } from "../components/steps/StepResumen";
import { StepSimulacion } from "../components/steps/StepSimulacion";
import { StepResultado } from "../components/steps/StepResultado";
import { StepMontaje } from "../components/steps/StepMontaje";

// Pantalla de cada paso. El ORDEN, las etiquetas y las reglas están en el
// registro (domain/pasos.ts); este mapa solo dice qué componente pinta cada id.
// Record<CamStep, …> obliga a que cada paso del registro tenga su pantalla.
const PANTALLA_DE_PASO: Record<CamStep, ComponentType> = {
  cargar: StepCargarStep,
  montaje: StepMontaje,
  material: StepMaterial,
  stock: StepStock,
  operaciones: StepOperaciones,
  resumen: StepResumen,
  simulacion: StepSimulacion,
  resultado: StepResultado,
};

export function CamWizardPage() {
  const step = useCamStore((s) => s.step);
  const irA = useCamStore((s) => s.irA);
  const maquina = useCamStore((s) => s.maquina);
  const setMaquina = useCamStore((s) => s.setMaquina);
  const montajeCerrado = useCamStore((s) => s.montajeCerrado);
  const pasoActual = indiceDePaso(step);
  const Pantalla = PANTALLA_DE_PASO[step];

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
    <div className="space-y-3">
      {/* ── Header compacto: título a la izquierda y pasos a la derecha en UNA
          fila; en anchos estrechos los pasos bajan debajo del título.
          "Cancelar proceso" vive en la barra de acciones de cada paso
          (WizardNavButtons), con confirmación. ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="shrink-0 text-lg md:text-xl font-bold text-text-primary">
          Generar G-Code
        </h1>

        {/* ── Stepper ── */}
        <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto pb-1">
          {PASOS.map((p, i) => {
            // Pasos ya hechos pero cerrados: la orientación quedó fija al salir
            // de Montaje, así que Cargar y Montaje no se pueden volver a abrir.
            const cerrado = pasoCerrado(p.id, montajeCerrado);
            return (
              <div key={p.id} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div
                    onClick={() => {
                      if (i < pasoActual && !cerrado) {
                        irA(p.id);
                      }
                    }}
                    title={i < pasoActual && cerrado ? MOTIVO_PASO_CERRADO : undefined}
                    className={`flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      i < pasoActual && cerrado
                        ? "bg-green-500/50 text-white cursor-not-allowed"
                        : i < pasoActual
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
            );
          })}
        </div>
      </div>
      {montajeCerrado && (
        <p className="-mt-2 text-[11px] text-text-muted">{MOTIVO_PASO_CERRADO}</p>
      )}

      {/* ── Contenido del paso ── */}
      <div className="rounded-xl md:rounded-2xl border border-border bg-bg-surface p-4 md:p-6">
        <Pantalla />
      </div>
    </div>
  );
}
