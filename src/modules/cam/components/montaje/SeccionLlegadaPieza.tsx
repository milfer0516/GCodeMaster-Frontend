// src/modules/cam/components/montaje/SeccionLlegadaPieza.tsx
//
// "¿Cómo llega la pieza?" — sección del paso Montaje (antes, el paso Contexto).
// Dos preguntas, en este orden:
//   1. Forma de lo que llega (redonda / prismática) → stockConfig.tipo, la
//      única fuente de la forma; el paso Stock la puede cambiar después.
//   2. Estado de la pieza (las seis tarjetas de domain/contextoFabricacion.ts)
//      → contextoFabricacion, que viaja en contexto_json.
//
// Pensada para el panel estrecho de Montaje: filas tipo radio (miniatura,
// título, una línea de descripción), sin desbordamiento horizontal.
//
// LÍMITE ESTRICTO (heredado del paso Contexto): la ayuda explica qué SIGNIFICA
// el estado elegido. No anticipa lo que el MDE hará con él.
import { Info } from "lucide-react";
import { useCamStore } from "../../store/camStore";
import {
  ESTADOS_PIEZA,
  FORMA_LABEL,
  imagenDeEstado,
  type FormaStock,
} from "../../domain/contextoFabricacion";

const FORMAS: FormaStock[] = ["cilindrico", "rectangular"];

export function SeccionLlegadaPieza() {
  const forma = useCamStore((s) => s.stockConfig.tipo);
  const formaDeclarada = useCamStore((s) => s.formaDeclarada);
  const setFormaLlegada = useCamStore((s) => s.setFormaLlegada);
  const contextoFabricacion = useCamStore((s) => s.contextoFabricacion);
  const contextoRespondido = useCamStore((s) => s.contextoRespondido);
  const setContextoFabricacion = useCamStore((s) => s.setContextoFabricacion);

  // Sin responder, nada aparece elegido (aunque por debajo viaje DESCONOCIDO).
  const estadoElegido = contextoRespondido ? contextoFabricacion.estado : null;
  const seleccionada = ESTADOS_PIEZA.find((c) => c.id === estadoElegido);

  return (
    <div className="min-w-0 space-y-3">
      {/* ── 1. Forma de lo que llega ── */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-text-muted">
          Forma de lo que llega
        </p>
        <div role="radiogroup" aria-label="Forma de lo que llega" className="grid grid-cols-2 gap-2">
          {FORMAS.map((f) => {
            const activa = formaDeclarada && forma === f;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => setFormaLlegada(f)}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  activa
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/50"
                }`}
              >
                {FORMA_LABEL[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Estado de la pieza ── */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
          Estado de la pieza
          <span className="inline-flex items-center gap-1 font-normal text-accent-blue">
            <Info className="h-3 w-3 shrink-0" />
            lo usará el MDE
          </span>
        </p>
        <div role="radiogroup" aria-label="Estado de la pieza" className="space-y-1.5">
          {ESTADOS_PIEZA.map((card) => {
            const activa = card.id === estadoElegido;
            return (
              <button
                key={card.id}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => setContextoFabricacion(card.id)}
                className={`flex w-full min-w-0 items-center gap-2.5 rounded-xl border p-1.5 pr-2.5 text-left transition-colors ${
                  activa
                    ? "border-accent-blue bg-accent-blue/[0.08]"
                    : "border-border bg-bg-primary hover:border-accent-blue/40"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-elevated/60">
                  <img
                    src={imagenDeEstado(card, forma)}
                    alt=""
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-semibold ${
                      activa ? "text-accent-blue" : "text-text-primary"
                    }`}
                  >
                    {card.titulo}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {card.descripcion}
                  </span>
                </span>
                {/* Indicador tipo radio */}
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    activa ? "border-accent-blue" : "border-border"
                  }`}
                >
                  {activa && <span className="h-2 w-2 rounded-full bg-accent-blue" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ayuda: qué se OBSERVA en una pieza en ese estado. */}
        {seleccionada && (
          <p className="mt-2 rounded-xl border border-border bg-bg-elevated/50 px-3 py-2 text-xs leading-relaxed text-text-primary">
            <span className="font-semibold">{seleccionada.titulo}:</span>{" "}
            {seleccionada.ayuda}
          </p>
        )}
      </div>
    </div>
  );
}
