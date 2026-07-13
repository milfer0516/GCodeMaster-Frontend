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

// A pickable stock region as the VIEWER needs it: role (for colour), the current
// offset (allowance) and whether it is locked. Both the 6 box faces (StockFace)
// and the 3 cylinder regions satisfy this shape, so the viewer indexes one array
// regardless of stock shape. (StockFace is assignable to StockPickRegion.)
export interface StockPickRegion {
  role: StockFaceRole;
  allowance: number;
  locked: boolean;
}

// ── Cylindrical stock: 3 regions (NOT 6 box faces) ─────────────────────────
//
// A round bar has three physical regions the operator can measure independently:
//   - radial:          uniform material around the OD (OD grows by 2×offset)
//   - axial_machining: the free flat end (away from the fixture)
//   - axial_support:   the end resting on the fixture — LOCKED at 0
// Same principle as the rectangular per-face model: offsets are the source of
// truth, the total (Ø / length) is DERIVED and read-only. The operator declares
// the offsets; the system never infers which region gets material.

export type CylRegionKind = "radial" | "axial_machining" | "axial_support";

export interface CylStock {
  radial: number; // offset on the radius (OD grows by 2× this)
  axialMachining: number; // offset on the free/top flat end
  axialSupport: number; // support end — LOCKED at 0
}

export const CYL_STOCK_INICIAL: CylStock = {
  radial: 0,
  axialMachining: 0,
  axialSupport: 0,
};

// THREE.CylinderGeometry group order (materialIndex): 0 = lateral, 1 = top cap,
// 2 = bottom cap. The viewer builds the cylinder axis along machine +Z with the
// base on the table, so the top cap = machining (up, away from the fixture) and
// the bottom cap = support (on the table). This is the picking contract, the
// cylinder analogue of BOX_FACE_DIRECTIONS.
export const CYL_REGION_BY_INDEX: readonly CylRegionKind[] = [
  "radial", // 0 = lateral surface
  "axial_machining", // 1 = top cap
  "axial_support", // 2 = bottom cap (on the table)
] as const;

export function cylRegionLocked(kind: CylRegionKind): boolean {
  return kind === "axial_support";
}

export function cylRegionRole(kind: CylRegionKind): StockFaceRole {
  return kind === "axial_machining"
    ? "mecanizado"
    : kind === "axial_support"
      ? "apoyo"
      : "libre";
}

export function cylRegionLabel(kind: CylRegionKind): string {
  switch (kind) {
    case "radial":
      return "Radial (Ø)";
    case "axial_machining":
      return "Cara de mecanizado";
    case "axial_support":
      return "Cara de apoyo";
  }
}

export function getCylOffset(cyl: CylStock, kind: CylRegionKind): number {
  return kind === "radial"
    ? cyl.radial
    : kind === "axial_machining"
      ? cyl.axialMachining
      : cyl.axialSupport;
}

/** Immutably set a cylindrical region offset. Negatives clamped to 0; the
 * support region is pinned to 0 (no material against the fixture). */
export function setCylOffset(
  cyl: CylStock,
  kind: CylRegionKind,
  value: number,
): CylStock {
  const v = Math.max(0, value);
  if (kind === "axial_support") return { ...cyl, axialSupport: 0 };
  if (kind === "radial") return { ...cyl, radial: v };
  return { ...cyl, axialMachining: v };
}

/** The 3 cylinder regions in pick-index order (materialIndex 0..2) for the
 * viewer — mirror of stockFacesByBoxIndex for the box. */
export function cylRegionsByIndex(cyl: CylStock): StockPickRegion[] {
  return CYL_REGION_BY_INDEX.map((kind) => ({
    role: cylRegionRole(kind),
    allowance: getCylOffset(cyl, kind),
    locked: cylRegionLocked(kind),
  }));
}

/** Map a viewer-reported picked cylinder region INDEX (0..2) to its region. */
export function resolveCylRegion(index: number): {
  kind: CylRegionKind;
  role: StockFaceRole;
  locked: boolean;
  label: string;
} | null {
  const kind = CYL_REGION_BY_INDEX[index];
  if (!kind) return null;
  return {
    kind,
    role: cylRegionRole(kind),
    locked: cylRegionLocked(kind),
    label: cylRegionLabel(kind),
  };
}

/**
 * Part diameter + length for cylindrical stock.
 *
 * AXIS: mirror the engine's cylinder-axis identification (cam_builder
 * _identificar_eje_cilindro): among the part's (x, y, z) bbox dims, the two
 * CLOSEST form the diameter pair, the odd one is the length. Part-agnostic —
 * never assumes the axis is Z.
 *
 * DIAMETER (P8): prefer the REAL dominant external cylinder's diameter
 * (`dominantCylinderOD`, from setup.partCylinderOD) over the bounding box. The
 * bbox is inflated by lips/torus/chamfers and OVER-reports the OD (phase_1: bbox
 * Ø108.24 vs real Ø100 → nearly 2× error in radial removal, which drives the
 * roughing passes and feeds/speeds and can break tools). The real Ø is trusted
 * only when PLAUSIBLE as an outer diameter: present, not wider than the bbox
 * radial (a cylinder can't exceed its own bbox), and not a tiny boss (≥ half the
 * bbox radial). Otherwise it falls back to the bbox — never guesses.
 *
 * LENGTH: prefer the dominant cylinder's axial length ONLY when it RELIABLY
 * spans the working axis (≈ the bbox extent, within 2%). A dominant cylinder is
 * often just a short band — phase_1's Ø100 spans only 11mm of a 35mm part, and
 * brida's Ø172 only 38mm of 72mm — and trusting that would leave the stock too
 * short (a scrapped part). So when the cylinder is a band, the bbox extent (the
 * full length the stock must cover) wins. Never under-sizes, never guesses.
 */
export function cylPartDims(
  rbb: { width: number; depth: number; height: number },
  dominantCylinderOD?: number | null,
  dominantCylinderLen?: number | null,
): { partOD: number; partLen: number } {
  const x = rbb.width;
  const y = rbb.depth;
  const z = rbb.height;
  const candidates: Array<{ diff: number; diameter: number; length: number }> = [
    { diff: Math.abs(x - y), diameter: (x + y) / 2, length: z },
    { diff: Math.abs(y - z), diameter: (y + z) / 2, length: x },
    { diff: Math.abs(x - z), diameter: (x + z) / 2, length: y },
  ];
  candidates.sort((a, b) => a.diff - b.diff);
  const bboxOD = candidates[0].diameter;
  const bboxLen = candidates[0].length;

  const useRealOD =
    dominantCylinderOD != null &&
    dominantCylinderOD <= bboxOD * 1.02 &&
    dominantCylinderOD >= bboxOD * 0.5;

  const useRealLen =
    dominantCylinderLen != null &&
    dominantCylinderLen >= bboxLen * 0.98 &&
    dominantCylinderLen <= bboxLen * 1.02;

  return {
    partOD: useRealOD ? dominantCylinderOD : bboxOD,
    partLen: useRealLen ? dominantCylinderLen : bboxLen,
  };
}

/** DERIVED read-only cylindrical totals from part dims + offsets. */
export function cylTotals(
  rbb: { width: number; depth: number; height: number },
  cyl: CylStock,
  dominantCylinderOD?: number | null,
  dominantCylinderLen?: number | null,
): { diameter: number; length: number } {
  const { partOD, partLen } = cylPartDims(
    rbb,
    dominantCylinderOD,
    dominantCylinderLen,
  );
  return {
    diameter: partOD + 2 * cyl.radial,
    length: partLen + cyl.axialMachining + cyl.axialSupport, // support locked at 0
  };
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
