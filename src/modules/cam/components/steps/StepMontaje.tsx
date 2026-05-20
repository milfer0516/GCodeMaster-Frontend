// src/modules/cam/components/steps/StepMontaje.tsx
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { ChevronRight, ChevronLeft } from "lucide-react";

const TIPOS_SUJECION = [
  { key: "prensa", label: "Prensa" },
  { key: "mordaza", label: "Mordaza" },
  { key: "plato", label: "Plato" },
  { key: "bridas", label: "Bridas" },
] as const;

const WCS_OPCIONES = ["G54", "G55", "G56", "G57"] as const;

export const StepMontaje = () => {
  const setStep = useCamStore((s) => s.setStep);
  const analisis = useCamStore((s) => s.analisis);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);
  const meshData = useCamStore((s) => s.meshData);

  const dimensiones = analisis?.dimensiones ?? { x: 0, y: 0, z: 0 };

  // Caras planas disponibles para selección de apoyo
  const carasPlanas =
    meshData?.faces.filter((f) => f.surface_type === "plane") ?? [];

  const puedeAvanzar = montajeConfig.tipo_sujecion !== null;

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Configuración de montaje
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Define cómo se fija la pieza en la máquina antes de seleccionar
          operaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Visor 3D ── */}
        <div className="h-80 rounded-xl overflow-hidden border border-border">
          <CamViewer3D dimensiones={dimensiones} />
        </div>

        {/* ── Configuración ── */}
        <div className="space-y-5">
          {/* Tipo de sujeción */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Tipo de sujeción
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_SUJECION.map((tipo) => (
                <button
                  key={tipo.key}
                  onClick={() => setMontajeConfig({ tipo_sujecion: tipo.key })}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    montajeConfig.tipo_sujecion === tipo.key
                      ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                      : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/50"
                  }`}
                >
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cara de apoyo */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Cara de apoyo{" "}
              <span className="text-xs text-text-muted font-normal">
                (cara plana que apoya sobre la mesa)
              </span>
            </p>
            {carasPlanas.length === 0 ? (
              <p className="text-xs text-text-muted">
                No hay caras planas detectadas.
              </p>
            ) : (
              <select
                value={montajeConfig.face_id_apoyo ?? ""}
                onChange={(e) =>
                  setMontajeConfig({
                    face_id_apoyo:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
              >
                <option value="">Seleccionar cara...</option>
                {carasPlanas.map((f) => (
                  <option key={f.face_id} value={f.face_id}>
                    Cara {f.face_id} — {f.surface_type}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* WCS */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Sistema de coordenadas (WCS)
            </p>
            <div className="flex gap-2">
              {WCS_OPCIONES.map((wcs) => (
                <button
                  key={wcs}
                  onClick={() => setMontajeConfig({ wcs })}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    montajeConfig.wcs === wcs
                      ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                      : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/50"
                  }`}
                >
                  {wcs}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Notas de montaje
            </p>
            <textarea
              value={montajeConfig.notas}
              onChange={(e) => setMontajeConfig({ notas: e.target.value })}
              placeholder="Instrucciones especiales de sujeción..."
              rows={3}
              className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep("analisis")}
          className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Análisis
        </button>
        <button
          onClick={() => setStep("operaciones")}
          disabled={!puedeAvanzar}
          className="flex items-center gap-2 rounded-xl bg-accent-blue px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Configurar operaciones <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
