// src/lib/geometry/herramientas/fresaChaflan.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Fresa de chaflán / avellanador — FUNCIÓN PURA.
//
// La punta es un CONO definido por el ángulo incluido (45° / 60° / 90°). La
// altura del cono se deriva: h = (R − r_punta) / tan(ángulo/2). Un 90° se ve
// achatado y un 45° largo y afilado, sin que nadie tenga que leer el número.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { revolucion, tubo, grados, angulosUniformes } from "../primitivas";
import { CurvaHelicoidal } from "../curvas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { mangoCilindrico, malla } from "./comunes";

export function construirFresaChaflan(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "fresa_chaflan" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "fresa_chaflan";

  const rPunta = Math.max(r.R * 0.12, 0.2); // pequeño plano en la punta
  const semiAngulo = grados(r.angulo / 2);
  const hCono = (r.R - rPunta) / Math.max(Math.tan(semiAngulo), 0.05);
  const yCollar = hCono + r.D * 0.1;

  // Cono de corte + collar cilíndrico de transición al mango.
  g.add(
    malla(
      revolucion(
        [
          [0, 0],
          [rPunta, 0],
          [r.R, hCono],
          [r.R, yCollar],
          [0, yCollar],
        ],
        48,
      ),
      m.corte,
    ),
  );

  // Ranuras sobre el cono: siguen la generatriz con una ligera torsión.
  const rRanura = Math.max(r.R * 0.11, 0.25);
  for (const fase of angulosUniformes(r.filos)) {
    // Arrancan un pelo por encima de la punta: el extremo del tubo es un disco
    // perpendicular a la generatriz, y a ras de y = 0 asomaría por debajo.
    const curva = new CurvaHelicoidal(
      rPunta * 0.7,
      r.R * 0.94,
      rRanura,
      hCono,
      0.08,
      fase,
    );
    g.add(malla(tubo(curva, rRanura, 24, 8), m.ranura));
  }

  g.add(
    mangoCilindrico(
      m,
      r.dMango / 2,
      yCollar,
      Math.max(r.Lt, yCollar + r.D * 1.5),
    ),
  );

  return g;
}
