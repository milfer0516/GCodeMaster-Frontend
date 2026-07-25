// src/lib/geometry/herramientas/escariador.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Escariador (reamer) — FUNCIÓN PURA.
//
// Filos RECTOS (no helicoidales) y muchos: 6 por defecto. Chaflán de entrada a
// 45° en la punta y cuello rebajado antes del mango — las tres señas que lo
// distinguen de una fresa a simple vista.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { revolucion, cilindro } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { cuerpoAcanalado, mangoCilindrico, malla } from "./comunes";

/** Los escariadores llevan ranuras estrechas y filos anchos. */
const ANCHO_FILO = 0.22;

export function construirEscariador(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "escariador" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "escariador";

  // Chaflán de entrada a 45°.
  const hChaflan = Math.max(r.R * 0.35, 0.4);
  g.add(
    malla(
      revolucion(
        [
          [0, 0],
          [r.R - hChaflan, 0],
          [r.R, hChaflan],
          [r.R, hChaflan * 1.2],
          [0, hChaflan * 1.2],
        ],
        48,
      ),
      m.corte,
    ),
  );

  // Zona de filos rectos (anguloHelice = 0).
  g.add(
    cuerpoAcanalado(m, {
      radio: r.R,
      yInicio: hChaflan,
      yFin: r.Lc,
      filos: r.filos,
      anguloHelice: 0,
      anchoRel: ANCHO_FILO,
    }),
  );

  // Cuello rebajado: el escariador no roza el agujero ya calibrado.
  const rCuello = r.R * 0.82;
  const lCuello = Math.min(r.D * 0.8, (r.Lt - r.Lc) * 0.5);
  g.add(malla(cilindro(rCuello, rCuello, lCuello, r.Lc, 40), m.mango));

  g.add(
    mangoCilindrico(
      m,
      r.dMango / 2,
      r.Lc + lCuello,
      Math.max(r.Lt, r.Lc + lCuello + r.D),
    ),
  );

  return g;
}
