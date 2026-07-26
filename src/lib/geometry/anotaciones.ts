// src/lib/geometry/anotaciones.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Acotación — FUNCIONES PURAS (números entran, geometría sale).
//
// Dibuja una cota de taller: dos líneas de referencia y una línea de cota con
// puntas de flecha entre ellas. Se usa para que el VOLADIZO (lo que sobresale
// del portaherramientas) se entienda mirando, sin párrafos de ayuda.
//
// Vive en la librería de geometría, no en la UI, porque el paso de Montaje va a
// necesitar exactamente lo mismo para acotar alturas de amarre y sobre-material.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

export interface OpcionesCota {
  /** Cota inferior (mm) en el eje Y. */
  desde: number;
  /** Cota superior (mm) en el eje Y. */
  hasta: number;
  /** Distancia al eje a la que se dibuja la línea de cota. */
  radio: number;
  /** Longitud de las líneas de referencia horizontales. */
  referencia?: number;
  color?: number;
}

function lineas(
  puntos: Array<[number, number, number]>,
  color: number,
): THREE.LineSegments {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(puntos.flat(), 3),
  );
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
}

/**
 * Cota vertical acotando `hasta - desde` a un lado de la herramienta.
 * Las puntas de flecha son conos: se leen a cualquier distancia de cámara,
 * cosa que un chevrón de líneas pierde al alejar.
 */
export function cotaVertical(o: OpcionesCota): THREE.Group {
  const color = o.color ?? 0x4ea1ff;
  const g = new THREE.Group();
  g.name = "cota";

  const x = o.radio;
  const ref = o.referencia ?? Math.max(o.radio * 0.35, 2);
  const largo = Math.max(o.hasta - o.desde, 1e-3);
  const flecha = Math.min(largo * 0.12, o.radio * 0.28);

  // Líneas de referencia (las que salen de la pieza) + línea de cota.
  g.add(
    lineas(
      [
        [x - ref, o.desde, 0],
        [x + ref * 0.35, o.desde, 0],
        [x - ref, o.hasta, 0],
        [x + ref * 0.35, o.hasta, 0],
        [x, o.desde, 0],
        [x, o.hasta, 0],
      ],
      color,
    ),
  );

  // Puntas de flecha, enfrentadas hacia fuera.
  const matFlecha = new THREE.MeshBasicMaterial({ color });
  for (const [y, giro] of [
    [o.desde, Math.PI],
    [o.hasta, 0],
  ] as Array<[number, number]>) {
    const cono = new THREE.Mesh(
      new THREE.ConeGeometry(flecha * 0.32, flecha, 10),
      matFlecha,
    );
    cono.position.set(x, y + (giro === 0 ? -flecha / 2 : flecha / 2), 0);
    cono.rotation.z = giro;
    g.add(cono);
  }

  return g;
}
