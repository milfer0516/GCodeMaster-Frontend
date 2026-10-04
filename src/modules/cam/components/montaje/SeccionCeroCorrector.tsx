// src/modules/cam/components/montaje/SeccionCeroCorrector.tsx
//
// "Cero y corrector" — sección PROVISIONAL del paso Montaje: DÓNDE va el cero
// (datum) y CÓMO se llama en el control (WCS), como UNA sola decisión. En una
// fase siguiente pasa al paso Stock.
import { useCamStore } from "../../store/camStore";
import { INSTRUCCION_ELEGIR_DATUM } from "../../domain/datum";
import { useModoDatum } from "./contextoMontaje";
import { usePuntosDatum } from "./hooksMontaje";

const WCS_ITEMS = [
  { code: "G54" as const, descripcion: "Origen pieza 1 (más común)" },
  { code: "G55" as const, descripcion: "Origen pieza 2 — múltiples piezas" },
  { code: "G56" as const, descripcion: "Origen pieza 3" },
  { code: "G57" as const, descripcion: "Origen pieza 4" },
];

export function SeccionCeroCorrector() {
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);
  const sellada = useCamStore((s) => s.estadoOrientacion === "sellada");
  const { modoDatum, setModoDatum } = useModoDatum();
  const { puntosDatum, puntoElegido } = usePuntosDatum();

  return (
    <>
      <p className="mb-2 rounded-lg border border-border bg-bg-elevated/50 px-2.5 py-1.5 text-xs leading-snug text-text-muted">
        Esta configuración pasará al paso Stock.
      </p>
      <p className="mb-2 text-xs text-text-muted">
        El cero del programa va en un punto que usted palpa en la máquina y
        se guarda en un corrector de origen (G54–G57).
      </p>

      <div className="mb-3 rounded-xl border border-border bg-bg-primary px-3 py-2">
        {puntoElegido ? (
          <p className="text-sm text-text-primary">
            El cero va en{" "}
            <span className="font-semibold text-accent-blue">
              {puntoElegido.etiqueta}
            </span>{" "}
            y se llama{" "}
            <span className="font-semibold text-accent-blue">
              {montajeConfig.wcs}
            </span>
            .
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            Sin elegir. Si no elige, el motor pone el cero en el centro de la
            cara de arriba.
          </p>
        )}
      </div>

      <button
        onClick={() => setModoDatum((activo) => !activo)}
        disabled={!sellada || puntosDatum.length === 0}
        className={`mb-3 w-full rounded-xl border px-4 py-2.5 min-h-[44px] text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          modoDatum
            ? "border-amber-400 bg-amber-400/10 text-amber-500"
            : "border-accent-blue/50 text-accent-blue hover:bg-accent-blue/10"
        }`}
      >
        {modoDatum ? "Terminar selección del cero" : "Seleccionar datum"}
      </button>
      {!sellada && (
        <p className="-mt-1.5 mb-2 text-xs leading-snug text-amber-500">
          Primero establezca la cara de apoyo: los puntos se calculan sobre
          la pieza ya orientada.
        </p>
      )}
      <p className="-mt-1.5 mb-3 text-xs leading-snug text-text-muted">
        {INSTRUCCION_ELEGIR_DATUM}
      </p>

      <p className="mb-1.5 text-xs font-medium text-text-muted">
        Corrector de origen en el control
      </p>
      <div className="grid grid-cols-2 md:flex gap-2">
        {WCS_ITEMS.map(({ code, descripcion }) => (
          <div key={code} className="relative group">
            <button
              onClick={() => setMontajeConfig({ wcs: code })}
              className={`w-full md:w-auto rounded-xl border px-4 py-3 md:py-2 min-h-[44px] text-sm font-medium transition ${
                montajeConfig.wcs === code
                  ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                  : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/50"
              }`}
            >
              {code}
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 group-hover:block">
              <div className="rounded-lg border border-border bg-bg-card px-2.5 py-1.5 text-xs text-text-primary shadow-lg whitespace-nowrap">
                {code}: {descripcion}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs leading-snug text-text-muted">
        El programa usa el corrector elegido (se activa después de cada
        cambio de herramienta). Registre el cero de la pieza en ese mismo
        corrector del control antes de correr el programa.
      </p>
    </>
  );
}
