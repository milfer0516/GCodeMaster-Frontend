// src/lib/geometry/herramientas/brocaCentros.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Broca de centros (DIN 333 forma A) — FUNCIÓN PURA.
//
// Tres tramos encadenados, que es exactamente como se reconoce en la mano:
//   1. punta piloto pequeña con cono de 118°
//   2. cono de avellanado (60° incluido por defecto)
//   3. cuerpo rígido de Ø nominal
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { revolucion, tubo, grados, angulosUniformes } from "../primitivas";
import { CurvaHelicoidal } from "../curvas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { mangoCilindrico, malla } from "./comunes";

export function construirBrocaCentros(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "broca_centros" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "broca_centros";

  // Piloto DIN 333 forma A. Proporciones de la tabla real, no inventadas:
  // d1/d2 ≈ 0.4 (p. ej. d1 3.15 con d2 8.00) y longitud de piloto ≈ 1.25·d1.
  // El Ø declarado en el catálogo es el del CUERPO (d2).
  const rPiloto = Math.max(r.R * 0.4, 0.25);
  const hPuntaPiloto = rPiloto / Math.tan(grados(59));
  const lPiloto = rPiloto * 2.5; // = 1.25 · d1

  // Avellanado: el ángulo declarado es el INCLUIDO (60° forma A).
  const semiAvellanado = grados(r.angulo / 2);
  const hAvellanado = (r.R - rPiloto) / Math.max(Math.tan(semiAvellanado), 0.05);
  const yFinAvellanado = lPiloto + hAvellanado;

  g.add(
    malla(
      revolucion(
        [
          [0, 0],
          [rPiloto, hPuntaPiloto],
          [rPiloto, lPiloto],
          [r.R, yFinAvellanado],
          [r.R, yFinAvellanado + r.D * 0.12],
          [0, yFinAvellanado + r.D * 0.12],
        ],
        48,
      ),
      m.corte,
    ),
  );

  // Canales: cortos y poco torsionados, como en una broca de centros real.
  const rCanal = rPiloto * 0.55;
  for (const fase of angulosUniformes(2)) {
    const curva = new CurvaHelicoidal(
      rPiloto * 0.75,
      r.R * 0.85,
      hPuntaPiloto * 0.6,
      yFinAvellanado * 0.98,
      0.12,
      fase,
    );
    g.add(malla(tubo(curva, rCanal, 30, 8), m.ranura));
  }

  const yCuerpo = yFinAvellanado + r.D * 0.12;
  g.add(mangoCilindrico(m, r.dMango / 2, yCuerpo, Math.max(r.Lt, yCuerpo + r.D * 2)));

  return g;
}
