// src/lib/geometry/herramientas/barraMandrinar.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Barra de mandrinar — FUNCIÓN PURA.
//
// Modelada sobre la referencia real S16Q-SCLCR09: mango Ø16 macizo, 180 mm de
// largo (11×d), plaquita CCMT09 (rómbica de 80°) sujeta con tornillo y ángulo
// de posición 95°, para un agujero mínimo de Ø20.
//
// TRES RASGOS QUE LA IDENTIFICAN:
//  1. Barra ESBELTA y asimétrica — el cuerpo pasa de largo junto al agujero y
//     solo la punta corta. Relación mango/agujero ≈ 0.8.
//  2. UNA sola plaquita en el extremo, excéntrica: es ella la que barre el Ø.
//  3. Cabeza rebajada con asiento inclinado 95° y plano de amarre en el mango.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import {
  cilindro,
  revolucion,
  plaquitaRombica,
  prisma,
  grados,
} from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { malla } from "./comunes";

/** Ángulo de posición de las SCLCR. */
const APROXIMACION = 95;
/** Mango / Ø de agujero mínimo — S16Q-SCLCR09: 16 / 20. */
const ESBELTEZ = 0.78;

export function construirBarraMandrinar(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "barra_mandrinar" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "barra_mandrinar";

  const rBarra = Math.max(r.R * ESBELTEZ, 1.5);
  // Plaquita CCMT: el tamaño sale de la designación (CCMT09 → 9 mm de filo).
  const lado = Math.min(Math.max(r.tamInserto, r.D * 0.16), rBarra * 1.05);
  const espesor = lado * 0.36;
  const hCabeza = lado * 1.5;

  // ── Cabeza: cilindro rebajado por delante para dejar salir la plaquita ────
  g.add(
    malla(
      revolucion(
        [
          [0, 0],
          [rBarra * 0.9, 0],
          [rBarra, hCabeza * 0.45],
          [rBarra, hCabeza],
          [0, hCabeza],
        ],
        40,
      ),
      m.mango,
    ),
  );

  // Asiento de la plaquita: caja oscura inclinada el ángulo de posición. Se
  // centra en su propio semialto (ya inclinado) para que no asome por debajo
  // del plano de la punta — y = 0 es la referencia de posicionamiento.
  const anchoAsiento = lado * 1.5;
  const altoAsiento = espesor * 2.4;
  const inclinacion = grados(APROXIMACION - 90);
  const semiAltoAsiento =
    (anchoAsiento * Math.sin(inclinacion) +
      altoAsiento * Math.cos(inclinacion)) /
    2;
  g.add(
    malla(
      prisma(
        anchoAsiento,
        altoAsiento,
        lado * 1.5,
        [rBarra * 0.35, semiAltoAsiento, 0],
        0,
        inclinacion,
      ),
      m.ranura,
    ),
  );

  // ── Plaquita rómbica de 80°, punta de corte justo en el radio nominal ─────
  const dLarga = lado * Math.cos(grados(40)) * 2;
  g.add(
    malla(
      plaquitaRombica(
        lado,
        espesor,
        [r.R - dLarga / 2, espesor * 0.75, 0],
        grados(80),
      ),
      m.inserto,
    ),
  );

  // Tornillo de sujeción, embutido en la plaquita.
  const tornillo = malla(
    cilindro(lado * 0.16, lado * 0.16, espesor * 1.2, espesor * 0.4, 12),
    m.detalle,
  );
  tornillo.position.x = r.R - dLarga / 2;
  g.add(tornillo);

  // ── Cuerpo esbelto ────────────────────────────────────────────────────────
  const lCuerpo = Math.max(r.Lc - hCabeza, r.D * 2);
  g.add(malla(cilindro(rBarra, rBarra, lCuerpo, hCabeza, 40), m.mango));

  // Plano de amarre del mango: es como se aprieta en la torreta / portabarras.
  // Se dimensiona para no salirse del Ø nominal — es un rebaje, no un saliente.
  const yPlano = hCabeza + lCuerpo * 0.55;
  const semiPlano = rBarra * 0.6;
  const xPlano = Math.sqrt(Math.max(rBarra * rBarra - semiPlano * semiPlano, 0));
  g.add(
    malla(
      prisma(
        rBarra * 0.3,
        lCuerpo * 0.4,
        semiPlano * 2,
        [xPlano, yPlano, 0],
      ),
      m.detalle,
    ),
  );

  return g;
}
