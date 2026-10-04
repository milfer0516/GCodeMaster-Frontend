// src/modules/cam/components/montaje/PanelMontaje.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel de controles del paso Montaje: los grupos y sus secciones como un
// acordeón con UNA sección abierta a la vez.
//
// · Al entrar al paso se abre la primera sección obligatoria con faltantes (si
//   no hay ninguna, ninguna). Completar una sección NO salta a la siguiente.
// · Cada cabecera dice su estado con icono + palabra (nunca solo color), el
//   título y la línea de resumen. Todo sale de las reglas (domain/montaje.ts).
// · Mientras el motor orienta la pieza, todos los controles quedan
//   deshabilitados (el fieldset deshabilita los botones/campos que contiene).
//
// El panel no conoce ninguna sección concreta: recorre SECCIONES_MONTAJE.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Lock,
} from "lucide-react";
import { useCamStore } from "../../store/camStore";
import {
  ETIQUETA_ESTADO_SECCION,
  GRUPOS_MONTAJE,
  estadoDeSeccion,
  seccionInicialMontaje,
  seccionVisible,
  type EstadoMontaje,
  type EstadoSeccion,
} from "../../domain/montaje";
import { SECCIONES_MONTAJE, type SeccionMontajeUI } from "./seccionesMontaje";
import { useEstadoMontaje } from "./hooksMontaje";

const ICONO_ESTADO: Record<EstadoSeccion, typeof CircleCheck> = {
  completa: CircleCheck,
  pendiente: CircleAlert,
  opcional: CircleDashed,
};

const COLOR_ESTADO: Record<EstadoSeccion, string> = {
  completa: "text-green-400",
  pendiente: "text-amber-500",
  opcional: "text-text-muted",
};

export function PanelMontaje() {
  const estado = useEstadoMontaje();
  const sellando = useCamStore((s) => s.estadoOrientacion === "sellando");
  // Solo al montar (= entrar al paso): luego manda el operario.
  const [abierta, setAbierta] = useState<string | null>(() =>
    seccionInicialMontaje(estado),
  );

  return (
    <fieldset
      disabled={sellando}
      aria-busy={sellando}
      className="m-0 min-w-0 space-y-4 border-0 p-0"
    >
      {GRUPOS_MONTAJE.map((grupo) => {
        const secciones = SECCIONES_MONTAJE.filter(
          (s) => s.grupo === grupo.id && seccionVisible(s, estado),
        );
        if (secciones.length === 0) return null;
        return (
          <section key={grupo.id} className="min-w-0 space-y-2">
            <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {grupo.titulo}
            </h3>
            {secciones.map((seccion) => (
              <ItemSeccion
                key={seccion.id}
                seccion={seccion}
                estado={estado}
                abierta={abierta === seccion.id}
                onAlternar={() =>
                  setAbierta((actual) =>
                    actual === seccion.id ? null : seccion.id,
                  )
                }
              />
            ))}
          </section>
        );
      })}
    </fieldset>
  );
}

function ItemSeccion({
  seccion,
  estado,
  abierta,
  onAlternar,
}: {
  seccion: SeccionMontajeUI;
  estado: EstadoMontaje;
  abierta: boolean;
  onAlternar: () => void;
}) {
  const estadoSeccion = estadoDeSeccion(seccion, estado);
  const Icono = ICONO_ESTADO[estadoSeccion];
  const bloqueada = seccion.bloqueadaTrasSellar === true && estado.caraSellada;
  const idCuerpo = `seccion-montaje-${seccion.id}`;
  const { Contenido } = seccion;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-bg-primary">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        aria-controls={idCuerpo}
        className="flex w-full min-w-0 items-start gap-2 px-3 py-2.5 text-left transition hover:bg-bg-elevated"
      >
        <Icono
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR_ESTADO[estadoSeccion]}`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-text-primary">
              {seccion.titulo}
            </span>
            {bloqueada && (
              <Lock
                aria-label="Queda fija al avanzar"
                className="h-3.5 w-3.5 shrink-0 text-text-muted"
              />
            )}
          </span>
          <span className="block truncate text-xs text-text-muted">
            {seccion.resumen(estado)}
          </span>
        </span>
        <span
          className={`mt-0.5 shrink-0 text-[11px] font-medium ${COLOR_ESTADO[estadoSeccion]}`}
        >
          {ETIQUETA_ESTADO_SECCION[estadoSeccion]}
        </span>
        <ChevronDown
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${
            abierta ? "rotate-180" : ""
          }`}
        />
      </button>
      {abierta && (
        <div id={idCuerpo} className="border-t border-border px-3 py-3">
          <Contenido />
        </div>
      )}
    </div>
  );
}
