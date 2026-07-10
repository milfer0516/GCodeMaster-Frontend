// src/modules/cam/utils/computeSetup.ts
//
// PURE domain constructor for a manufacturing "Setup".
//
// A Setup captures the montaje (work-holding orientation) of the part as
// MANUFACTURING TRUTH in the OCC / machine coordinate frame (Z = vertical/up,
// the machine table at Z = 0). It contains NO Three.js / rendering state:
// no viewer base rotation (-90° X), no (nx, nz, -ny) axis swizzle. Those are
// implementation details of one rendering library and live ONLY inside the
// viewer (see CamViewer3D.occToDisplay). Every future consumer — G54/G55,
// postprocessor, toolpath simulation, collision checking, multi-setup DB
// persistence — works in machine coordinates and must never inherit viewer
// conventions.
//
// This function unifies the transform math that currently lives (a) inside
// CamViewer3D's rotation effect (~lines 424-535, expressed in the Three.js
// display frame) and (b) in rotatedBoundingBox.ts (dims only, also display
// frame). Here it is expressed once, in the OCC frame, as pure data.

import * as THREE from "three";
import type { MeshData } from "../services/camService";
import type { SujecionConfig } from "../store/camStore";

// ── Domain Setup type (all fields JSON-serializable: plain numbers/arrays) ──
export interface Setup {
  id: string;
  createdAt: string;
  confirmed: boolean;

  // Faces (machine-frame normals)
  supportFace: { faceId: number; normalOCC: [number, number, number] };
  machiningFace: { faceId: number | null; normalOCC: [number, number, number] };

  // Orientation — OCC / machine frame ONLY. Quaternion [x, y, z, w].
  rotationOCC: [number, number, number, number];
  // Optional convenience: 4x4 column-major (rotationOCC + position), machine frame.
  transformMatrix: number[];

  // Placement on the table, machine frame [x, y, z].
  position: [number, number, number];
  zApoyoMm: number;

  // Post-rotation axis-aligned envelope, machine frame.
  rotatedBBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    width: number; // X extent
    depth: number; // Y extent
    height: number; // Z extent (vertical, OCC up)
  };

  // Setup coordinate frame: part local axes expressed in machine coords,
  // rooted at the provisional work origin.
  axisSystem: {
    origin: [number, number, number];
    x: [number, number, number];
    y: [number, number, number];
    z: [number, number, number];
  };

  // Provisional (pre-G54) work origin: top-centre of the placed part.
  provisionalWorkOrigin: [number, number, number];

  // Snapshot of the sujeción that produced this setup (plain, serializable).
  sujecionConfigRef: SujecionConfig | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeId(): string {
  try {
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* ignore */
  }
  return `setup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const v3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

/**
 * Resolve the authoritative support-face normal in the OCC frame.
 *
 * Prefers analisis.caras_planas[].normal (the sign-corrected, reliable source)
 * and falls back to the tessellation face_normal only if the face is not
 * present in the analysis — matching CamViewer3D effect 4b's preference. This
 * is the ONE place the normal is resolved so downstream data is authoritative.
 */
function resolveSupportNormalOCC(
  meshData: MeshData,
  supportFaceId: number,
  analisis: Record<string, any> | null,
): THREE.Vector3 | null {
  const carasPlanas: any[] = analisis?.caras_planas ?? [];
  const cara = carasPlanas.find((c) => c.face_index === supportFaceId);
  if (cara?.normal && cara.normal.length === 3) {
    const [nx, ny, nz] = cara.normal;
    return new THREE.Vector3(nx, ny, nz).normalize();
  }

  const face = meshData.faces.find((f) => f.face_id === supportFaceId);
  if (face?.face_normal && face.face_normal.length === 3) {
    const [nx, ny, nz] = face.face_normal;
    console.warn(
      `[computeSetup] face ${supportFaceId} not found in analisis.caras_planas; ` +
        `falling back to tessellation face_normal (sign may be unreliable).`,
    );
    return new THREE.Vector3(nx, ny, nz).normalize();
  }

  return null;
}

/**
 * Find the machining face: the planar face most antiparallel to the support
 * face (i.e. the opposite side, which points up after montaje). NEW logic —
 * exists nowhere else today. If no face is confidently antiparallel, faceId is
 * null (with a logged reason); normalOCC still carries the ideal machining
 * direction (-supportNormal) as a nominal value.
 */
function deriveMachiningFace(
  supportNormalOCC: THREE.Vector3,
  supportFaceId: number,
  analisis: Record<string, any> | null,
): { faceId: number | null; normalOCC: [number, number, number] } {
  const idealNormal = supportNormalOCC.clone().negate();
  const ideal: [number, number, number] = v3(idealNormal);

  const carasPlanas: any[] = analisis?.caras_planas ?? [];
  let bestFaceId: number | null = null;
  let bestNormal: [number, number, number] = ideal;
  let bestDot = 0; // we want the most negative dot (closest to -1)

  for (const cara of carasPlanas) {
    if (cara.face_index === supportFaceId) continue;
    if (!cara.normal || cara.normal.length !== 3) continue;
    const n = new THREE.Vector3(cara.normal[0], cara.normal[1], cara.normal[2]).normalize();
    const dot = n.dot(supportNormalOCC);
    if (dot < bestDot) {
      bestDot = dot;
      bestFaceId = cara.face_index;
      bestNormal = v3(n);
    }
  }

  // Require a confidently antiparallel face (dot ≈ -1).
  const THRESHOLD = -0.9;
  if (bestFaceId === null || bestDot > THRESHOLD) {
    console.warn(
      `[computeSetup] no confidently antiparallel machining face found ` +
        `(best dot = ${bestDot.toFixed(3)}, threshold ${THRESHOLD}); ` +
        `storing faceId=null with ideal normal ${JSON.stringify(ideal)}.`,
    );
    return { faceId: null, normalOCC: ideal };
  }

  return { faceId: bestFaceId, normalOCC: bestNormal };
}

// ── Main ─────────────────────────────────────────────────────────────────

/**
 * Build a Setup from the current montaje selections. Pure: data in, Setup out.
 * No Three.js objects escape, no refs are mutated.
 */
export function computeSetup(
  meshData: MeshData,
  supportFaceId: number,
  analisis: Record<string, any> | null,
  sujecionConfig: SujecionConfig | null,
): Setup | null {
  const supportNormalOCC = resolveSupportNormalOCC(meshData, supportFaceId, analisis);
  if (!supportNormalOCC) {
    console.warn(
      `[computeSetup] could not resolve a normal for support face ${supportFaceId}; ` +
        `no Setup created.`,
    );
    return null;
  }

  // Montaje rotation in the OCC/machine frame: rotate the part so the support
  // face normal points DOWN toward the table (OCC -Z). No viewer swizzle, no
  // -90° X base — those are applied only at render time in the viewer.
  const tableDown = new THREE.Vector3(0, 0, -1);
  const rotationOCC = new THREE.Quaternion().setFromUnitVectors(
    supportNormalOCC,
    tableDown,
  );

  // Transform the 8 OCC bounding-box corners by rotationOCC → rotated envelope.
  const min = meshData.bounding_box.min;
  const max = meshData.bounding_box.max;
  const corners: THREE.Vector3[] = [
    [min[0], min[1], min[2]],
    [max[0], min[1], min[2]],
    [min[0], max[1], min[2]],
    [max[0], max[1], min[2]],
    [min[0], min[1], max[2]],
    [max[0], min[1], max[2]],
    [min[0], max[1], max[2]],
    [max[0], max[1], max[2]],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).applyQuaternion(rotationOCC));

  const minX = Math.min(...corners.map((v) => v.x));
  const maxX = Math.max(...corners.map((v) => v.x));
  const minY = Math.min(...corners.map((v) => v.y));
  const maxY = Math.max(...corners.map((v) => v.y));
  const minZ = Math.min(...corners.map((v) => v.z));
  const maxZ = Math.max(...corners.map((v) => v.z));

  const width = maxX - minX; // X extent
  const depth = maxY - minY; // Y extent
  const height = maxZ - minZ; // Z extent (vertical)

  const zApoyoMm = sujecionConfig?.envolvente?.z_apoyo_mm ?? 0;

  // Machine-frame placement: centre the part footprint over (0, 0) and rest its
  // base on the table at Z = 0, lifted by z_apoyo_mm. Mirrors CamViewer3D 4b's
  // display-frame placement, but here in OCC coordinates.
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const position: [number, number, number] = [
    -centerX,
    -centerY,
    -minZ + zApoyoMm,
  ];

  // Rotated envelope re-expressed relative to the placed part (world machine
  // frame): footprint centred at origin, base at zApoyoMm, top at + height.
  const rotatedBBox = {
    min: [-width / 2, -depth / 2, zApoyoMm] as [number, number, number],
    max: [width / 2, depth / 2, zApoyoMm + height] as [number, number, number],
    center: [0, 0, zApoyoMm + height / 2] as [number, number, number],
    width,
    depth,
    height,
  };

  // Provisional (pre-G54) work origin: top-centre of the placed part.
  const provisionalWorkOrigin: [number, number, number] = [
    0,
    0,
    zApoyoMm + height,
  ];

  // Setup axis system: the part's local axes expressed in machine coords.
  const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(rotationOCC);
  const ay = new THREE.Vector3(0, 1, 0).applyQuaternion(rotationOCC);
  const az = new THREE.Vector3(0, 0, 1).applyQuaternion(rotationOCC);
  const axisSystem = {
    origin: provisionalWorkOrigin,
    x: v3(ax) as [number, number, number],
    y: v3(ay) as [number, number, number],
    z: v3(az) as [number, number, number],
  };

  // Convenience 4x4 (rotationOCC + position), machine frame, column-major.
  const transformMatrix = Array.from(
    new THREE.Matrix4()
      .compose(
        new THREE.Vector3(position[0], position[1], position[2]),
        rotationOCC,
        new THREE.Vector3(1, 1, 1),
      )
      .elements,
  );

  const machiningFace = deriveMachiningFace(
    supportNormalOCC,
    supportFaceId,
    analisis,
  );

  return {
    id: makeId(),
    createdAt: new Date().toISOString(),
    confirmed: true,
    supportFace: {
      faceId: supportFaceId,
      normalOCC: v3(supportNormalOCC),
    },
    machiningFace,
    rotationOCC: [rotationOCC.x, rotationOCC.y, rotationOCC.z, rotationOCC.w],
    transformMatrix,
    position,
    zApoyoMm,
    rotatedBBox,
    axisSystem,
    provisionalWorkOrigin,
    sujecionConfigRef: sujecionConfig,
  };
}
