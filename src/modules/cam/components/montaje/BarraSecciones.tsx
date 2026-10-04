// src/modules/cam/components/montaje/BarraSecciones.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Barra de secciones de Montaje: un botón por sección VISIBLE, en el orden del
// registro y agrupados como los grupos de las reglas. Cada botón: icono de
// estado (forma distinta por estado), candado si la sección queda fija y título.
//
// No conoce ninguna sección concreta: recorre SECCIONES_MONTAJE. En pantallas
// estrechas se desplaza en horizontal SIN desplazar la página.
// ─────────────────────────────────────────────────────────────────────────────
import { Lock } from "lucide-react";
import {
  ETIQUETA_ESTADO_SECCION,
  GRUPOS_MONTAJE,
  estadoDeSeccion,
  seccionVisible,
  type EstadoMontaje,
} from "../../domain/montaje";
import { SECCIONES_MONTAJE } from "./seccionesMontaje";
import { COLOR_ESTADO, ICONO_ESTADO } from "./estadoSeccionUI";
import { ID_PANEL_SECCION } from "./PanelFlotanteSeccion";

interface Props {
  estado: EstadoMontaje;
  abierta: string | null;
  onAbrir: (id: string) => void;
  /** Registra el botón de cada sección (para devolverle el foco al cerrar). */
  refBoton: (id: string, el: HTMLButtonElement | null) => void;
}

export function BarraSecciones({ estado, abierta, onAbrir, refBoton }: Props) {
  return (
    <nav
      aria-label="Secciones de montaje"
      className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-1"
    >
      <div className="flex w-max items-center gap-2">
        {GRUPOS_MONTAJE.map((grupo, i) => {
          const secciones = SECCIONES_MONTAJE.filter(
            (s) => s.grupo === grupo.id && seccionVisible(s, estado),
          );
          if (secciones.length === 0) return null;
          return (
            <div
              key={grupo.id}
              role="group"
              aria-label={grupo.titulo}
              className={`flex items-center gap-2 ${
                i > 0 ? "border-l border-border pl-2" : ""
              }`}
            >
              {secciones.map((seccion) => {
                const estadoSeccion = estadoDeSeccion(seccion, estado);
                const Icono = ICONO_ESTADO[estadoSeccion];
                const bloqueada =
                  seccion.bloqueadaTrasSellar === true && estado.caraSellada;
                const activa = abierta === seccion.id;
                return (
                  <button
                    key={seccion.id}
                    ref={(el) => refBoton(seccion.id, el)}
                    type="button"
                    onClick={() => onAbrir(seccion.id)}
                    aria-expanded={activa}
                    aria-controls={activa ? ID_PANEL_SECCION : undefined}
                    title={seccion.resumen(estado)}
                    className={`flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      activa
                        ? "border-accent-blue bg-accent-blue/10 text-text-primary"
                        : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/50 hover:text-text-primary"
                    }`}
                  >
                    <Icono
                      aria-hidden
                      className={`h-4 w-4 shrink-0 ${COLOR_ESTADO[estadoSeccion]}`}
                    />
                    <span className="sr-only">
                      {ETIQUETA_ESTADO_SECCION[estadoSeccion]}:
                    </span>
                    {seccion.titulo}
                    {bloqueada && (
                      <Lock
                        aria-label="Queda fija al avanzar"
                        className="h-3.5 w-3.5 shrink-0 text-text-muted"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
