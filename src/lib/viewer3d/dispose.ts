// src/lib/viewer3d/dispose.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 1 · Visor genérico — utilidades de liberación de memoria GPU.
//
// Función PURA sobre objetos Three.js: no conoce React, ni stores, ni dominio.
// Se usa cada vez que el visor reemplaza su contenido (el visor es dueño del
// objeto que se le entrega) y cuando se desmonta.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

/** Libera geometrías y materiales de un subárbol completo. Tolera null. */
export function liberarObjeto3D(raiz: THREE.Object3D | null | undefined): void {
  if (!raiz) return;

  raiz.traverse((obj) => {
    const conGeometria = obj as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    conGeometria.geometry?.dispose();

    const material = conGeometria.material;
    if (Array.isArray(material)) {
      material.forEach((m) => m?.dispose());
    } else {
      material?.dispose();
    }
  });
}
