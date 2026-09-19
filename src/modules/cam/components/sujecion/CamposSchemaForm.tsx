// src/modules/cam/components/sujecion/CamposSchemaForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// RENDERIZADOR COMPARTIDO de campos del schema de una familia
// (GET /utillajes/familias/{familia}).
//
// NO hay ni un campo escrito a mano por familia: pinta lo que venga en la
// lista de campos —tipo numero/opcion/opcion_multiple/texto/puntos_xy, con
// visible_si ya filtrado por el dominio, ayuda y advertencia incluidos— y
// reporta los valores crudos (los inputs trabajan con strings; la
// normalización vive en domain/camposMontaje).
//
// Lo usan DOS flujos sobre los DOS juegos de campos del mismo schema:
//   - PasoConfigElemento (montaje)   → campos_montaje
//   - RegistroUtillaje (alta)        → campos_utillaje
// Una familia nueva publicada en el backend se pinta en ambos sin tocar el
// frontend.
//
// `accionesPuntosXY` es un render-prop opcional para acciones extra del editor
// de puntos (p.ej. el "repartir alrededor de la pieza" del montaje, que
// necesita las dimensiones de la pieza; el alta de utillajes no las tiene).
// ─────────────────────────────────────────────────────────────────────────────
import { Plus, Trash2 } from "lucide-react";
import type { CampoSchema } from "../../services/utillajesService";
import type { ValoresCampos } from "../../domain/camposMontaje";

export type FilaPunto = { x_mm: string; y_mm: string };

export interface AccionesPuntosXYCtx {
  campo: CampoSchema;
  filas: FilaPunto[];
  setFilas: (nuevas: FilaPunto[]) => void;
}

interface Props {
  /** Campos YA filtrados por visibilidad (camposVisibles del dominio). */
  campos: CampoSchema[];
  valores: ValoresCampos;
  onCambiarValor: (nombre: string, valor: unknown) => void;
  /** Errores por campo devueltos por el backend (422: detail.errores). */
  errores?: Record<string, string>;
  /** Acciones extra junto al botón "Añadir punto" (solo puntos_xy). */
  accionesPuntosXY?: (ctx: AccionesPuntosXYCtx) => React.ReactNode;
}

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none";

export const CamposSchemaForm = ({
  campos,
  valores,
  onCambiarValor,
  errores = {},
  accionesPuntosXY,
}: Props) => {
  const setValor = onCambiarValor;

  // ── Editor del tipo puntos_xy (lista de {x_mm, y_mm}) ──────────────────
  const renderPuntosXY = (campo: CampoSchema) => {
    const filas = (valores[campo.nombre] as FilaPunto[] | undefined) ?? [];
    const setFilas = (nuevas: FilaPunto[]) => setValor(campo.nombre, nuevas);

    return (
      <div className="space-y-2">
        {filas.map((fila, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              value={fila.x_mm}
              onChange={(e) =>
                setFilas(
                  filas.map((f, j) =>
                    j === i ? { ...f, x_mm: e.target.value } : f,
                  ),
                )
              }
              placeholder="x_mm"
              aria-label={`${campo.etiqueta} — punto ${i + 1} x_mm`}
              className={inputCls}
            />
            <input
              type="number"
              value={fila.y_mm}
              onChange={(e) =>
                setFilas(
                  filas.map((f, j) =>
                    j === i ? { ...f, y_mm: e.target.value } : f,
                  ),
                )
              }
              placeholder="y_mm"
              aria-label={`${campo.etiqueta} — punto ${i + 1} y_mm`}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setFilas(filas.filter((_, j) => j !== i))}
              aria-label={`Quitar punto ${i + 1}`}
              className="shrink-0 rounded-lg p-2 text-text-muted hover:text-red-400 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilas([...filas, { x_mm: "", y_mm: "" }])}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-text-muted transition hover:border-accent-blue/50 hover:text-accent-blue"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir punto
          </button>
          {accionesPuntosXY?.({ campo, filas, setFilas })}
        </div>
      </div>
    );
  };

  // ── Un campo del schema → su control ─────────────────────────────────────
  const renderCampo = (campo: CampoSchema) => {
    const id = `campo-${campo.nombre}`;
    const valor = valores[campo.nombre];
    const error = errores[campo.nombre];

    let control: React.ReactNode;
    switch (campo.tipo) {
      case "numero":
        control = (
          <input
            id={id}
            type="number"
            value={(valor as string) ?? ""}
            min={campo.minimo ?? undefined}
            max={campo.maximo ?? undefined}
            onChange={(e) => setValor(campo.nombre, e.target.value)}
            className={inputCls}
          />
        );
        break;
      case "texto":
        control = (
          <input
            id={id}
            type="text"
            value={(valor as string) ?? ""}
            onChange={(e) => setValor(campo.nombre, e.target.value)}
            className={inputCls}
          />
        );
        break;
      case "opcion":
        control = (
          <select
            id={id}
            value={(valor as string) ?? ""}
            onChange={(e) => setValor(campo.nombre, e.target.value)}
            className={inputCls}
          >
            <option value="">Seleccionar…</option>
            {(campo.opciones ?? []).map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        );
        break;
      case "opcion_multiple": {
        const elegidas = (valor as string[] | undefined) ?? [];
        control = (
          <div className="flex gap-2" role="group" aria-label={campo.etiqueta}>
            {(campo.opciones ?? []).map((op) => {
              const activa = elegidas.includes(op);
              return (
                <button
                  key={op}
                  type="button"
                  aria-pressed={activa}
                  onClick={() =>
                    setValor(
                      campo.nombre,
                      activa
                        ? elegidas.filter((e) => e !== op)
                        : [...elegidas, op],
                    )
                  }
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    activa
                      ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                      : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/40"
                  }`}
                >
                  {op}
                </button>
              );
            })}
          </div>
        );
        break;
      }
      case "puntos_xy":
        control = renderPuntosXY(campo);
        break;
    }

    return (
      <div key={campo.nombre}>
        <label
          htmlFor={campo.tipo === "puntos_xy" ? undefined : id}
          className="text-xs font-medium text-text-primary block mb-1"
        >
          {campo.etiqueta}
          {campo.unidad ? ` (${campo.unidad})` : ""}
          {campo.obligatorio ? "" : " — opcional"}
        </label>
        {control}
        {error && <p className="mt-0.5 text-xs text-red-400">{error}</p>}
        {campo.ayuda && (
          <p className="text-xs text-text-muted mt-0.5">{campo.ayuda}</p>
        )}
        {campo.advertencia && (
          <div className="mt-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
            {campo.advertencia}
          </div>
        )}
      </div>
    );
  };

  return <>{campos.map(renderCampo)}</>;
};
