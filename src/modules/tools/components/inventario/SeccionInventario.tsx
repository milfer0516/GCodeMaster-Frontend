// src/modules/tools/components/inventario/SeccionInventario.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CABECERA + ENVOLTURA PLEGABLE de una sección del inventario (diseño
// "GCodeMaster inventario.html"): chip de icono con acento, título + conteo en
// mono, subtítulo, botón de acción con acento y cheurón.
//
// El plegado es SOLO de pantalla estrecha: en ancho (≥900px, el breakpoint del
// diseño) la sección está siempre abierta y el cheurón no se muestra — se
// fuerza con clases `min-[900px]:`, sin leer el viewport en JS.
//
// COLORES — todo a tokens del tema (globals.css), nada hardcodeado:
//   acento azul del diseño (#4a86f5)  → accent-blue
//   acento verde del diseño (#3dc882) → accent-green
//   textos #e6e8ea / #6b727b          → text-text-primary / text-text-muted
// Las clases de acento van en un mapa con strings LITERALES para que Tailwind
// las genere (nada de `bg-accent-${color}` dinámico).
// ─────────────────────────────────────────────────────────────────────────────
import { ChevronDown, Plus, type LucideIcon } from "lucide-react";

export type AcentoInventario = "blue" | "green";

const ACENTO: Record<
  AcentoInventario,
  { chip: string; boton: string }
> = {
  blue: {
    chip: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
    boton:
      "border-accent-blue/40 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20",
  },
  green: {
    chip: "border-accent-green/30 bg-accent-green/10 text-accent-green",
    boton:
      "border-accent-green/40 bg-accent-green/10 text-accent-green hover:bg-accent-green/20",
  },
};

interface Props {
  icono: LucideIcon;
  titulo: string;
  subtitulo: string;
  /** Texto del conteo, p.ej. "5 en el taller". */
  conteo: string;
  etiquetaAccion: string;
  onAccion: () => void;
  acento: AcentoInventario;
  /** Plegado solo aplicable en pantalla estrecha. */
  abierto: boolean;
  onAlternar: () => void;
  children: React.ReactNode;
}

export const SeccionInventario = ({
  icono: Icono,
  titulo,
  subtitulo,
  conteo,
  etiquetaAccion,
  onAccion,
  acento,
  abierto,
  onAlternar,
  children,
}: Props) => {
  const clases = ACENTO[acento];

  return (
    <div>
      <header className="flex items-center gap-3 pb-3.5">
        <button
          type="button"
          onClick={onAlternar}
          aria-label={`${abierto ? "Plegar" : "Desplegar"} sección ${titulo}`}
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border ${clases.chip}`}
        >
          <Icono className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={onAlternar}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-baseline gap-2">
            <h2 className="m-0 text-base font-semibold tracking-tight text-text-primary">
              {titulo}
            </h2>
            <span className="font-mono text-[11.5px] text-text-muted">
              {conteo}
            </span>
          </span>
          <span className="block text-xs text-text-muted">{subtitulo}</span>
        </button>
        <button
          type="button"
          onClick={onAccion}
          className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] transition ${clases.boton}`}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={2.2} />
          {etiquetaAccion}
        </button>
        {/* Cheurón: solo en estrecho (en ancho la sección no se pliega) */}
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 min-[900px]:hidden ${
            abierto ? "" : "-rotate-90"
          }`}
        />
      </header>

      {/* Contenido: plegable en estrecho, SIEMPRE visible en ancho */}
      <div className={abierto ? "min-[900px]:block" : "hidden min-[900px]:block"}>
        {children}
      </div>
    </div>
  );
};
