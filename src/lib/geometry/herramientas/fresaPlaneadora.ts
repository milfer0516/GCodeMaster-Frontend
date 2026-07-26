// src/lib/geometry/herramientas/fresaPlaneadora.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Fresa planeadora de plaquitas — FUNCIÓN PURA.
//
// Modelada sobre el cabezal de escuadrar a 90° tipo BAP400R / CoroMill 245,
// que es lo que hay en un taller: cuerpo de acoplamiento con AGUJERO DE ÁRBOL,
// plaquitas APKT/APMT en la periferia y cara frontal plana.
//
// TRES RASGOS QUE DEFINEN LA SILUETA (y que antes no estaban):
//
// 1. La ALTURA NO ES PROPORCIONAL AL Ø. En el catálogo real crece muy poco
//    mientras el Ø se dobla, así que la proporción cambia de tejo achaparrado
//    a disco ancho y plano:
//      Ø50  → H 40 mm (Sandvik R245-050Q22)   relación 1.25
//      Ø80  → H 50 mm (Sandvik R245-080Q27)   relación 1.6
//      Ø102 → H 50 mm (Sandvik RA245-102R38)  relación 2.0
//    Ver alturaCuerpoPlaneadora() en parametros.ts.
//
// 2. Es un DISCO CON AGUJERO, no un cilindro macizo: se monta sobre un árbol
//    FMB. El agujero sale de la referencia comercial BAP400R D-d-nT:
//      50-22 · 63-22 · 80-27 · 100-32 · 125-40 · 160-40
//
// 3. Las plaquitas van a 90° (filo principal PARALELO al eje), que es lo que
//    deja pared recta sin salida. Un cabezal a 45° es otra herramienta.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { revolucion, cilindro, prisma, angulosUniformes } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { malla } from "./comunes";

export function construirFresaPlaneadora(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "fresa_planeadora" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "fresa_planeadora";

  const H = r.Lt; // altura del cuerpo (ya desacoplada del Ø)
  const rBore = Math.min(r.agujero / 2, r.R * 0.55);

  // Plaquita: el lado nominal (APKT1604 → 16 mm) va en sentido AXIAL, que es
  // el filo que genera la pared. Se limita para que en un Ø pequeño no ocupe
  // más de lo que el cuerpo puede alojar.
  const lado = Math.min(r.tamInserto, r.R * 0.55, H * 0.42);
  const espesor = lado * 0.3; // salida radial de la plaquita
  const semiTang = lado * 0.5;

  // La ESQUINA de corte debe caer exactamente en el radio nominal: la cara
  // exterior de la plaquita se retrae por Pitágoras, si no el Ø dibujado
  // supera al declarado.
  const alcance = Math.sqrt(Math.max(r.R * r.R - semiTang * semiTang, (r.R * 0.5) ** 2));
  const radioCaraInserto = alcance;
  const radioAsiento = radioCaraInserto - espesor / 2;

  // ── Cuerpo: sólido de revolución ANULAR ───────────────────────────────────
  // El perfil se recorre cerrado (pared interior → cara superior → pared
  // exterior → cara inferior) y al revolucionarlo da un disco con agujero.
  const rNucleo = radioAsiento - espesor * 0.6; // cuerpo bajo las plaquitas
  const hRebaje = lado * 0.95; // faldón donde se alojan las plaquitas
  const rCubo = Math.min(rBore + Math.max(r.D * 0.09, 7), r.R * 0.85); // cubo del agujero

  const perfil: Array<[number, number]> = [
    // pared del agujero, de abajo arriba
    [rBore, 0],
    [rBore, H],
    // cara superior: cubo elevado y luego rebaje hasta el borde
    [rCubo, H],
    [rCubo, H * 0.9],
    [r.R * 0.985, H * 0.9],
    // pared exterior descendiendo hasta el faldón de plaquitas
    [r.R * 0.985, hRebaje],
    [rNucleo, hRebaje * 0.92],
    [rNucleo, 0],
    // cara frontal: rebajada hacia el centro (una planeadora va aliviada)
    [rCubo * 0.92, 0],
    [rCubo * 0.92, H * 0.1],
    [rBore, H * 0.1],
    [rBore, 0],
  ];
  g.add(malla(revolucion(perfil, 64), m.mango));

  // ── Plaquitas + asientos ──────────────────────────────────────────────────
  // El asiento se calcula para quedar SIEMPRE por dentro del Ø nominal: es un
  // hueco fresado en el cuerpo, no puede sobresalir del diámetro de corte.
  const semiTangAsiento = semiTang * 1.25;
  const alcanceAsiento = Math.sqrt(
    Math.max(
      (r.R * 0.99) ** 2 - semiTangAsiento * semiTangAsiento,
      (r.R * 0.5) ** 2,
    ),
  );

  for (const a of angulosUniformes(r.insertos)) {
    const cos = Math.cos(a);
    const sen = -Math.sin(a);
    const altoAsiento = lado * 1.25;

    // Asiento (hueco oscuro): la caja fresada donde apoya la plaquita.
    g.add(
      malla(
        prisma(
          espesor * 1.8,
          altoAsiento,
          semiTangAsiento * 2,
          [
            (alcanceAsiento - espesor * 0.9) * cos,
            altoAsiento / 2,
            (alcanceAsiento - espesor * 0.9) * sen,
          ],
          a,
        ),
        m.ranura,
      ),
    );

    // Plaquita: filo principal PARALELO al eje (90°), esquina de corte en la
    // cara frontal (y = 0) y exactamente en el radio nominal.
    g.add(
      malla(
        prisma(
          espesor,
          lado,
          semiTang * 2,
          [radioAsiento * cos, lado / 2, radioAsiento * sen],
          a,
        ),
        m.inserto,
      ),
    );

    // Tornillo torx, embutido a ras de la cara de la plaquita.
    const tornillo = malla(
      cilindro(lado * 0.17, lado * 0.17, espesor, -espesor / 2, 14),
      m.detalle,
    );
    tornillo.geometry.rotateZ(Math.PI / 2);
    tornillo.geometry.rotateY(a);
    const rTornillo = radioCaraInserto - espesor * 0.5;
    tornillo.position.set(rTornillo * cos, lado * 0.5, rTornillo * sen);
    g.add(tornillo);
  }

  // ── Chaveteros de arrastre en la cara superior ────────────────────────────
  // Dos ranuras diametrales: es como el árbol transmite el par a un cabezal de
  // acoplamiento, y de un vistazo distingue este cuerpo de un disco cualquiera.
  for (const a of angulosUniformes(2)) {
    g.add(
      malla(
        prisma(
          (rCubo - rBore) * 0.95,
          H * 0.12,
          Math.max(r.D * 0.06, 4),
          [
            ((rBore + rCubo) / 2) * Math.cos(a),
            H - H * 0.05,
            ((rBore + rCubo) / 2) * -Math.sin(a),
          ],
          a,
        ),
        m.ranura,
      ),
    );
  }

  // NO se dibuja el árbol FMB. Es otra referencia (se compra aparte) y, sobre
  // todo, taparía el agujero pasante — justo el rasgo que identifica a un
  // cabezal de acoplamiento frente a una fresa de mango.

  return g;
}
