// src/lib/geometry/herramientas/cabezalMandrinado.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Cabezal de mandrinado (boring head) — FUNCIÓN PURA.
//
// Cuerpo + CORREDERA regulable + barrita con plaquita. La excentricidad de la
// corredera es la que fija el Ø mandrinado: al cambiar el diámetro se ve
// deslizar el conjunto, que es el gesto real de reglaje del cabezal.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { cilindro, revolucion, prisma, prismaTriangular, aro } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { malla } from "./comunes";

export function construirCabezalMandrinado(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "cabezal_mandrinado" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "cabezal_mandrinado";

  const tam = Math.min(Math.max(r.tamInserto, r.D * 0.14), r.R * 0.5);
  const rBarra = Math.max(tam * 0.75, 2);

  // Excentricidad: lo que se ha "sacado" la corredera para llegar al Ø pedido.
  // La esquina de la plaquita (vértice del triángulo) queda justo en R.
  const ladoInserto = tam * 1.2;
  const espesorInserto = tam * 0.34;
  const circunradio = ladoInserto / Math.sqrt(3);
  const excentricidad = Math.max(r.R - circunradio, 0);

  // Barrita portaplaquitas — la punta de corte marca y = 0.
  const hBarra = Math.max(r.Lc * 0.55, tam * 3);
  const barra = malla(
    cilindro(rBarra, rBarra, hBarra, espesorInserto, 32),
    m.mango,
  );
  barra.position.x = excentricidad;
  g.add(barra);

  // Plaquita triangular en la punta, con su tornillo.
  g.add(
    malla(
      prismaTriangular(
        ladoInserto,
        espesorInserto,
        [excentricidad, espesorInserto / 2, 0],
        Math.PI / 2,
      ),
      m.inserto,
    ),
  );
  const tornillo = malla(
    cilindro(tam * 0.18, tam * 0.18, tam * 0.45, espesorInserto * 0.8, 12),
    m.detalle,
  );
  tornillo.position.x = excentricidad;
  g.add(tornillo);

  // Corredera: caja que atraviesa la cara inferior del cuerpo y se desplaza.
  const rCuerpo = Math.max(r.R * 0.85, tam * 3);
  const hCorredera = tam * 1.5;
  const yCorredera = espesorInserto + hBarra;
  g.add(
    malla(
      prisma(
        rCuerpo * 1.7,
        hCorredera,
        rCuerpo * 0.8,
        [excentricidad * 0.35, yCorredera + hCorredera / 2, 0],
      ),
      m.detalle,
    ),
  );

  // Cuerpo del cabezal + aro graduado de reglaje.
  const yCuerpo = yCorredera + hCorredera;
  const hCuerpo = Math.max(rCuerpo * 1.5, r.D * 0.7);
  g.add(
    malla(
      revolucion(
        [
          [0, yCuerpo],
          [rCuerpo, yCuerpo],
          [rCuerpo, yCuerpo + hCuerpo * 0.78],
          [rCuerpo * 0.86, yCuerpo + hCuerpo],
          [0, yCuerpo + hCuerpo],
        ],
        48,
      ),
      m.mango,
    ),
  );
  g.add(malla(aro(rCuerpo * 1.02, rCuerpo * 0.07, yCuerpo + hCuerpo * 0.2, 48), m.detalle));

  // Tornillo de reglaje micrométrico en el lateral.
  const lReglaje = rCuerpo * 0.5;
  const reglaje = malla(
    cilindro(tam * 0.28, tam * 0.28, lReglaje, -lReglaje / 2, 16),
    m.detalle,
  );
  reglaje.geometry.rotateZ(Math.PI / 2);
  reglaje.position.set(rCuerpo * 0.92, yCorredera + hCorredera * 0.5, 0);
  g.add(reglaje);

  // Vástago de acoplamiento al husillo.
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

  return g;
}
