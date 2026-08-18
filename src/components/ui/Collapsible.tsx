// src/components/ui/Collapsible.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Sección plegable: una fila de cabecera clicable que despliega su contenido
// HACIA ABAJO. Cada instancia gobierna su propio estado, así que varias pueden
// estar abiertas a la vez (el operario abre lo que necesita, no un acordeón de
// una sola sección).
//
// Sirve controlada o no controlada:
//   · no controlada → usa su estado interno, sembrado con `defaultOpen`.
//   · controlada     → si el padre pasa `open`, él manda; el componente solo
//                      avisa por `onOpenChange`.
//
// Sigue las convenciones visuales del resto de ui/ (rounded-xl, border-border,
// tokens de color, iconos lucide) para no introducir un estilo nuevo.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleProps {
  titulo: string;
  children: ReactNode;
  /** Estado inicial en modo NO controlado. */
  defaultOpen?: boolean;
  /** Modo controlado: si se pasa, el padre gobierna el estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Insignia/contador opcional a la derecha del título, antes del chevron. */
  distintivo?: ReactNode;
  className?: string;
}

export function Collapsible({
  titulo,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  distintivo,
  className = "",
}: CollapsibleProps) {
  const [openInterno, setOpenInterno] = useState(defaultOpen);
  const controlado = open !== undefined;
  const abierto = controlado ? open : openInterno;

  const alternar = () => {
    const siguiente = !abierto;
    if (!controlado) setOpenInterno(siguiente);
    onOpenChange?.(siguiente);
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-bg-primary ${className}`}
    >
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-bg-elevated"
      >
        <span className="text-sm font-medium text-text-primary">{titulo}</span>
        {distintivo}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>
      {abierto && (
        <div className="border-t border-border px-3 py-3">{children}</div>
      )}
    </div>
  );
}
