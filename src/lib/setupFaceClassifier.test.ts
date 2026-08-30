// src/lib/setupFaceClassifier.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests del clasificador puro. Sin runner instalado en el repo: se ejecutan con
// el test runner nativo de Node y el strip-types nativo:
//
//   node --experimental-strip-types --test src/lib/setupFaceClassifier.test.ts
//
// Usan `node:test` + `node:assert` (tipados por @types/node), así `tsc --noEmit`
// también los compila sin dependencias extra.
// ─────────────────────────────────────────────────────────────────────────────
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  clasificarOrientacionCara,
  etiquetarOperacion,
  type FaceMachineOrientation,
} from "./setupFaceClassifier.ts";

/**
 * Rotación de montaje que lleva la normal de la cara de apoyo a la mesa (OCC -Z),
 * exactamente como computeSetup. Devuelve el cuaternión [x,y,z,w].
 */
function rotDesdeApoyo(
  nx: number,
  ny: number,
  nz: number,
): [number, number, number, number] {
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(nx, ny, nz).normalize(),
    new THREE.Vector3(0, 0, -1),
  );
  return [q.x, q.y, q.z, q.w];
}

const IDENTIDAD: [number, number, number, number] = [0, 0, 0, 1];

// Ejes CAD que probaremos como normal de la cara de apoyo.
const EJES: Array<{ nombre: string; n: [number, number, number] }> = [
  { nombre: "+Z", n: [0, 0, 1] },
  { nombre: "-Z", n: [0, 0, -1] },
  { nombre: "+X", n: [1, 0, 0] },
  { nombre: "-X", n: [-1, 0, 0] },
  { nombre: "+Y", n: [0, 1, 0] },
  { nombre: "-Y", n: [0, -1, 0] },
];

// ── 6 casos mínimos: apoyo en cada eje → la cara OPUESTA queda arriba ─────────
// Cualquiera sea la orientación CAD de la cara de apoyo, tras el montaje la cara
// opuesta mira hacia +Z de máquina y debe leerse "cara superior". Esto es el
// corazón del bug: la etiqueta se reexpresa en el marco de máquina.
for (const { nombre, n } of EJES) {
  test(`apoyo en ${nombre}: la cara de apoyo es APOYO y la opuesta SUPERIOR`, () => {
    const rot = rotDesdeApoyo(n[0], n[1], n[2]);
    const SUPPORT = 1;
    const OPUESTA = 2;

    // La cara de apoyo, por su faceId, siempre es APOYO.
    assert.equal(
      clasificarOrientacionCara({
        faceId: SUPPORT,
        normalOCC: n,
        supportFaceId: SUPPORT,
        rotationOCC: rot,
      }),
      "APOYO",
    );

    // La cara opuesta (normal = -apoyo) queda arriba → SUPERIOR.
    assert.equal(
      clasificarOrientacionCara({
        faceId: OPUESTA,
        normalOCC: [-n[0], -n[1], -n[2]],
        supportFaceId: SUPPORT,
        rotationOCC: rot,
      }),
      "SUPERIOR",
    );
  });
}

// ── Mapeo directo de los seis ejes con rotación identidad ────────────────────
// Con apoyo en -Z (montaje sin voltear), las normales CAD caen en su eje de
// máquina homónimo. Cubre laterales ±X / ±Y explícitamente.
test("rotación identidad: cada normal cae en su lateral/superior", () => {
  const casos: Array<{ n: [number, number, number]; esperado: FaceMachineOrientation }> = [
    { n: [0, 0, 1], esperado: "SUPERIOR" },
    { n: [1, 0, 0], esperado: "LATERAL_X_POS" },
    { n: [-1, 0, 0], esperado: "LATERAL_X_NEG" },
    { n: [0, 1, 0], esperado: "LATERAL_Y_POS" },
    { n: [0, -1, 0], esperado: "LATERAL_Y_NEG" },
  ];
  for (const { n, esperado } of casos) {
    assert.equal(
      clasificarOrientacionCara({
        faceId: 10,
        normalOCC: n,
        supportFaceId: 99, // distinto → no es apoyo
        rotationOCC: IDENTIDAD,
      }),
      esperado,
      `normal ${JSON.stringify(n)}`,
    );
  }
});

// ── OPUESTA_APOYO: una cara que mira a la mesa sin ser la de apoyo ────────────
test("cara que mira -Z sin ser la de apoyo → OPUESTA_APOYO", () => {
  assert.equal(
    clasificarOrientacionCara({
      faceId: 5, // no es la de apoyo
      normalOCC: [0, 0, -1],
      supportFaceId: 1,
      rotationOCC: IDENTIDAD,
    }),
    "OPUESTA_APOYO",
  );
});

// ── Fallback CILINDRICA: normal oblicua no alineada con ningún eje ────────────
test("normal oblicua → CILINDRICA (catch-all)", () => {
  const s = Math.SQRT1_2;
  assert.equal(
    clasificarOrientacionCara({
      faceId: 5,
      normalOCC: [s, s, 0],
      supportFaceId: 1,
      rotationOCC: IDENTIDAD,
    }),
    "CILINDRICA",
  );
});

// ── Caso placa: apoyo en Z=22 (normal +Z) voltea la pieza ────────────────────
test("placa apoyada por su cara +Z: la cara Z=0 (normal -Z) se lee SUPERIOR", () => {
  const rot = rotDesdeApoyo(0, 0, 1); // apoyo mira +Z en CAD
  assert.equal(
    clasificarOrientacionCara({
      faceId: 2,
      normalOCC: [0, 0, -1], // la otra cara plana
      supportFaceId: 1,
      rotationOCC: rot,
    }),
    "SUPERIOR",
  );
});

// ── etiquetarOperacion: composición de la descripción ────────────────────────
// El motor pega tipo y cara ("Planeado cara superior — dims") y anexa "(Z=…)",
// una coordenada CAD que tras el montaje engaña. La descripción de máquina se
// COMPONE (tipo + orientación + dims), no se parchea sobre el string original.
test("planeado: compone tipo + orientación + dims y retira el sufijo (Z=…)", () => {
  const r = etiquetarOperacion({
    tipo: "planeado",
    descripcion: "Planeado cara superior — 246.0 × 246.0 mm (Z=22.0mm)",
    faceIndices: [9],
    supportFaceId: 9, // esta cara ES la de apoyo tras el montaje
    rotationOCC: IDENTIDAD,
    normalPorCara: (id) => (id === 9 ? [0, 0, -1] : null),
  });
  assert.equal(r.descripcion, "Planeado — cara de apoyo — 246.0 × 246.0 mm");
  assert.equal(r.orientacion, "APOYO");
  assert.equal(
    r.refCad,
    "Ref. CAD: Planeado cara superior — 246.0 × 246.0 mm (Z=22.0mm) · face_index: 9",
  );
});

// Regresión del bug de concatenación: el rótulo de orientación aparece UNA sola
// vez y la descripción de máquina NO arrastra la cara del CAD ("cara superior").
test("no duplica el nombre de cara: la orientación aparece una sola vez", () => {
  const r = etiquetarOperacion({
    tipo: "planeado",
    descripcion: "Planeado cara superior — 246.0 × 246.0 mm (Z=22.0mm)",
    faceIndices: [9],
    supportFaceId: 9,
    rotationOCC: IDENTIDAD,
    normalPorCara: (id) => (id === 9 ? [0, 0, -1] : null),
  });
  const veces = (s: string, sub: string) => s.split(sub).length - 1;
  // "cara" solo en "cara de apoyo".
  assert.equal(veces(r.descripcion.toLowerCase(), "cara"), 1);
  // No sobrevive el nombre CAD pegado al tipo.
  assert.ok(!r.descripcion.includes("Planeado cara"));
  assert.ok(!r.descripcion.toLowerCase().includes("cara superior"));
});

test("contorneado_exterior sobre cara cilíndrica → Diámetro exterior", () => {
  const r = etiquetarOperacion({
    tipo: "contorneado_exterior",
    descripcion: "Contorneado exterior — Ø120.0 mm",
    faceIndices: [4],
    supportFaceId: 1,
    rotationOCC: IDENTIDAD,
    normalPorCara: () => null,
    esCaraCilindrica: (id) => id === 4,
  });
  assert.equal(r.orientacion, "CILINDRICA");
  assert.equal(r.descripcion, "Contorneado — diámetro exterior — Ø120.0 mm");
});

test("tipo no re-etiquetable (taladrado) conserva su descripción intacta", () => {
  const desc = "Taladro Ø26.0mm (pasante) en (103.000, -78.000)";
  const r = etiquetarOperacion({
    tipo: "taladrado",
    descripcion: desc,
    faceIndices: [3],
    supportFaceId: 1,
    rotationOCC: IDENTIDAD,
    normalPorCara: () => [0, 0, 1],
  });
  assert.equal(r.descripcion, desc);
  assert.equal(r.orientacion, null);
  assert.equal(r.refCad, null);
});

test("sin Setup (rotationOCC null) devuelve la descripción original", () => {
  const desc = "Planeado — cara frontal — 100 × 100 mm";
  const r = etiquetarOperacion({
    tipo: "planeado",
    descripcion: desc,
    faceIndices: [7],
    supportFaceId: null,
    rotationOCC: null,
    normalPorCara: () => [0, 0, 1],
  });
  assert.equal(r.descripcion, desc);
  assert.equal(r.orientacion, null);
});
