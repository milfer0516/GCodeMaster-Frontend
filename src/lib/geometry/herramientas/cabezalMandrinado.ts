// src/lib/geometry/herramientas/cabezalMandrinado.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Cabezal de mandrinado de afino — FUNCIÓN PURA.
//
// Modelado sobre la familia BIG KAISER EWN, que es el cabezal de referencia.
// TRES RASGOS lo identifican de un vistazo, y los tres se dibujan:
//
//   1. ARO GRADUADO GRANDE — el disco de lectura con su vernier ocupa casi
//      todo el diámetro del cuerpo. Es lo primero que se ve en la foto de un
//      EWN, más que el propio cuerpo.
//   2. TORNILLO MICROMÉTRICO — husillo radial con cabeza moleteada; es lo que
//      se gira para corregir el Ø en centésimas.
//   3. CORREDERA EN COLA DE MILANO — la guía trapezoidal que lleva el
//      portaplaquitas desplazado del eje. Una caja recta no se lee como guía.
//
// El desplazamiento de la corredera ES el reglaje: al cambiar el Ø se ve
// deslizar el conjunto, que es el gesto real de puesta a punto.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import {
  cilindro,
  revolucion,
  prisma,
  colaMilano,
  plaquitaRombica,
  aro,
  angulosUniformes,
  grados,
} from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { malla } from "./comunes";

/** Divisiones del tambor graduado (una vuelta del micrométrico). */
const DIVISIONES = 24;

export function construirCabezalMandrinado(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "cabezal_mandrinado" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "cabezal_mandrinado";

  const tam = Math.min(Math.max(r.tamInserto, r.D * 0.14), r.R * 0.5);
  const espesor = tam * 0.34;
  const lado = tam * 1.2;
  const circunradio = lado / Math.sqrt(3);

  // Excentricidad de la corredera: lo que hay que sacarla para dar el Ø.
  const dLarga = lado * Math.cos(grados(40)) * 2;
  const excentricidad = Math.max(r.R - dLarga / 2, 0);

  // ── 1 · Plaquita en la punta (y = 0 es el plano de corte) ────────────────
  g.add(
    malla(
      plaquitaRombica(
        lado,
        espesor,
        [excentricidad, espesor / 2, 0],
        grados(80),
      ),
      m.inserto,
    ),
  );
  const tornilloPlaquita = malla(
    cilindro(tam * 0.16, tam * 0.16, espesor * 1.1, espesor * 0.4, 12),
    m.detalle,
  );
  tornilloPlaquita.position.x = excentricidad;
  g.add(tornilloPlaquita);

  // ── 2 · Portaplaquitas ───────────────────────────────────────────────────
  const hPorta = tam * 2.2;
  g.add(
    malla(
      prisma(
        tam * 1.3,
        hPorta,
        tam * 1.3,
        [excentricidad - tam * 0.2, espesor + hPorta / 2, 0],
      ),
      m.mango,
    ),
  );

  // ── 3 · Corredera en COLA DE MILANO ──────────────────────────────────────
  const rCuerpo = Math.max(r.R * 0.72, tam * 2.6);
  const yCorredera = espesor + hPorta;
  const hCorredera = tam * 1.35;
  g.add(
    malla(
      colaMilano(
        rCuerpo * 0.9, // ancho arriba
        rCuerpo * 1.25, // ancho abajo → sección trapezoidal
        hCorredera,
        rCuerpo * 2.05,
        [excentricidad * 0.4, yCorredera + hCorredera / 2, 0],
      ),
      m.detalle,
    ),
  );

  // ── 4 · Cuerpo + ARO GRADUADO ────────────────────────────────────────────
  const yCuerpo = yCorredera + hCorredera;
  const hCuerpo = Math.max(rCuerpo * 1.55, r.D * 0.75);
  g.add(
    malla(
      revolucion(
        [
          [0, yCuerpo],
          [rCuerpo, yCuerpo],
          [rCuerpo, yCuerpo + hCuerpo * 0.72],
          [rCuerpo * 0.82, yCuerpo + hCuerpo * 0.88],
          [rCuerpo * 0.82, yCuerpo + hCuerpo],
          [0, yCuerpo + hCuerpo],
        ],
        48,
      ),
      m.mango,
    ),
  );

  // Tambor graduado: aro saliente + divisiones grabadas. Es el rasgo que
  // distingue un cabezal de AFINO de un simple portabarras.
  const yAro = yCuerpo + hCuerpo * 0.34;
  const rAro = rCuerpo * 1.06;
  const hAro = hCuerpo * 0.3;
  g.add(
    malla(
      revolucion(
        [
          [rCuerpo * 0.99, yAro - hAro / 2],
          [rAro, yAro - hAro / 2],
          [rAro, yAro + hAro / 2],
          [rCuerpo * 0.99, yAro + hAro / 2],
        ],
        48,
      ),
      m.detalle,
    ),
  );

  for (const [i, a] of angulosUniformes(DIVISIONES).entries()) {
    const larga = i % 4 === 0; // marca principal cada 4 divisiones
    g.add(
      malla(
        prisma(
          rAro * 0.055,
          larga ? hAro * 0.62 : hAro * 0.34,
          rAro * 0.028,
          [rAro * 0.995 * Math.cos(a), yAro, rAro * 0.995 * -Math.sin(a)],
          a,
        ),
        m.ranura,
      ),
    );
  }

  // ── 5 · Tornillo MICROMÉTRICO radial, con cabeza moleteada ───────────────
  const lHusillo = rCuerpo * 0.55;
  const husillo = malla(
    cilindro(tam * 0.3, tam * 0.3, lHusillo, -lHusillo / 2, 16),
    m.detalle,
  );
  husillo.geometry.rotateZ(Math.PI / 2);
  husillo.position.set(rCuerpo + lHusillo * 0.35, yAro, 0);
  g.add(husillo);

  const cabeza = malla(
    cilindro(tam * 0.52, tam * 0.52, tam * 0.5, -tam * 0.25, 18),
    m.mango,
  );
  cabeza.geometry.rotateZ(Math.PI / 2);
  cabeza.position.set(rCuerpo + lHusillo * 0.75, yAro, 0);
  g.add(cabeza);

  // ── 6 · Vástago de acoplamiento al husillo ───────────────────────────────
  const rVastago = Math.max(rCuerpo * 0.45, 6);
  const yVastago = yCuerpo + hCuerpo;
  g.add(
    malla(
      cilindro(
        rVastago,
        rVastago,
        Math.max(r.Lt - yVastago, r.D * 0.8),
        yVastago,
        40,
      ),
      m.mango,
    ),
  );
  g.add(malla(aro(rVastago * 1.15, rVastago * 0.09, yVastago + 1, 32), m.detalle));

  return g;
}
