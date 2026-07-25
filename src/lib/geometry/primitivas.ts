// src/lib/geometry/primitivas.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Primitivas paramétricas — FUNCIONES PURAS.
//
// Números entran, THREE.BufferGeometry sale. Sin React, sin stores, sin props,
// sin efectos: cualquiera de estas funciones puede llamarse desde un script
// plano de Node/Vitest y devuelve geometría verificable.
//
// CONVENCIÓN DE EJES (toda la librería): el eje de la herramienta es +Y, la
// PUNTA está en y = 0 y el cuerpo crece hacia +Y. Es la orientación con la que
// una herramienta cuelga del husillo, así que el paso de Montaje y el
// simulador pueden colocar el mismo objeto sin recalcular nada.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

/** Cilindro con la BASE apoyada en `yBase` y el eje en +Y. */
export function cilindro(
  radioSuperior: number,
  radioInferior: number,
  altura: number,
  yBase: number,
  segmentos = 48,
  tapas = true,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(
    Math.max(radioSuperior, 0),
    Math.max(radioInferior, 0),
    Math.max(altura, 1e-4),
    segmentos,
    1,
    !tapas,
  );
  geo.translate(0, yBase + Math.max(altura, 1e-4) / 2, 0);
  return geo;
}

/**
 * Sólido de revolución alrededor de +Y a partir de un perfil `[radio, y]`.
 * Es la primitiva más útil del módulo: puntas cónicas, radios de esquina,
 * avellanados y chaflanes salen exactos de aquí, sin booleanas.
 */
export function revolucion(
  perfil: Array<[number, number]>,
  segmentos = 48,
): THREE.BufferGeometry {
  const puntos = perfil.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y));
  return new THREE.LatheGeometry(puntos, segmentos);
}

/** Arco de circunferencia como lista de puntos de perfil (para `revolucion`). */
export function arcoPerfil(
  centroR: number,
  centroY: number,
  radio: number,
  anguloInicio: number,
  anguloFin: number,
  pasos = 12,
): Array<[number, number]> {
  const puntos: Array<[number, number]> = [];
  for (let i = 0; i <= pasos; i++) {
    const a = anguloInicio + ((anguloFin - anguloInicio) * i) / pasos;
    puntos.push([centroR + radio * Math.cos(a), centroY + radio * Math.sin(a)]);
  }
  return puntos;
}

/** Hemisferio con el polo hacia -Y (punta de fresa esférica) centrado en `yCentro`. */
export function hemisferioInferior(
  radio: number,
  yCentro: number,
  segmentos = 48,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(
    radio,
    segmentos,
    Math.max(8, segmentos / 3),
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2,
  );
  geo.translate(0, yCentro, 0);
  return geo;
}

/** Tubo a lo largo de una curva — usado para ranuras helicoidales y roscas. */
export function tubo(
  curva: THREE.Curve<THREE.Vector3>,
  radio: number,
  segmentosCurva: number,
  segmentosRadiales = 8,
): THREE.BufferGeometry {
  return new THREE.TubeGeometry(
    curva,
    Math.max(8, Math.round(segmentosCurva)),
    Math.max(radio, 1e-4),
    segmentosRadiales,
    false,
  );
}

/**
 * Prisma rectangular colocado y orientado.
 * `giroY` gira alrededor del eje de la herramienta; `inclinacion` lo bascula
 * (ángulo de posición de los insertos, por ejemplo).
 */
export function prisma(
  ancho: number,
  alto: number,
  fondo: number,
  posicion: [number, number, number],
  giroY = 0,
  inclinacion = 0,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(
    Math.max(ancho, 1e-4),
    Math.max(alto, 1e-4),
    Math.max(fondo, 1e-4),
  );
  if (inclinacion) geo.rotateZ(inclinacion);
  if (giroY) geo.rotateY(giroY);
  geo.translate(posicion[0], posicion[1], posicion[2]);
  return geo;
}

/** Prisma triangular (inserto de barra de mandrinar / plaquita triangular). */
export function prismaTriangular(
  lado: number,
  espesor: number,
  posicion: [number, number, number],
  giroY = 0,
): THREE.BufferGeometry {
  const forma = new THREE.Shape();
  const r = lado / Math.sqrt(3);
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (i === 0) forma.moveTo(x, y);
    else forma.lineTo(x, y);
  }
  forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: espesor,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -espesor / 2);
  geo.rotateX(-Math.PI / 2); // plano de la plaquita perpendicular al eje
  if (giroY) geo.rotateY(giroY);
  geo.translate(posicion[0], posicion[1], posicion[2]);
  return geo;
}

/** Anillo/aro (aro graduado del cabezal, tope de mango). */
export function aro(
  radio: number,
  grosor: number,
  y: number,
  segmentos = 48,
): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(radio, grosor, 10, segmentos);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, y, 0);
  return geo;
}

/** Reparte `n` posiciones angulares uniformes (dientes, insertos, filos). */
export function angulosUniformes(n: number, fase = 0): number[] {
  const total = Math.max(1, Math.round(n));
  return Array.from({ length: total }, (_, i) => fase + (i * 2 * Math.PI) / total);
}

/** Convierte grados a radianes (sin depender de utilidades de UI). */
export const grados = (g: number): number => (g * Math.PI) / 180;
