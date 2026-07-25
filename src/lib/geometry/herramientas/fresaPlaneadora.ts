// src/lib/geometry/herramientas/fresaPlaneadora.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Fresa planeadora / "piña" (face mill de plaquitas) — FUNCIÓN PURA.
//
// Cuerpo de disco + N plaquitas repartidas en la periferia, con ángulo de
// posición de 45°. El tamaño de la plaquita se deduce de su designación ISO
// (APKT1604 → 16 mm), así que cambiar la designación cambia el dibujo.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import {
  revolucion,
  cilindro,
  prisma,
  aro,
  angulosUniformes,
  grados,
} from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { malla } from "./comunes";

/** Ángulo de posición del inserto (kappa) — 45° es el estándar de planeado. */
const ANGULO_POSICION = 45;

export function construirFresaPlaneadora(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "fresa_planeadora" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "fresa_planeadora";

  const tam = Math.min(r.tamInserto, r.R * 0.7); // lado de la plaquita
  const hCuerpo = Math.max(r.D * 0.42, tam * 1.8);
  const rArbol = Math.max(r.R * 0.32, 8);

  // Cuerpo: disco con el faldón inferior rebajado (aloja las plaquitas).
  g.add(
    malla(
      revolucion(
        [
          [0, tam * 0.25],
          [r.R * 0.55, tam * 0.25],
          [r.R * 0.92, tam * 0.25],
          [r.R * 0.98, tam * 0.75],
          [r.R * 0.98, hCuerpo],
          [0, hCuerpo],
        ],
        56,
      ),
      m.mango,
    ),
  );

  // Plaquitas: la esquina de corte cae EXACTAMENTE en el radio nominal y en el
  // plano y = 0. El semiancho se calcula tras inclinar kappa, si no la
  // herramienta dibujaría un diámetro mayor que el declarado.
  const espesorInserto = tam * 0.42;
  const kappa = grados(ANGULO_POSICION);
  const semi =
    (tam * Math.cos(kappa) + espesorInserto * Math.sin(kappa)) / 2;
  const semiTangencial = (tam * 0.95) / 2;
  // La esquina exterior de la plaquita está fuera del plano radial, así que el
  // asiento se retrae por Pitágoras: si no, el Ø dibujado supera al declarado.
  const alcanceRadial = Math.sqrt(
    Math.max(r.R * r.R - semiTangencial * semiTangencial, (r.R * 0.4) ** 2),
  );
  const radioAsiento = Math.max(alcanceRadial - semi, semi * 0.2);
  const yInserto = (tam * Math.sin(kappa) + espesorInserto * Math.cos(kappa)) / 2;

  for (const a of angulosUniformes(r.insertos)) {
    const x = radioAsiento * Math.cos(a);
    const z = -radioAsiento * Math.sin(a);

    g.add(
      malla(
        prisma(tam, espesorInserto, tam * 0.95, [x, yInserto, z], a, kappa),
        m.inserto,
      ),
    );

    // Tornillo de fijación de la plaquita.
    const tornillo = malla(
      cilindro(tam * 0.16, tam * 0.16, tam * 0.5, tam * 0.3, 12),
      m.detalle,
    );
    tornillo.position.set(x * 0.94, 0, z * 0.94);
    g.add(tornillo);
  }

  // Aro de sujeción + árbol de acoplamiento.
  g.add(malla(aro(r.R * 0.62, r.D * 0.035, hCuerpo * 0.98, 40), m.detalle));
  g.add(malla(cilindro(rArbol, rArbol, Math.max(r.Lt - hCuerpo, r.D * 0.6), hCuerpo, 40), m.mango));

  return g;
}
