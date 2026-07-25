// src/lib/geometry/materiales.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Materiales de render — funciones puras (construyen objetos nuevos,
// no leen ni escriben nada externo).
//
// Viven en la librería de geometría, no en la UI, porque el paso de Montaje va
// a necesitar exactamente la misma paleta metálica para la mesa del VMC, la
// prensa y las bridas.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

export interface PaletaHerramienta {
  /** Mango / cuerpo de acero. */
  mango: number;
  /** Zona de corte (carburo, HSS, recubrimiento). */
  corte: number;
  /** Fondo de ranura / canal — oscuro, da la lectura de "hueco". */
  ranura: number;
  /** Plaquita intercambiable. */
  inserto: number;
  /** Detalles mecánicos (tornillos, aros, correderas). */
  detalle: number;
}

export const PALETA_HERRAMIENTA: PaletaHerramienta = {
  mango: 0x9aa3ae,
  corte: 0x707a86,
  ranura: 0x232830,
  inserto: 0xd6a63c,
  detalle: 0x4a5361,
};

/**
 * Tinte del filo según el material de la herramienta. Es información real para
 * el operador: un HSS y un carburo recubierto no se ven igual en la mano.
 */
export function colorPorMaterial(material?: string | null): number {
  switch ((material ?? "").toLowerCase()) {
    case "hss":
      return 0x8d8f93; // acero rápido, gris mate
    case "hsse":
      return 0xb08d5a; // cobaltado, tono bronce
    case "carburo":
      return 0x5f6773; // metal duro, gris oscuro
    case "inserto":
      return 0x6d7683;
    default:
      return PALETA_HERRAMIENTA.corte;
  }
}

/** Tinte del recubrimiento (TiAlN violeta, TiN dorado, AlTiN gris azulado…). */
export function colorPorRecubrimiento(recubrimiento?: string | null): number | null {
  const r = (recubrimiento ?? "").toLowerCase();
  if (!r) return null;
  if (r.includes("tialn")) return 0x6b5b8a;
  if (r.includes("altin")) return 0x4f5a6b;
  if (r.includes("tin")) return 0xc9a227;
  if (r.includes("ticn")) return 0x8a6a5a;
  if (r.includes("dlc")) return 0x2f333a;
  return null;
}

export interface MaterialesHerramienta {
  mango: THREE.MeshStandardMaterial;
  corte: THREE.MeshStandardMaterial;
  ranura: THREE.MeshStandardMaterial;
  inserto: THREE.MeshStandardMaterial;
  detalle: THREE.MeshStandardMaterial;
}

export interface OpcionesMateriales {
  material?: string | null;
  recubrimiento?: string | null;
  paleta?: PaletaHerramienta;
}

/**
 * Construye el juego de materiales de una herramienta. Puro: siempre nuevos.
 *
 * `side: DoubleSide` es deliberado. Las familias se modelan con sólidos de
 * revolución y tubos (ver primitivas.ts), que son superficies ABIERTAS en sus
 * extremos; sin doble cara, cualquier extremo destapado se vería como un
 * agujero según el ángulo de cámara.
 */
export function crearMaterialesHerramienta(
  opciones: OpcionesMateriales = {},
): MaterialesHerramienta {
  const paleta = opciones.paleta ?? PALETA_HERRAMIENTA;
  const colorCorte =
    colorPorRecubrimiento(opciones.recubrimiento) ??
    colorPorMaterial(opciones.material);

  return {
    mango: new THREE.MeshStandardMaterial({
      color: paleta.mango,
      metalness: 0.92,
      roughness: 0.28,
      side: THREE.DoubleSide,
    }),
    corte: new THREE.MeshStandardMaterial({
      color: colorCorte,
      metalness: 0.88,
      roughness: 0.34,
      side: THREE.DoubleSide,
    }),
    ranura: new THREE.MeshStandardMaterial({
      color: paleta.ranura,
      metalness: 0.45,
      roughness: 0.7,
      side: THREE.DoubleSide,
    }),
    inserto: new THREE.MeshStandardMaterial({
      color: paleta.inserto,
      metalness: 0.85,
      roughness: 0.3,
      side: THREE.DoubleSide,
    }),
    detalle: new THREE.MeshStandardMaterial({
      color: paleta.detalle,
      metalness: 0.8,
      roughness: 0.45,
      side: THREE.DoubleSide,
    }),
  };
}
