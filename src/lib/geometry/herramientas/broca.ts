// src/lib/geometry/herramientas/broca.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Broca helicoidal — FUNCIÓN PURA.
//
// Punta cónica por ángulo (118° estándar / 135° autocentrante) + cuerpo con
// dos canales helicoidales + mango. La altura de la punta se DERIVA del
// ángulo: hp = R / tan(ángulo/2). Cambiar 118 → 135 acorta la punta a ojo,
// que es justo lo que el operador debe reconocer.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { revolucion, prisma, grados, angulosUniformes } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { cuerpoAcanalado, mangoCilindrico, malla } from "./comunes";

/** Hélice de broca estándar (tipo N). */
const HELICE_GRADOS = 28;
/** Los canales de broca son anchos: quedan dos labios estrechos. */
const ANCHO_FILO = 0.36;

export function construirBroca(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "broca" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "broca";

  // Altura de la punta a partir del ángulo incluido.
  const semiAngulo = grados(r.angulo / 2);
  const hPunta = r.R / Math.max(Math.tan(semiAngulo), 0.05);

  // Cono de punta (sólido, tapado en el eje superior).
  g.add(
    malla(
      revolucion(
        [
          [0, 0],
          [r.R * 0.92, hPunta * 0.92],
          [r.R, hPunta],
          [0, hPunta],
        ],
        48,
      ),
      m.corte,
    ),
  );

  // Labios de corte: UNO por filo, cada uno tendido sobre su generatriz del
  // cono (del centro a la periferia). Un solo prisma pasante no valdría: una
  // barra recta no puede apoyarse en los dos lados de un cono a la vez.
  const inclinacionLabio = grados(90 - r.angulo / 2);
  for (const a of angulosUniformes(r.filos)) {
    g.add(
      malla(
        prisma(
          r.R * 1.02,
          r.R * 0.07,
          r.R * 0.16,
          [(r.R / 2) * Math.cos(a), hPunta / 2, (r.R / 2) * -Math.sin(a)],
          a,
          inclinacionLabio,
        ),
        m.ranura,
      ),
    );
  }

  // Cuerpo acanalado — SIEMPRE 2 canales salvo que se declare otra cosa.
  g.add(
    cuerpoAcanalado(m, {
      radio: r.R,
      yInicio: hPunta * 0.98,
      yFin: Math.max(r.Lc, hPunta * 1.5),
      filos: r.filos,
      anguloHelice: HELICE_GRADOS,
      anchoRel: ANCHO_FILO,
    }),
  );

  g.add(
    mangoCilindrico(
      m,
      r.dMango / 2,
      Math.max(r.Lc, hPunta * 1.5),
      Math.max(r.Lt, hPunta * 1.5 + r.D),
    ),
  );

  return g;
}
