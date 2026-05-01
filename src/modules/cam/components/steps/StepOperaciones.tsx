// src/modules/cam/components/steps/StepOperaciones.tsx
import { useCamStore } from "../../store/camStore";

export const StepOperaciones = () => {
  const { operaciones, toggleOperacion, ordenSetups, setOrdenSetups, setStep } =
    useCamStore();

  const opsSetup1 = operaciones.filter((op) => op.setup === 1);
  const opsSetup2 = operaciones.filter((op) => op.setup === 2);
  const tieneAmbosLados = opsSetup1.length > 0 && opsSetup2.length > 0;

  const haySeleccionadas = operaciones.some((op) => op.seleccionada);

  return (
    <div className="space-y-6">
      {/* Operaciones Cara Superior */}
      <div>
        <h3 className="text-md font-semibold text-text-primary mb-2">
          Cara Superior (Setup 1)
        </h3>
        {opsSetup1.length === 0 ? (
          <p className="text-sm text-text-muted">
            No hay operaciones detectadas en esta cara.
          </p>
        ) : (
          <div className="space-y-2">
            {opsSetup1.map((op) => (
              <label key={op.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={op.seleccionada}
                  onChange={() => toggleOperacion(op.id)}
                  className="rounded border-gray-300"
                />
                <span>
                  {op.descripcion}
                  {op.herramienta_sugerida && (
                    <span className="ml-2 text-xs text-text-muted">
                      ({op.herramienta_sugerida})
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Operaciones Cara Inferior */}
      <div>
        <h3 className="text-md font-semibold text-text-primary mb-2">
          Cara Inferior (Setup 2)
        </h3>
        {opsSetup2.length === 0 ? (
          <p className="text-sm text-text-muted">
            No hay operaciones detectadas en esta cara.
          </p>
        ) : (
          <div className="space-y-2">
            {opsSetup2.map((op) => (
              <label key={op.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={op.seleccionada}
                  onChange={() => toggleOperacion(op.id)}
                  className="rounded border-gray-300"
                />
                <span>{op.descripcion}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Selección de orden (solo si hay ambos lados y al menos una operación seleccionada en cada uno) */}
      {tieneAmbosLados &&
        opsSetup1.some((op) => op.seleccionada) &&
        opsSetup2.some((op) => op.seleccionada) && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-md font-semibold text-text-primary mb-2">
              Orden de mecanizado
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="orden"
                  value="superior_primero"
                  checked={ordenSetups === "superior_primero"}
                  onChange={() => setOrdenSetups("superior_primero")}
                />
                Primero Cara Superior (OP10) → luego Cara Inferior (OP20)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="orden"
                  value="inferior_primero"
                  checked={ordenSetups === "inferior_primero"}
                  onChange={() => setOrdenSetups("inferior_primero")}
                />
                Primero Cara Inferior (OP10) → luego Cara Superior (OP20)
              </label>
            </div>
          </div>
        )}

      {/* Botón siguiente */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={() => setStep("material")}
          disabled={!haySeleccionadas}
          className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};
