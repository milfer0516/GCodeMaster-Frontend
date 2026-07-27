// src/modules/cam/components/steps/StepContexto.tsx
//
// Declaración del operador sobre el ESTADO de la pieza antes de mecanizar.
// El paso NUNCA bloquea: "No estoy seguro" es una respuesta válida y es la
// opción por defecto.
//
// Las imágenes siguen la forma de bruto que el operador YA declaró en Stock
// (cilíndrico → redondo, rectangular → cuadrado): se le muestra SU caso.
//
// LÍMITE ESTRICTO: la ayuda contextual explica qué SIGNIFICA el estado elegido.
// No anticipa ni resume lo que el MDE hará con él — el motor explica sus propias
// decisiones más adelante, en Operaciones. Nunca duplicar su razonamiento aquí.
import { useCamStore } from "../../store/camStore";
import { WizardNavButtons } from "./WizardNavButtons";
import { Check, Info } from "lucide-react";
import {
  ESTADOS_PIEZA,
  imagenDeEstado,
  FORMA_LABEL,
  type EstadoPieza,
  type EstadoPiezaCard,
  type FormaStock,
} from "../../domain/contextoFabricacion";

function EstadoCard({
  card,
  forma,
  selected,
  onSelect,
}: {
  card: EstadoPiezaCard;
  forma: FormaStock;
  selected: boolean;
  onSelect: (id: EstadoPieza) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card.id)}
      aria-pressed={selected}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border text-left transition-colors ${
        selected
          ? "border-accent-blue bg-accent-blue/[0.08] ring-2 ring-accent-blue/25"
          : "border-border bg-bg-surface hover:border-accent-blue/40 hover:bg-bg-elevated"
      }`}
    >
      {/* Imagen con altura FIJA y aire alrededor: las seis tarjetas se comparan
          de un vistazo, sin scroll. La imagen ilustra, no domina la tarjeta. */}
      <div className="flex h-[180px] w-full flex-shrink-0 items-center justify-center bg-bg-elevated/60 p-5 md:p-6">
        <img
          src={imagenDeEstado(card, forma)}
          alt={card.titulo}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {/* Forma declarada en Stock — la misma que decide la variante de imagen. */}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          ● {FORMA_LABEL[forma]}
        </span>

        <div className="flex items-start justify-between gap-2">
          {/* min-h = dos líneas: un título que envuelve no desalinea su fila. */}
          <h3
            className={`min-h-[2.25rem] text-sm font-bold leading-tight ${
              selected ? "text-accent-blue" : "text-text-primary"
            }`}
          >
            {card.titulo}
          </h3>
          {selected && (
            <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-accent-blue ring-[3px] ring-accent-blue/20">
              <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
            </span>
          )}
        </div>

        <p className="text-xs leading-snug text-text-muted">{card.descripcion}</p>

        {/* Línea reservada SIEMPRE: al seleccionar, la tarjeta no cambia de alto. */}
        <div className="mt-auto flex h-[18px] items-end pt-2">
          {selected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-blue">
              <Check className="h-3 w-3" strokeWidth={3} /> Seleccionado
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export const StepContexto = () => {
  const contextoFabricacion = useCamStore((s) => s.contextoFabricacion);
  const setContextoFabricacion = useCamStore((s) => s.setContextoFabricacion);
  // Forma del bruto declarada en el paso anterior — decide la variante de imagen.
  const forma = useCamStore((s) => s.stockConfig.tipo);

  const seleccionada = ESTADOS_PIEZA.find(
    (c) => c.id === contextoFabricacion.estado,
  );

  return (
    <div className="space-y-4">
      {/* ── Encabezado (compacto: las seis tarjetas caben sin scroll) ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          ¿Cuál es el estado de esta pieza antes de mecanizar?
        </h2>
        <p className="inline-flex items-center gap-1.5 rounded-lg border border-accent-blue/25 bg-accent-blue/[0.07] px-2.5 py-1 text-[11px] md:text-xs text-accent-blue">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          El MDE utilizará este contexto
        </p>
      </div>

      {/* ── Las seis tarjetas ──
          auto-rows-fr = las dos filas miden lo mismo, así que un título de dos
          líneas no desalinea su fila. */}
      <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3">
        {ESTADOS_PIEZA.map((card) => (
          <EstadoCard
            key={card.id}
            card={card}
            forma={forma}
            selected={card.id === contextoFabricacion.estado}
            onSelect={setContextoFabricacion}
          />
        ))}
      </div>

      {/* ── Ayuda contextual: qué se OBSERVA en una pieza en ese estado ── */}
      {seleccionada && (
        <div className="rounded-xl border border-border bg-bg-elevated/50 px-3.5 py-3">
          <p className="text-xs md:text-sm leading-relaxed text-text-primary">
            <span className="font-semibold">{seleccionada.titulo}:</span>{" "}
            {seleccionada.ayuda}
          </p>
        </div>
      )}

      {/* Nunca bloquea: siempre hay un estado declarado (por defecto DESCONOCIDO). */}
      <WizardNavButtons
        prevStep="stock"
        nextStep="operaciones"
        canAdvance={true}
      />
    </div>
  );
};
