// src/components/layout/VisorConPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · LAYOUT — el par "visor + panel", que es el patrón que se repite en
// todo el producto.
//
// Dos disposiciones sobre los MISMOS dos hijos:
//   · "dividido"       → panel a la izquierda, visor a la derecha (herramientas)
//   · "visorDominante" → visor a pantalla completa con el panel flotando encima
//                        (la disposición que necesita el paso de Montaje)
//
// Cambiar de una a otra es cambiar una prop: ni el visor ni el panel se
// reescriben. Ese es el motivo de que el layout sea una capa aparte.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  panel: React.ReactNode;
  visor: React.ReactNode;
  variante?: "dividido" | "visorDominante";
  /** Lado del panel en la variante dividida. */
  ladoPanel?: "izquierda" | "derecha";
  className?: string;
}

export function VisorConPanel({
  panel,
  visor,
  variante = "dividido",
  ladoPanel = "izquierda",
  className = "",
}: Props) {
  if (variante === "visorDominante") {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <div className="absolute inset-0">{visor}</div>
        <div
          className={`absolute bottom-4 top-4 w-[340px] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-border bg-bg-surface/95 shadow-soft backdrop-blur ${
            ladoPanel === "izquierda" ? "left-4" : "right-4"
          }`}
        >
          {panel}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${className}`}
    >
      <div
        className={`min-h-0 overflow-y-auto ${
          ladoPanel === "derecha" ? "lg:order-2" : ""
        }`}
      >
        {panel}
      </div>
      <div
        className={`min-h-[280px] overflow-hidden rounded-2xl border border-border bg-bg-primary ${
          ladoPanel === "derecha" ? "lg:order-1" : ""
        }`}
      >
        {visor}
      </div>
    </div>
  );
}
