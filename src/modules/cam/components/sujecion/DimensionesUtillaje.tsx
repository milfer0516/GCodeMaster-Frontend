// src/modules/cam/components/sujecion/DimensionesUtillaje.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Medidas REGISTRADAS de un utillaje (utillaje.parametros), solo lectura.
//
// Etiqueta y unidad salen SOLO de `campos_utillaje` del schema de la familia;
// no hay ni un nombre de campo escrito aquí: se recorren las claves de
// `parametros`. Si el schema no está (fallo de la llamada) o una clave no tiene
// definición en él, se pinta la clave y el valor crudos, sin unidad.
// Los valores se muestran tal cual se guardaron: sin redondeo ni conversión.
// Un valor de texto (p.ej. una rosca) nunca lleva unidad.
// ─────────────────────────────────────────────────────────────────────────────
import type { CampoSchema } from "../../services/utillajesService";

interface Props {
  parametros: Record<string, unknown> | null | undefined;
  /** campos_utillaje del schema; null = schema no disponible. */
  campos: CampoSchema[] | null;
  className?: string;
}

const valorCrudo = (valor: unknown): string =>
  typeof valor === "string"
    ? valor
    : typeof valor === "number" || typeof valor === "boolean"
      ? String(valor)
      : JSON.stringify(valor);

export const DimensionesUtillaje = ({
  parametros,
  campos,
  className = "",
}: Props) => {
  const claves = parametros ? Object.keys(parametros) : [];
  if (!parametros || claves.length === 0) return null;

  return (
    <dl
      className={`space-y-0.5 text-xs leading-snug [overflow-wrap:anywhere] ${className}`}
    >
      {claves.map((clave) => {
        const valor = parametros[clave];
        const campo = campos?.find((c) => c.nombre === clave);
        const unidad =
          campo?.unidad && typeof valor === "number" ? ` ${campo.unidad}` : "";
        return (
          <div key={clave} className="min-w-0">
            <dt className="inline text-text-muted">
              {campo?.etiqueta ?? clave}:
            </dt>{" "}
            <dd className="inline text-text-primary">
              {valorCrudo(valor)}
              {unidad}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};
