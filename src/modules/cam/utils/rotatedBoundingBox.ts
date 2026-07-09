import * as THREE from "three";
import type { MeshData } from "../services/camService";

/**
 * Compute the axis-aligned bounding box of a part after applying a rotation
 * based on the selected support face from StepMontaje.
 *
 * This transforms all 8 corners of the original OCC bounding box by the
 * rotation quaternion, then computes the new axis-aligned min/max envelope.
 *
 * @param meshData - Original mesh data with bounding box in OCC coordinates
 * @param faceNormal - Normal vector [nx, ny, nz] of the selected support face (from analisis.caras_planas)
 * @returns Object with transformed bounding box dimensions { width, depth, height } in Three.js coordinates (Y=up)
 */
export function computeRotatedBoundingBox(
  meshData: MeshData,
  faceNormal: number[] | null
): { width: number; depth: number; height: number } {
  const bb = meshData.bounding_box;

  // If no face normal (no rotation applied), use original bounding box
  if (!faceNormal) {
    const piezaWidth = bb.max[0] - bb.min[0];   // OCC X
    const piezaDepth = bb.max[1] - bb.min[1];   // OCC Y
    const piezaHeight = bb.max[2] - bb.min[2];  // OCC Z
    return { width: piezaWidth, depth: piezaDepth, height: piezaHeight };
  }

  // Compute rotation quaternion that makes the support face normal point downward (toward -Y in Three.js)
  // This matches the rotation logic in CamViewer3D.tsx lines 438-451
  const [nx, ny, nz] = faceNormal;
  const normalThree = new THREE.Vector3(nx, nz, -ny).normalize(); // OCC→Three.js conversion
  const targetDown = new THREE.Vector3(0, -1, 0);

  // Quaternion to rotate normal to point down
  const qDelta = new THREE.Quaternion();
  qDelta.setFromUnitVectors(normalThree, targetDown);

  // Compose with base -90° X rotation (OCC Z→Three.js Y)
  const baseQ = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );
  const qTarget = qDelta.multiply(baseQ);

  // Transform all 8 corners of the OCC bounding box
  const corners: THREE.Vector3[] = [
    [bb.min[0], bb.min[1], bb.min[2]],
    [bb.max[0], bb.min[1], bb.min[2]],
    [bb.min[0], bb.max[1], bb.min[2]],
    [bb.max[0], bb.max[1], bb.min[2]],
    [bb.min[0], bb.min[1], bb.max[2]],
    [bb.max[0], bb.min[1], bb.max[2]],
    [bb.min[0], bb.max[1], bb.max[2]],
    [bb.max[0], bb.max[1], bb.max[2]],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).applyQuaternion(qTarget));

  // Compute new axis-aligned bounding box in Three.js coordinates
  const minX = Math.min(...corners.map((v) => v.x));
  const maxX = Math.max(...corners.map((v) => v.x));
  const minY = Math.min(...corners.map((v) => v.y));
  const maxY = Math.max(...corners.map((v) => v.y));
  const minZ = Math.min(...corners.map((v) => v.z));
  const maxZ = Math.max(...corners.map((v) => v.z));

  // Return dimensions in Three.js frame (X=width, Y=height, Z=depth)
  return {
    width: maxX - minX,   // Three.js X
    height: maxY - minY,  // Three.js Y (up)
    depth: maxZ - minZ,   // Three.js Z
  };
}
