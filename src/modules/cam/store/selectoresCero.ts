// src/modules/cam/store/selectoresCero.ts
// ─────────────────────────────────────────────────────────────────────────────
// Selectores PUROS del cero de pieza (datum + WCS) sobre una foto del store.
// Solo importa el TIPO del store (sin ciclos de módulos).
// ─────────────────────────────────────────────────────────────────────────────
import type { CamState } from "./camStore";
import { puntoDelDatum, puntosDatumDeCaja } from "../domain/datum";

/**
 * La caja sobre la que se calculan los puntos de datum. Los puntos se dibujan
 * como hijos de la malla que pinta el visor; sellada, esa malla es la del
 * motor (marco de mecanizado), así que la caja debe ser la SUYA: con la caja
 * original los puntos flotan fuera de la pieza.
 */
export function cajaDatumDe(s: CamState) {
  return (
    s.orientacionSellada?.mesh_data.bounding_box ?? s.meshData?.bounding_box
  );
}

/** Etiqueta del punto de datum elegido; null = sin elegir. */
export function etiquetaDatumDe(s: CamState): string | null {
  return (
    puntoDelDatum(puntosDatumDeCaja(cajaDatumDe(s)), s.datumConfig)
      ?.etiqueta ?? null
  );
}

/** ¿El stock declarado tiene algún sobre-material mayor que 0? */
export function haySobremedidaDe(s: CamState): boolean {
  const { tipo, stockFaces, cyl } = s.stockConfig;
  if (tipo === "cilindrico")
    return cyl.radial > 0 || cyl.axialMachining > 0 || cyl.axialSupport > 0;
  return stockFaces.some((f) => f.allowance > 0);
}
