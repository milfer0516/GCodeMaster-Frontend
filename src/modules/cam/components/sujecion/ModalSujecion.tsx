// src/modules/cam/components/sujecion/ModalSujecion.tsx
import { useState } from "react";
import { X } from "lucide-react";
import type { Maquina } from "../../../../services/maquinasService";
import type { TipoSujecion, SujecionConfig } from "../../store/camStore";
import { PasoSelectorElemento } from "./PasoSelectorElemento";
import { PasoConfigElemento } from "./PasoConfigElemento";
import { PasoValidacionMaquina } from "./PasoValidacionMaquina";

const PASOS = [
  { n: 1, label: "Elemento" },
  { n: 2, label: "Configuración" },
  { n: 3, label: "Validación" },
] as const;

interface Props {
  maquina: Maquina;
  dimensiones: { x: number; y: number; z: number };
  onConfirm: (config: SujecionConfig) => void;
  onClose: () => void;
}

export const ModalSujecion = ({ maquina, dimensiones, onConfirm, onClose }: Props) => {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSujecion>(null);
  const [configParcial, setConfigParcial] = useState<Partial<SujecionConfig>>({});

  const handleSeleccion = (tipo: TipoSujecion) => {
    setTipoSeleccionado(tipo);
    setConfigParcial({});
    setPaso(2);
  };

  const handleConfigConfirm = (config: Partial<SujecionConfig>) => {
    setConfigParcial(config);
    setPaso(3);
  };

  const configFinal: SujecionConfig = {
    tipo: tipoSeleccionado,
    altura_paralelas_mm: 0,
    altura_total_montaje_mm: null,
    envolvente: null,
    ...configParcial,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Configurar sujeción
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {maquina.nombre} · {maquina.controlador} {maquina.controlador_modelo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-6 pt-5">
          {PASOS.map(({ n, label }, idx) => (
            <div key={n} className="flex flex-1 items-center gap-1 min-w-0">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  paso >= n
                    ? "bg-accent-blue text-white"
                    : "border border-border bg-bg-primary text-text-muted"
                }`}
              >
                {n}
              </span>
              <span
                className={`truncate text-xs ${
                  paso >= n ? "text-text-primary" : "text-text-muted"
                }`}
              >
                {label}
              </span>
              {idx < PASOS.length - 1 && (
                <div className="mx-1 h-px flex-1 bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* Contenido del paso activo */}
        <div className="px-6 py-5">
          {paso === 1 && (
            <PasoSelectorElemento onSelect={handleSeleccion} />
          )}

          {paso === 2 && tipoSeleccionado && (
            <PasoConfigElemento
              tipo={tipoSeleccionado}
              dimensiones={dimensiones}
              maquina={maquina}
              onBack={() => setPaso(1)}
              onConfirm={handleConfigConfirm}
            />
          )}

          {paso === 3 && tipoSeleccionado && (
            <PasoValidacionMaquina
              config={configFinal}
              maquina={maquina}
              dimensiones={dimensiones}
              onBack={() => setPaso(2)}
              onConfirm={(cfg) => {
                onConfirm(cfg);
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
