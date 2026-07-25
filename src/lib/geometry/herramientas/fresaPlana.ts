// src/lib/geometry/herramientas/fresaPlana.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Fresa plana (end mill de punta recta) — FUNCIÓN PURA.
// Parámetros reales: Ø de corte, longitud de filo, longitud total, nº de filos.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { cilindro } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import {
  cuerpoAcanalado,
  dientesFrontales,
  mangoCilindrico,
  malla,
  alturaArranqueFilos,
} from "./comunes";

/** Ángulo de hélice típico de una fresa de acabado en acero. */
const HELICE_GRADOS = 30;

export function construirFresaPlana(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "fresa_plana" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "fresa_plana";

  // Cara frontal PLANA — lo que distingue a esta familia de la esférica y de
  // la de radio: la punta corta a 90°, sin redondeo. Su espesor es también la
  // cota a la que arrancan los filos, para que el frente quede realmente liso.
  const yFrente = alturaArranqueFilos(r.R, 0.3, HELICE_GRADOS);
  g.add(malla(cilindro(r.R, r.R, yFrente, 0, 48), m.corte));
  g.add(dientesFrontales(m, r.R, 0, r.filos));

  // Tramo de corte: núcleo + filos helicoidales hasta el Ø nominal.
  g.add(
    cuerpoAcanalado(m, {
      radio: r.R,
      yInicio: yFrente,
      yFin: r.Lc,
      filos: r.filos,
      anguloHelice: HELICE_GRADOS,
    }),
  );

  g.add(mangoCilindrico(m, r.dMango / 2, r.Lc, r.Lt));

  return g;
}
