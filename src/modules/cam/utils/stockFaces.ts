// src/modules/cam/utils/stockFaces.ts
//
// VIEWER-CENTRIC per-face stock capture (Phase 2B).
//
// A StockFace models one of the six faces of the rectangular stock box:
//   - direction: Setup-frame key (x_pos, y_neg, etc.)
//   - role: visual presentation (apoyo=support, mecanizado=machining, libre=free)
//   - allowance: how much RAW MATERIAL sits on that face (operator measured it)
//   - locked: true for apoyo (no material against the clamp)
//
// ARCHITECTURAL PRINCIPLE: Viewer-centric interaction is CORE to this product.
// Wherever the 3D viewer shows the solid, face-picking must work. The operator
// POINTS at the physical face (never interprets coordinate labels). The anchored
// contextual popover is the preferred interaction.
//
// The 'allowance' field now carries REAL MEASURED DATA: how much raw material
// the operator measured with a caliper on that specific face. Raw stock is almost
// never centered: a 120mm block for a 104mm part has 16mm extra, but rarely 8mm
// on each side. The operator knows the real distribution because they measured it.
// Capturing it per-face is DATA — assuming it's centered would be guessing, which
// this system never does. Both overall raw dims (what they bought) AND per-face
// distribution (how the excess sits) are sent to the engine.
//
// The frontend CAPTURES (including per-face) and PAINTS the engine's response.
// The engine does ALL calculation (raw−final, /2 radial, passes, feeds, speeds).
//
// This file is PURE: imports ONLY Setup + three. NEVER the store or React/Viewer.

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
  role: StockFaceRole; // derived from the Setup (for viewer presentation)
  allowance: number; // Phase 2B: RAW MATERIAL on this face (operator measured with caliper)
  locked: boolean; // true for the apoyo face (no material against the clamp)
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
 * Immutably set raw material on one face (operator measured with caliper).
 * Locked faces (apoyo) are pinned to 0. Negative values clamped to 0.
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

// ── Axis ↔ face mapping + form-total conversion (Phase 2B bidirectional sync) ──
//
// SINGLE SOURCE OF TRUTH = per-face excess (StockFace.allowance). The form's
// per-axis TOTAL is DERIVED: total_on_axis = part_dimension + excess_pos + excess_neg.
// These helpers convert between the two so the form and the popover always touch
// the SAME underlying data and can never contradict each other.

export type StockAxis = "x" | "y" | "z";

interface AxisSpec {
  axis: StockAxis;
  pos: StockFaceDirection;
  neg: StockFaceDirection;
}

// rotatedBBox: width = X extent, depth = Y extent, height = Z extent.
const AXES: readonly AxisSpec[] = [
  { axis: "x", pos: "x_pos", neg: "x_neg" },
  { axis: "y", pos: "y_pos", neg: "y_neg" },
  { axis: "z", pos: "z_pos", neg: "z_neg" },
] as const;

export function axisOfDirection(direction: StockFaceDirection): StockAxis {
  return direction[0] as StockAxis; // "x_pos" → "x", etc.
}

// Part dimension along a machine axis (from the Setup's post-montaje envelope).
export function partDimOnAxis(setup: Setup, axis: StockAxis): number {
  const rbb = setup.rotatedBBox;
  return axis === "x" ? rbb.width : axis === "y" ? rbb.depth : rbb.height;
}

/**
 * DERIVED total on an axis = part dimension + excess on the + face + excess on
 * the − face. Reads BOTH faces of the axis (including the opposite one) so the
 * form total always stays consistent with the per-face allowances.
 */
export function totalOnAxis(
  faces: StockFace[],
  setup: Setup,
  axis: StockAxis,
): number {
  const spec = AXES.find((a) => a.axis === axis);
  if (!spec) return 0;
  return (
    partDimOnAxis(setup, axis) +
    getAllowance(faces, spec.pos) +
    getAllowance(faces, spec.neg)
  );
}

/**
 * FORM → FACES: convert a typed per-axis TOTAL into per-face excess, immutably.
 * The excess (total − part, clamped ≥ 0) is distributed:
 *   - Support axis (one face is the locked apoyo face): ALL excess goes to the
 *     machining (non-locked) face; the support face stays pinned at 0. No raw
 *     material can exist between the part and the fixture.
 *   - Free axis (neither face locked): split symmetrically, half on each face.
 * The wireframe updates automatically because it already reads the allowances.
 */
export function setAxisTotal(
  faces: StockFace[],
  setup: Setup,
  axis: StockAxis,
  total: number,
): StockFace[] {
  const spec = AXES.find((a) => a.axis === axis);
  if (!spec) return faces;

  const excess = Math.max(0, total - partDimOnAxis(setup, axis));
  const posLocked = faces.find((f) => f.direction === spec.pos)?.locked ?? false;
  const negLocked = faces.find((f) => f.direction === spec.neg)?.locked ?? false;

  if (posLocked || negLocked) {
    const machiningDir = posLocked ? spec.neg : spec.pos;
    const supportDir = posLocked ? spec.pos : spec.neg;
    let out = setFaceAllowance(faces, machiningDir, excess);
    out = setFaceAllowance(out, supportDir, 0);
    return out;
  }

  const half = excess / 2;
  let out = setFaceAllowance(faces, spec.pos, half);
  out = setFaceAllowance(out, spec.neg, half);
  return out;
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
