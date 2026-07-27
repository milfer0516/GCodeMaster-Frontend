// src/modules/cam/components/operaciones/ListaOperaciones.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Lista de operaciones — filas COMPACTAS, no tarjetas.
//
// REGLA INNEGOCIABLE: el nombre de la operación NUNCA se trunca. Confundir un
// Ø8 con un Ø18 porque los puntos suspensivos se comieron el dígito es un error
// que se paga en material y en herramienta rota. Por eso el nombre va con
// `break-words` y la fila crece en alto si hace falta; no hay `truncate` ni
// `whitespace-nowrap` en ningún punto de este archivo, y no se deben añadir.
//
// Cada fila lleva: casilla · número de orden · nombre completo · número de
// herramienta (T3, T5…) · herramienta asignada debajo · punto del color del
// tipo · borde izquierdo del color del ESTADO.
//
// Las operaciones que el MDE marcó LIKELY_ALREADY_DONE aparecen DESMARCADAS
// pero presentes y se pueden volver a marcar: no se esconde ninguna.
// ─────────────────────────────────────────────────────────────────────────────
import {
  ESTADO_FILA_BORDE,
  ESTADO_FILA_TEXTO,
  TEXTO_ESTADO,
  estadoFila,
  recomendacionDe,
  type IndiceMDE,
} from "../../domain/mdeRecomendaciones";
import { TIPOS_OPERACION, tipoOperacionPunto } from "../../domain/tiposOperacion";
import {
  numeroT,
  type HerramientaFisica,
} from "../../domain/herramientasOperacion";
import type { Operacion } from "../../store/camStore";

interface Props {
  operaciones: Operacion[];
  indiceMDE: IndiceMDE;
  /** Herramienta asignada a cada operación (ya resuelta por el paso). */
  herramientaDe: (op: Operacion) => HerramientaFisica | null;
  opEnfocada: string | null;
  onEnfocar: (id: string) => void;
  onAlternar: (id: string) => void;
  onSeleccionarTodas: () => void;
  onDeseleccionarTodas: () => void;
  /** Orden de los dos montajes. Solo se pregunta si hay operaciones en ambos. */
  ordenSetups: string;
  onOrdenSetups: (orden: string) => void;
}

const ORDENES = [
  { value: "superior_primero", label: "Cara superior primero (OP10 → OP20)" },
  { value: "inferior_primero", label: "Cara inferior primero (OP10 → OP20)" },
];

export function ListaOperaciones({
  operaciones,
  indiceMDE,
  herramientaDe,
  opEnfocada,
  onEnfocar,
  onAlternar,
  onSeleccionarTodas,
  onDeseleccionarTodas,
  ordenSetups,
  onOrdenSetups,
}: Props) {
  // El orden de montajes solo tiene sentido cuando se van a mecanizar las dos
  // caras. Además decide qué setup es OP10 para el motor, así que también es lo
  // que alinea cada recomendación del MDE con su setup.
  const hayAmbosSetups =
    operaciones.some((op) => op.setup === 1 && op.seleccionada) &&
    operaciones.some((op) => op.setup === 2 && op.seleccionada);

  return (
    <div className="flex h-full flex-col">
      <ol className="flex-1 space-y-1 p-2">
        {operaciones.map((op, indice) => {
          const rec = recomendacionDe(indiceMDE, op);
          const estado = estadoFila(rec);
          const herramienta = herramientaDe(op);
          const t = numeroT(herramienta);
          const enfocada = op.id === opEnfocada;

          return (
            <li key={op.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onEnfocar(op.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEnfocar(op.id);
                  }
                }}
                className={`flex w-full cursor-pointer items-start gap-2 rounded-lg border border-l-4 px-2 py-1.5 text-left transition ${
                  ESTADO_FILA_BORDE[estado]
                } ${
                  enfocada
                    ? "border-accent-blue/50 bg-accent-blue/10"
                    : "border-border bg-bg-primary hover:bg-bg-elevated"
                }`}
              >
                {/* Casilla — decide si la operación se mecaniza. Va aparte del
                    clic en la fila (que solo ENFOCA), para que mirar una
                    operación no la marque sin querer. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAlternar(op.id);
                  }}
                  aria-label={`${op.seleccionada ? "Quitar" : "Incluir"} ${op.descripcion}`}
                  aria-pressed={op.seleccionada}
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition ${
                    op.seleccionada
                      ? "border-accent-blue bg-accent-blue"
                      : "border-border hover:border-accent-blue/60"
                  }`}
                >
                  {op.seleccionada && (
                    <svg viewBox="0 0 12 12" className="h-full w-full p-0.5 text-white">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>

                <span className="mt-0.5 w-4 shrink-0 text-right font-mono text-[10px] text-text-muted">
                  {indice + 1}
                </span>

                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tipoOperacionPunto(op.tipo)}`}
                  title={op.tipo}
                />

                <div className="min-w-0 flex-1">
                  {/* NOMBRE COMPLETO. break-words, nunca truncate. */}
                  <p className="break-words text-[12px] leading-snug text-text-primary">
                    {op.descripcion}
                  </p>

                  {herramienta ? (
                    <p className="mt-0.5 break-words text-[10px] text-text-muted">
                      {herramienta.nombre ?? "Herramienta sin nombre"}
                      {herramienta.diametro_mm != null &&
                        ` · Ø${herramienta.diametro_mm} mm`}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-text-muted/70">
                      Sin herramienta asignada
                    </p>
                  )}

                  <p className="mt-0.5 text-[9px] uppercase tracking-wide text-text-muted/70">
                    {rec ? TEXTO_ESTADO[rec.status] : ESTADO_FILA_TEXTO[estado]}
                  </p>
                </div>

                {/* Número de herramienta del carrusel. Solo si existe: un T
                    inventado se teclea tal cual en la máquina. */}
                {t && (
                  <span className="mt-0.5 shrink-0 rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-primary">
                    {t}
                  </span>
                )}
              </div>
            </li>
          );
        })}

        {operaciones.length === 0 && (
          <li className="px-2 py-6 text-center text-xs text-text-muted">
            El análisis no detectó operaciones en esta pieza.
          </li>
        )}
      </ol>

      <div className="shrink-0 space-y-2 border-t border-border p-2">
        {hayAmbosSetups && (
          <div className="space-y-1 rounded-lg border border-border bg-bg-primary p-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">
              Orden de mecanizado
            </p>
            {ORDENES.map((opcion) => (
              <label
                key={opcion.value}
                className="flex cursor-pointer items-start gap-1.5"
              >
                <input
                  type="radio"
                  name="orden-setups"
                  checked={ordenSetups === opcion.value}
                  onChange={() => onOrdenSetups(opcion.value)}
                  className="mt-0.5 h-3 w-3 shrink-0 accent-[color:rgb(var(--color-accent-blue))]"
                />
                <span className="break-words text-[10px] text-text-primary">
                  {opcion.label}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-1.5">
          <button
            onClick={onSeleccionarTodas}
            className="flex-1 rounded-lg border border-border px-2 py-1.5 text-[11px] text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
          >
            Seleccionar todas
          </button>
          <button
            onClick={onDeseleccionarTodas}
            className="flex-1 rounded-lg border border-border px-2 py-1.5 text-[11px] text-text-muted transition hover:border-accent-red/50 hover:text-accent-red"
          >
            Deseleccionar todas
          </button>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {TIPOS_OPERACION.map((t) => (
            <span
              key={t.tipo}
              className="flex items-center gap-1 text-[9px] text-text-muted"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.punto}`} />
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
