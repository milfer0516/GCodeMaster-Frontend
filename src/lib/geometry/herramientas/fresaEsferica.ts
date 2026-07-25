// src/lib/geometry/herramientas/fresaEsferica.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Fresa esférica (ball nose) — FUNCIÓN PURA.
// Cilindro + punta hemisférica de radio D/2. Los filos siguen la esfera hasta
// el polo, que es exactamente lo que la diferencia de una fresa plana.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { CurvaFiloEsferico } from "../curvas";
import { hemisferioInferior, tubo, angulosUniformes } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { cuerpoAcanalado, mangoCilindrico, malla } from "./comunes";

const HELICE_GRADOS = 30;
const ANCHO_FILO = 0.3;

export function construirFresaEsferica(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "fresa_esferica" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "fresa_esferica";

  const radioFilo = r.R * ANCHO_FILO;
  const radioNucleo = r.R - radioFilo;
  const yCentroBola = r.R; // el centro de la esfera está a un radio de la punta

  // Alma esférica (oscura): lo que se ve entre filo y filo.
  g.add(malla(hemisferioInferior(radioNucleo, yCentroBola, 40), m.ranura));

  // Filos sobre la bola: del polo al ecuador, con torsión.
  const fases = angulosUniformes(r.filos);
  for (const fase of fases) {
    const curva = new CurvaFiloEsferico(radioNucleo, yCentroBola, fase);
    g.add(malla(tubo(curva, radioFilo, 40, 10), m.corte));
  }

  // Tramo cilíndrico acanalado, en fase con los filos de la bola.
  if (r.Lc > yCentroBola * 1.02) {
    g.add(
      cuerpoAcanalado(m, {
        radio: r.R,
        yInicio: yCentroBola,
        yFin: r.Lc,
        filos: r.filos,
        anguloHelice: HELICE_GRADOS,
        anchoRel: ANCHO_FILO,
      }),
    );
  }

  g.add(mangoCilindrico(m, r.dMango / 2, Math.max(r.Lc, yCentroBola), r.Lt));

  return g;
}
