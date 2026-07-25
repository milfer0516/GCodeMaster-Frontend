// src/lib/geometry/herramientas/barraMandrinar.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Barra de mandrinar — FUNCIÓN PURA.
//
// Una barra NO es simétrica: el cuerpo es más fino que el agujero y una única
// plaquita, montada excéntrica en la punta, es la que barre el Ø nominal. El
// dibujo lo refleja: la barra queda a un lado y la esquina de corte del
// inserto llega justo a R.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { cilindro, prismaTriangular, prisma, aro } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { mangoCilindrico, malla } from "./comunes";

export function construirBarraMandrinar(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "barra_mandrinar" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "barra_mandrinar";

  const tam = Math.min(Math.max(r.tamInserto, r.D * 0.18), r.R * 0.75);
  const rBarra = Math.max(r.R * 0.68, 2);
  const hCabeza = tam * 1.6;

  // Cabeza de la barra: alojamiento de la plaquita.
  g.add(malla(cilindro(rBarra, rBarra * 0.92, hCabeza, 0, 40), m.mango));

  // Rebaje del asiento (se lee como el hueco donde va la plaquita).
  g.add(
    malla(
      prisma(
        tam * 1.5,
        hCabeza * 0.7,
        tam * 1.2,
        [rBarra * 0.45, hCabeza * 0.42, 0],
      ),
      m.ranura,
    ),
  );

  // Plaquita triangular. Se gira 90° para que un VÉRTICE (la esquina de corte)
  // apunte a +X, y se sitúa a R − circunradio: así la punta barre exactamente
  // el Ø declarado, no uno mayor.
  const ladoInserto = tam * 1.25;
  const espesorInserto = tam * 0.35;
  const circunradio = ladoInserto / Math.sqrt(3);
  g.add(
    malla(
      prismaTriangular(
        ladoInserto,
        espesorInserto,
        [r.R - circunradio, espesorInserto / 2, 0],
        Math.PI / 2,
      ),
      m.inserto,
    ),
  );

  // Tornillo de fijación, centrado sobre la plaquita.
  const tornillo = malla(
    cilindro(tam * 0.2, tam * 0.2, tam * 0.5, tam * 0.5, 12),
    m.detalle,
  );
  tornillo.position.x = r.R - circunradio;
  g.add(tornillo);

  // Cuerpo de la barra + mango de mayor diámetro.
  const yCuerpo = hCabeza;
  const lCuerpo = Math.max(r.Lc - hCabeza, r.D);
  g.add(malla(cilindro(rBarra, rBarra, lCuerpo, yCuerpo, 40), m.mango));
  g.add(malla(aro(rBarra * 1.02, rBarra * 0.06, yCuerpo + lCuerpo, 32), m.detalle));

  g.add(
    mangoCilindrico(
      m,
      Math.max(rBarra * 1.25, r.dMango / 2),
      yCuerpo + lCuerpo,
      Math.max(r.Lt, yCuerpo + lCuerpo + r.D * 1.5),
    ),
  );

  return g;
}
