// src/modules/cam/components/montaje/SeccionSujecion.tsx
//
// "Utillaje y sujeción" — sección del paso Montaje. Muestra el amarre elegido
// y abre el modal de sujeción (schema-driven desde /utillajes).
import { useState } from "react";
import { createPortal } from "react-dom";
import { Settings2 } from "lucide-react";
import { useCamStore } from "../../store/camStore";
import type { SujecionConfig } from "../../store/camStore";
import { ModalSujecion } from "../sujecion/ModalSujecion";
import { alturaTotalDeclarada } from "../../domain/camposMontaje";
import { resumirAlturas } from "../../domain/montaje";

// Resúmenes GENÉRICOS del amarre: la etiqueta de la familia y las cotas
// medidas vienen del schema/contrato del backend, y los parámetros de montaje
// se listan con las claves del schema. Nada se codifica por familia.
function badgeSujecion(cfg: SujecionConfig): string {
  const params = Object.entries(cfg.parametros_montaje ?? {}).map(
    ([clave, valor]) =>
      Array.isArray(valor)
        ? `${clave}: ${valor.length} punto(s)`
        : `${clave}: ${String(valor)}`,
  );
  return [cfg.etiqueta_familia ?? cfg.familia, ...params].join(" — ");
}

export function SeccionSujecion() {
  const analisis = useCamStore((s) => s.analisis);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);
  // La máquina se carga UNA vez a nivel del wizard (CamWizardPage); aquí solo
  // se LEE del store.
  const maquinaActiva = useCamStore((s) => s.maquina);
  const [modalAbierto, setModalAbierto] = useState(false);

  const dimensiones = analisis?.dimensiones ?? { x: 0, y: 0, z: 0 };

  const handleConfirmarSujecion = (config: SujecionConfig) => {
    setMontajeConfig({
      tipo_sujecion: config.familia,
      sujecion_config: config,
      id_maquina: maquinaActiva?.id_maquina ?? null,
    });
  };

  return (
    <>
      {montajeConfig.sujecion_config ? (
        <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {montajeConfig.sujecion_config.nombre_utillaje ??
                  montajeConfig.sujecion_config.etiqueta_familia ??
                  montajeConfig.sujecion_config.familia}
              </p>
              <p className="mt-0.5 text-xs text-text-muted leading-snug">
                {resumirAlturas(montajeConfig.sujecion_config.envolvente)}
              </p>
              {montajeConfig.sujecion_config.envolvente && (
                <p className="mt-1 text-xs text-text-muted">
                  Altura total:{" "}
                  <span className="font-semibold text-text-primary">
                    {Math.round(
                      alturaTotalDeclarada(
                        montajeConfig.sujecion_config.envolvente,
                      ),
                    )}
                    mm
                  </span>
                </p>
              )}
              <p className="mt-1.5 font-mono text-[11px] leading-none text-accent-blue/80">
                {badgeSujecion(montajeConfig.sujecion_config)}
              </p>
            </div>
            <button
              onClick={() => setModalAbierto(true)}
              className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-accent-blue/50 hover:text-text-primary transition"
            >
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setModalAbierto(true)}
          disabled={!maquinaActiva}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Settings2 className="h-4 w-4" />
          {maquinaActiva
            ? "Configurar sujeción"
            : "Cargando máquina registrada…"}
        </button>
      )}

      {/* Modal de sujeción. En un portal: el panel puede ser un cajón con
          transform (móvil), que recortaría un overlay `fixed` anidado. */}
      {modalAbierto &&
        maquinaActiva &&
        createPortal(
          <ModalSujecion
            maquina={maquinaActiva}
            dimensiones={dimensiones}
            onConfirm={handleConfirmarSujecion}
            onClose={() => setModalAbierto(false)}
          />,
          document.body,
        )}
    </>
  );
}
