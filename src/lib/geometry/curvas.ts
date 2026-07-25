// src/lib/geometry/curvas.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Curvas paramétricas puras (clases sin estado externo).
//
// Se usan como guía de THREE.TubeGeometry para dibujar las hélices que definen
// visualmente una herramienta de corte: ranuras de fresa, canales de broca y
// filete de rosca de un macho.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

/**
 * Hélice de radio variable (cónica si radioInicio ≠ radioFin).
 * t = 0 en la punta (yInicio), t = 1 al final (yFin).
 */
export class CurvaHelicoidal extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly radioInicio: number,
    private readonly radioFin: number,
    private readonly yInicio: number,
    private readonly yFin: number,
    private readonly vueltas: number,
    private readonly fase = 0,
    /** +1 hélice a derechas, -1 a izquierdas. */
    private readonly sentido = 1,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const angulo =
      this.fase + this.sentido * t * this.vueltas * Math.PI * 2;
    const radio = this.radioInicio + (this.radioFin - this.radioInicio) * t;
    const y = this.yInicio + (this.yFin - this.yInicio) * t;
    return target.set(radio * Math.cos(angulo), y, radio * Math.sin(angulo));
  }
}

/**
 * Filo sobre una punta esférica: recorre el casquete desde el polo (-Y) hasta
 * el ecuador girando en azimut, que es como se ve el filo de una fresa
 * esférica al enrollarse sobre la bola.
 */
export class CurvaFiloEsferico extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly radio: number,
    private readonly yCentro: number,
    private readonly fase = 0,
    /** Giro azimutal total mientras sube del polo al ecuador. */
    private readonly torsion = Math.PI / 5,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    // theta: 0 = polo inferior, PI/2 = ecuador
    const theta = (t * Math.PI) / 2;
    const azimut = this.fase + t * this.torsion;
    const r = this.radio * Math.sin(theta);
    const y = this.yCentro - this.radio * Math.cos(theta);
    return target.set(r * Math.cos(azimut), y, r * Math.sin(azimut));
  }
}

/** Segmento recto (filos rectos de escariador, canales de macho). */
export class CurvaRecta extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly desde: THREE.Vector3,
    private readonly hasta: THREE.Vector3,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return target.lerpVectors(this.desde, this.hasta, t);
  }
}

/**
 * Vueltas de hélice para un ángulo de hélice dado (convención de fabricante:
 * el ángulo se mide respecto al eje). Avance por vuelta = π·D / tan(α).
 */
export function vueltasPorAnguloHelice(
  diametro: number,
  longitud: number,
  anguloGrados: number,
): number {
  const alfa = (anguloGrados * Math.PI) / 180;
  const avancePorVuelta = (Math.PI * diametro) / Math.max(Math.tan(alfa), 1e-3);
  return Math.max(longitud / avancePorVuelta, 0.05);
}
