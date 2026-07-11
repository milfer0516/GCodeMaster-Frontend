// src/modules/cam/utils/stockFaces.ts
//
// PURE domain logic for stock allowance faces (Phase 2A-2).
//
// A StockFace models one of the six faces of the rectangular stock box as a
// first-class entity: its direction key (in the Setup/machine frame), the
// manufacturing role derived from the montaje (apoyo / mecanizado / libre),
// its allowance in mm, and whether it is locked.
//
// This file is the SINGLE place that maps geometry ↔ manufacturing meaning:
//   - deriveStockFaces(setup): assign roles from the Setup (rotation-aware).
//   - resolveStockFace(pickedFaceIndex, setup): map a Viewer-reported box face
//     INDEX → its Setup-frame direction/role. The Viewer never does this.
//   - finalRectDims / validation helpers.
//
// It imports ONLY the Setup domain type + three (for quaternion math). It must
// NEVER import the store or any React/Viewer code — it is pure and testable.

import * as THREE from "three";
import type { Setup } from "./computeSetup";

export type StockFaceDirection =
  | "x_pos"
  | "x_neg"
  | "y_pos"
  | "y_neg"
  | "z_pos"
  | "z_neg";

export type StockFaceRole = "apoyo" | "mecanizado" | "libre";

export interface StockFace {
  direction: StockFaceDirection; // key in the Setup/machine frame
  role: StockFaceRole; // derived from the Setup
  allowance: number; // stock allowance in mm (>= 0)
  locked: boolean; // true for the apoyo face
}

// THREE.BoxGeometry group order (materialIndex 0..5). The Viewer reports the
// picked materialIndex; the DOMAIN maps index → direction here. A stock box is
// built axis-aligned in the machine frame, so its +X geometry side is machine
// +X, etc. This ordering is the contract between Viewer picking and the domain.
export const BOX_FACE_DIRECTIONS: readonly StockFaceDirection[] = [
  "x_pos", // 0 = +X
  "x_neg", // 1 = -X
  "y_pos", // 2 = +Y
  "y_neg", // 3 = -Y
  "z_pos", // 4 = +Z
  "z_neg", // 5 = -Z
] as const;

export const ALL_DIRECTIONS: readonly StockFaceDirection[] = BOX_FACE_DIRECTIONS;

export function oppositeDirection(d: StockFaceDirection): StockFaceDirection {
  switch (d) {
    case "x_pos":
      return "x_neg";
    case "x_neg":
      return "x_pos";
    case "y_pos":
      return "y_neg";
    case "y_neg":
      return "y_pos";
    case "z_pos":
      return "z_neg";
    case "z_neg":
      return "z_pos";
  }
}

// Classify a machine-frame normal to the nearest ±axis direction key.
function classifyMachineNormal(v: THREE.Vector3): StockFaceDirection {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  if (az >= ax && az >= ay) return v.z >= 0 ? "z_pos" : "z_neg";
  if (ay >= ax) return v.y >= 0 ? "y_pos" : "y_neg";
  return v.x >= 0 ? "x_pos" : "x_neg";
}

// Rotate an OCC-frame normal into the machine/Setup frame using the montaje
// rotation. THIS is the "accounts for the montaje rotation" step — we never
// classify raw OCC/world axes, we classify the rotated normal.
function occNormalToMachineDir(
  normalOCC: [number, number, number],
  rotationOCC: [number, number, number, number],
): StockFaceDirection {
  const q = new THREE.Quaternion(
    rotationOCC[0],
    rotationOCC[1],
    rotationOCC[2],
    rotationOCC[3],
  );
  const nMachine = new THREE.Vector3(normalOCC[0], normalOCC[1], normalOCC[2])
    .applyQuaternion(q)
    .normalize();
  return classifyMachineNormal(nMachine);
}

/**
 * Derive the six StockFaces from a Setup: assign roles (apoyo = supportFace
 * direction + locked; mecanizado = machiningFace direction; the other four =
 * libre) and RESET allowances to 0. Rotation-aware: the support/machining OCC
 * normals are rotated into the machine frame before classification.
 */
export function deriveStockFaces(setup: Setup): StockFace[] {
  const supportDir = occNormalToMachineDir(
    setup.supportFace.normalOCC,
    setup.rotationOCC,
  );

  let machiningDir: StockFaceDirection;
  if (setup.machiningFace.faceId !== null) {
    machiningDir = occNormalToMachineDir(
      setup.machiningFace.normalOCC,
      setup.rotationOCC,
    );
  } else {
    // No confidently antiparallel machining face: use the nominal opposite of
    // the support face (points up off the table).
    machiningDir = oppositeDirection(supportDir);
  }

  // Guard: if classification collapses machining onto support (degenerate),
  // fall back to the opposite so we never mark the same face twice.
  if (machiningDir === supportDir) {
    machiningDir = oppositeDirection(supportDir);
  }

  return ALL_DIRECTIONS.map((direction) => {
    const role: StockFaceRole =
      direction === supportDir
        ? "apoyo"
        : direction === machiningDir
          ? "mecanizado"
          : "libre";
    return { direction, role, allowance: 0, locked: role === "apoyo" };
  });
}

/**
 * Map a Viewer-reported picked box face INDEX (BoxGeometry materialIndex 0..5)
 * to its Setup-frame StockFace (direction + role). Returns a role-carrying face
 * with allowance 0 (the caller overlays the current allowance from state).
 *
 * The direction comes from BOX_FACE_DIRECTIONS; the role comes from the
 * rotation-aware derivation — so the mapping accounts for the montaje, never a
 * raw world/screen axis.
 */
export function resolveStockFace(
  pickedFaceIndex: number,
  setup: Setup,
): StockFace | null {
  const direction = BOX_FACE_DIRECTIONS[pickedFaceIndex];
  if (!direction) return null;
  const faces = deriveStockFaces(setup);
  return faces.find((f) => f.direction === direction) ?? null;
}

/**
 * Re-order the current StockFaces into BoxGeometry index order so the Viewer
 * can index by picked face without knowing any direction semantics. Returns an
 * array of length 6 aligned to BOX_FACE_DIRECTIONS (materialIndex).
 */
export function stockFacesByBoxIndex(faces: StockFace[]): StockFace[] {
  return BOX_FACE_DIRECTIONS.map(
    (direction) =>
      faces.find((f) => f.direction === direction) ?? {
        direction,
        role: "libre" as StockFaceRole,
        allowance: 0,
        locked: false,
      },
  );
}

export function getAllowance(
  faces: StockFace[],
  direction: StockFaceDirection,
): number {
  return faces.find((f) => f.direction === direction)?.allowance ?? 0;
}

/**
 * Immutably set one face's allowance. Locked faces are pinned to 0 (attempts to
 * change them are ignored). Negative allowances are clamped to 0.
 */
export function setFaceAllowance(
  faces: StockFace[],
  direction: StockFaceDirection,
  allowance: number,
): StockFace[] {
  return faces.map((f) => {
    if (f.direction !== direction) return f;
    if (f.locked) return { ...f, allowance: 0 };
    return { ...f, allowance: Math.max(0, allowance) };
  });
}

/**
 * Final rectangular stock dimensions in the Setup frame:
 *   axis = rotatedBBox extent + (positive-face allowance) + (negative-face
 *   allowance) on that axis. Independent per face.
 */
export function finalRectDims(
  setup: Setup,
  faces: StockFace[],
): { x: number; y: number; z: number } {
  const { width, depth, height } = setup.rotatedBBox;
  return {
    x: width + getAllowance(faces, "x_pos") + getAllowance(faces, "x_neg"),
    y: depth + getAllowance(faces, "y_pos") + getAllowance(faces, "y_neg"),
    z: height + getAllowance(faces, "z_pos") + getAllowance(faces, "z_neg"),
  };
}

/**
 * Validate faces: allowance must be >= 0, and locked (apoyo) faces must be 0.
 * With allowances >= 0 the stock is always >= the part on every axis, so the
 * only failure modes are data-integrity ones.
 */
export function validateStockFaces(faces: StockFace[]): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  for (const f of faces) {
    if (f.allowance < 0) {
      warnings.push(`Sobre-material negativo en cara ${f.direction}.`);
    }
    if (f.locked && f.allowance !== 0) {
      warnings.push(
        `La cara de apoyo (${f.direction}) debe permanecer en 0 (bloqueada).`,
      );
    }
  }
  return { valid: warnings.length === 0, warnings };
}

// Presentation helper (used by the read-only summary). Kept here so the label
// vocabulary stays with the domain roles, not scattered in components.
export function roleLabel(role: StockFaceRole): string {
  switch (role) {
    case "apoyo":
      return "Apoyo";
    case "mecanizado":
      return "Mecanizado";
    case "libre":
      return "Libre";
  }
}
