// src/modules/cam/components/sujecion/SujecionOverlay3D.tsx
//
// Geometría esquemática Three.js para cada sistema de sujeción.
// No modifica el mesh principal ni el raycaster.
// La conversión de coordenadas OCC → Three.js es:
//   Three.js X = OCC X
//   Three.js Y = OCC Z  (altura, arriba)
//   Three.js Z = -OCC Y (profundidad, negado por la rotación -PI/2 en X)
import * as THREE from "three";
import type { SujecionConfig } from "../../store/camStore";

type PiezaDim = { x: number; y: number; z: number };
type MaqRecorrido = { x: number; y: number };

function mat(
  color: number,
  opacity = 1,
  metalness = 0.4,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    metalness,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
}

// ── PRENSA ────────────────────────────────────────────────────────────────────
function buildPrensa(cfg: SujecionConfig, pieza: PiezaDim): THREE.Group {
  const group = new THREE.Group();
  const ancho = cfg.ancho_mordaza_mm ?? 125;
  const altMordaza = cfg.altura_mordaza_mm ?? 50;
  const altParalelas = cfg.altura_paralelas_mm ?? 0;
  // Profundidad del cuerpo de la prensa (en Z de Three.js = OCC Y de la pieza)
  const depthCuerpo = Math.max(pieza.y * 1.5, 150);

  // Base inferior (cuerpo de la prensa)
  const baseMesh = new THREE.Mesh(
    new THREE.BoxGeometry(ancho, 20, depthCuerpo),
    mat(0x555555, 0.7),
  );
  baseMesh.position.set(0, -10, 0);
  group.add(baseMesh);

  // Paralelas (si las hay) — dos bloques que elevan la pieza
  if (altParalelas > 0) {
    const paralW = pieza.x * 0.6;
    const paralGeo = new THREE.BoxGeometry(paralW, altParalelas, 18);
    [-pieza.z * 0.2, pieza.z * 0.2].forEach((zOffset) => {
      const p = new THREE.Mesh(paralGeo, mat(0x446688, 0.65));
      p.position.set(0, altParalelas / 2, zOffset);
      group.add(p);
    });
  }

  const yMordaza = altParalelas + altMordaza / 2;

  // Mordaza izquierda
  const mordazaGeoL = new THREE.BoxGeometry(ancho, altMordaza, 40);
  const mordazaL = new THREE.Mesh(mordazaGeoL, mat(0x666666, 0.6));
  mordazaL.position.set(-(pieza.x / 2 + ancho / 2), yMordaza, 0);
  group.add(mordazaL);

  // Mordaza derecha
  const mordazaGeoR = new THREE.BoxGeometry(ancho, altMordaza, 40);
  const mordazaR = new THREE.Mesh(mordazaGeoR, mat(0x666666, 0.6));
  mordazaR.position.set(pieza.x / 2 + ancho / 2, yMordaza, 0);
  group.add(mordazaR);

  // Tornillo de apriete (cilindro horizontal)
  const tornGeo = new THREE.CylinderGeometry(6, 6, pieza.x + ancho * 2 + 10, 12);
  tornGeo.rotateZ(Math.PI / 2);
  const torno = new THREE.Mesh(tornGeo, mat(0x888888, 0.5));
  torno.position.set(0, yMordaza, 0);
  group.add(torno);

  return group;
}

// ── BRIDAS ────────────────────────────────────────────────────────────────────
function buildBridas(cfg: SujecionConfig, pieza: PiezaDim): THREE.Group {
  const group = new THREE.Group();
  const altParalelas = cfg.altura_paralelas_mm ?? 50;
  const posiciones = cfg.posiciones_bridas ?? [];
  // Bridas se visualizan elevadas sobre las paralelas
  const yBrida = altParalelas + 20;

  // Par de paralelas bajo la pieza
  if (altParalelas > 0) {
    const paralW = pieza.x * 0.55;
    const paralGeo = new THREE.BoxGeometry(paralW, altParalelas, 18);
    // Dos paralelas separadas en Z (dirección OCC-Y → Three.js -Z)
    const zOff = pieza.y * 0.25;
    [zOff, -zOff].forEach((zo) => {
      const p = new THREE.Mesh(paralGeo, mat(0x446688, 0.65));
      p.position.set(0, altParalelas / 2, zo);
      group.add(p);
    });
  }

  // Bridas (cilindro = tornillo de apriete)
  const bridaGeo = new THREE.CylinderGeometry(8, 8, 40, 8);
  const escalonGeo = new THREE.BoxGeometry(28, 12, 28);

  posiciones.forEach(({ x: occX, y: occY }) => {
    // Conversión: Three.js Z = -OCC Y
    const threeZ = -occY;

    const brida = new THREE.Mesh(bridaGeo, mat(0x888888, 0.75));
    brida.position.set(occX, yBrida, threeZ);
    group.add(brida);

    // Escalón de apoyo bajo el tornillo
    const escalon = new THREE.Mesh(escalonGeo, mat(0x666666, 0.6));
    escalon.position.set(occX, yBrida - 26, threeZ);
    group.add(escalon);
  });

  return group;
}

// ── MESA MAGNÉTICA ────────────────────────────────────────────────────────────
function buildMesaMagnetica(
  pieza: PiezaDim,
  maq?: MaqRecorrido | null,
): THREE.Group {
  const group = new THREE.Group();
  // Dimensiones de la plataforma magnética
  const anchoMesa = maq ? maq.x * 0.7 : Math.max(pieza.x * 2.5, 300);
  const profMesa = maq ? maq.y * 0.7 : Math.max(pieza.y * 2.5, 300);
  const grosorMesa = 30;

  // Cuerpo de la mesa magnética
  const mesaGeo = new THREE.BoxGeometry(anchoMesa, grosorMesa, profMesa);
  const mesaMesh = new THREE.Mesh(mesaGeo, mat(0x1a3a5c, 0.5));
  mesaMesh.position.set(0, -grosorMesa / 2, 0);
  group.add(mesaMesh);

  // Franjas de polo magnético (decorativas) — alternando N y S
  const numFranjas = Math.min(7, Math.floor(anchoMesa / 60));
  const anchoFranja = anchoMesa / numFranjas;
  for (let i = 0; i < numFranjas; i++) {
    const xFranja = -anchoMesa / 2 + anchoFranja * i + anchoFranja / 2;
    const colorFranja = i % 2 === 0 ? 0x2a5a9c : 0x0f2a4c;
    const fGeo = new THREE.BoxGeometry(anchoFranja - 2, grosorMesa + 1, profMesa - 4);
    const fMesh = new THREE.Mesh(fGeo, mat(colorFranja, 0.55));
    fMesh.position.set(xFranja, -grosorMesa / 2, 0);
    group.add(fMesh);
  }

  return group;
}

// ── COPA DE TORNO ─────────────────────────────────────────────────────────────
function buildCopaTorno(cfg: SujecionConfig, pieza: PiezaDim): THREE.Group {
  const group = new THREE.Group();
  const radioCopa = (cfg.diametro_copa_mm ?? 150) / 2;
  const numGarras = cfg.tipo_garras ?? 3;
  const profAgarre = cfg.profundidad_agarre_mm ?? 30;
  const alturaGarras = profAgarre + 15;
  const altCuerpo = 80;

  // Cuerpo principal (chuck body) — posicionado bajo el nivel de agarre
  const cuerpoCopaMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radioCopa, radioCopa * 1.1, altCuerpo, 32),
    mat(0x444444, 0.7),
  );
  // El cuerpo queda por debajo de Y=0 (mesa virtual), centrado bajo la pieza
  cuerpoCopaMesh.position.set(0, -(altCuerpo / 2 + profAgarre), 0);
  group.add(cuerpoCopaMesh);

  // Cara frontal del chuck (disco)
  const caraGeo = new THREE.CylinderGeometry(radioCopa, radioCopa, 8, 32);
  const caraFrontal = new THREE.Mesh(caraGeo, mat(0x555555, 0.7));
  caraFrontal.position.set(0, -profAgarre - 4, 0);
  group.add(caraFrontal);

  // Garras equidistantes alrededor del eje
  const garraAncho = Math.min(24, radioCopa * 0.3);
  const garraProf = 14;
  const garraGeo = new THREE.BoxGeometry(garraAncho, alturaGarras, garraProf);

  for (let i = 0; i < numGarras; i++) {
    const angulo = (i / numGarras) * Math.PI * 2;
    const radio = radioCopa - garraAncho * 0.4;
    const garra = new THREE.Mesh(garraGeo, mat(0x777777, 0.75));
    garra.position.set(
      Math.cos(angulo) * radio,
      -profAgarre / 2 + alturaGarras / 2 - alturaGarras,
      Math.sin(angulo) * radio,
    );
    garra.rotation.y = angulo;
    group.add(garra);
  }

  return group;
}

// ── Función pública ────────────────────────────────────────────────────────────
export function buildSujecionGroup(
  cfg: SujecionConfig,
  pieza: PiezaDim,
  maq?: MaqRecorrido | null,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "sujecion_overlay";

  switch (cfg.tipo) {
    case "prensa":
      group.add(buildPrensa(cfg, pieza));
      break;
    case "bridas":
      group.add(buildBridas(cfg, pieza));
      break;
    case "mesa_magnetica":
      group.add(buildMesaMagnetica(pieza, maq));
      break;
    case "copa_torno":
      group.add(buildCopaTorno(cfg, pieza));
      break;
  }

  return group;
}
