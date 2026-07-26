// src/lib/geometry/herramientas/fresaEsferica.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Fresa esférica (ball nose) — FUNCIÓN PURA.
//
// LA SEÑA DE IDENTIDAD ES LA SILUETA HEMISFÉRICA, y por eso la punta se
// construye como un SÓLIDO de revolución (cuarto de círculo exacto de radio
// D/2) y no dejando que converjan los filos en el polo: con 2 filos aquello se
// leía como dos lóbulos, no como una bola, y con 3+ salía facetado.
//
// Sobre ese sólido se marcan las ranuras. El envolvente exterior lo definen las
// ranuras, así que el Ø dibujado sigue siendo exactamente el nominal.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import {
  revolucion,
  revolucionParcial,
  arcoPerfil,
  angulosUniformes,
} from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { cuerpoAcanalado, mangoCilindrico, malla } from "./comunes";

const HELICE_GRADOS = 30;
/** Ancho angular de la salida de viruta sobre la bola (radianes). */
const ARCO_RANURA = 0.34;
/** Los filos de una esférica son anchos y el alma gruesa. */
const ANCHO_FILO = 0.16;

export function construirFresaEsferica(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "fresa_esferica" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "fresa_esferica";

  const yCentro = r.R; // el centro de la esfera está a un radio de la punta
  const yFinCorte = Math.max(r.Lc, yCentro * 1.2);

  // ── Punta hemisférica EXACTA ─────────────────────────────────────────────
  // Cuarto de círculo del polo (0,0) al ecuador (R, R), revolucionado: da una
  // semiesfera de radio D/2 con la punta clavada en y = 0.
  g.add(
    malla(
      revolucion(
        [...arcoPerfil(0, yCentro, r.R, -Math.PI / 2, 0, 18), [0, yCentro]],
        56,
      ),
      m.corte,
    ),
  );

  // ── Salidas de viruta sobre la bola ──────────────────────────────────────
  // Sectores del MISMO perfil esférico, un pelo por fuera: abrazan la bola en
  // vez de atravesarla. Un tubo recto no puede seguir una esfera sin salirse
  // del Ø nominal o quedar enterrado bajo la superficie.
  const rRanura = r.R * 1.004;
  const perfilRanura = arcoPerfil(0, rRanura, rRanura, -Math.PI / 2, 0, 18);
  for (const fase of angulosUniformes(r.filos)) {
    g.add(
      malla(
        revolucionParcial(perfilRanura, 10, fase, ARCO_RANURA),
        m.ranura,
      ),
    );
  }

  // ── Caña acanalada por encima del ecuador ────────────────────────────────
  if (yFinCorte > yCentro * 1.05) {
    g.add(
      cuerpoAcanalado(m, {
        radio: r.R,
        yInicio: yCentro,
        yFin: yFinCorte,
        filos: r.filos,
        anguloHelice: HELICE_GRADOS,
        anchoRel: ANCHO_FILO,
      }),
    );
  }

  g.add(mangoCilindrico(m, r.dMango / 2, yFinCorte, r.Lt));

  return g;
}
