// src/lib/viewer3d/createViewer.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 1 · VISOR 3D GENÉRICO
//
// Canvas + cámara + luces + OrbitControls + resize. NO sabe nada de
// herramientas, ni de piezas, ni de máquinas: solo recibe un THREE.Object3D y
// lo muestra. Es TypeScript plano — ni React ni Zustand aparecen en este
// archivo, así que puede montarse desde cualquier contenedor DOM.
//
// Reutilización prevista (paso de Montaje): el mismo visor recibirá un Group
// con la mesa del VMC + el husillo + la sujeción + la pieza. Por eso el
// contrato es "un objeto dentro, el visor lo encuadra y lo orbita".
//
// PROPIEDAD DEL CONTENIDO: al llamar setContenido(obj) el visor pasa a ser
// dueño de `obj` y libera su GPU memory cuando se reemplaza o se destruye.
//
// Lección heredada de CamViewer3D — NO revertir: además de window.resize hace
// falta un ResizeObserver sobre el contenedor. Un cambio de layout CSS (p. ej.
// el reparto formulario/visor) no dispara window.resize, y si el renderer se
// queda con el tamaño viejo el raycaster (que lee getBoundingClientRect en
// vivo) recibe un canvas de otro tamaño y los clics caen fuera.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { liberarObjeto3D } from "./dispose";

export interface OpcionesVisor {
  /** Color de fondo del canvas. */
  fondo?: number;
  /** Rejilla de suelo. `true` = automática (se dimensiona con el contenido). */
  grid?: boolean | { tamano: number; divisiones: number; color?: number };
  /** Ejes XYZ. `true` = automáticos; número = longitud fija en unidades. */
  ejes?: boolean | number;
  /** Campo de visión vertical en grados. */
  fov?: number;
  /** Dirección desde la que mira la cámara al encuadrar (se normaliza). */
  direccionCamara?: [number, number, number];
  /** Intensidades de luz. */
  luces?: {
    ambiente?: number;
    principal?: number;
    relleno?: number;
    contra?: number;
  };
  /** Iluminación basada en imagen (PMREM). Da brillo metálico realista. */
  entorno?: boolean;
  /** Giro automático lento — útil para vistas de presentación. */
  autoRotar?: boolean;
}

export interface VisorHandle {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  /** Reemplaza el contenido. El visor libera el anterior. */
  setContenido(objeto: THREE.Object3D | null): void;
  /** Encuadra el contenido actual (mueve cámara y target). */
  encuadrar(margen?: number): void;
  /** Recalcula tamaño de renderer/cámara desde el contenedor. */
  redimensionar(): void;
  /** Destruye todo (RAF, listeners, GPU, canvas). */
  destruir(): void;
}

const OPCIONES_BASE: Required<
  Pick<OpcionesVisor, "fondo" | "fov" | "direccionCamara">
> = {
  fondo: 0x0d1117,
  fov: 42,
  direccionCamara: [0.85, 0.5, 1],
};

export function createViewer(
  contenedor: HTMLElement,
  opciones: OpcionesVisor = {},
): VisorHandle {
  const cfg = { ...OPCIONES_BASE, ...opciones };

  const ancho = () => contenedor.clientWidth || 600;
  const alto = () => contenedor.clientHeight || 400;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(ancho(), alto());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  contenedor.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  // ── Escena ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.fondo);

  // Entorno PMREM: sin él los materiales metálicos (metalness alto) se ven
  // negros porque no hay nada que reflejar.
  let pmrem: THREE.PMREMGenerator | null = null;
  if (opciones.entorno !== false) {
    pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    scene.environmentIntensity = 0.55;
    liberarObjeto3D(envScene);
  }

  // ── Cámara ────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    cfg.fov,
    ancho() / alto(),
    0.1,
    10000,
  );
  camera.position.set(120, 90, 160);

  // ── Controles ─────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = !!opciones.autoRotar;
  controls.autoRotateSpeed = 0.8;

  // ── Luces ─────────────────────────────────────────────────────────────────
  const luces = opciones.luces ?? {};
  scene.add(new THREE.AmbientLight(0xffffff, luces.ambiente ?? 0.55));

  const principal = new THREE.DirectionalLight(0xffffff, luces.principal ?? 1.5);
  principal.position.set(1, 1.6, 1);
  scene.add(principal);

  const relleno = new THREE.DirectionalLight(0x9dc4ff, luces.relleno ?? 0.55);
  relleno.position.set(-1.2, 0.6, -0.8);
  scene.add(relleno);

  const contra = new THREE.DirectionalLight(0xffffff, luces.contra ?? 0.35);
  contra.position.set(0, -1, -0.4);
  scene.add(contra);

  // ── Rejilla y ejes (opcionales, redimensionados al encuadrar) ─────────────
  let grid: THREE.GridHelper | null = null;
  let ejes: THREE.AxesHelper | null = null;
  const gridAutomatica = opciones.grid === true;
  const ejesAutomaticos = opciones.ejes === true;

  const crearGrid = (tamano: number, divisiones: number, color: number) => {
    if (grid) {
      scene.remove(grid);
      liberarObjeto3D(grid);
    }
    grid = new THREE.GridHelper(tamano, divisiones, color, color);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);
  };

  const crearEjes = (longitud: number) => {
    if (ejes) {
      scene.remove(ejes);
      liberarObjeto3D(ejes);
    }
    ejes = new THREE.AxesHelper(longitud);
    scene.add(ejes);
  };

  if (opciones.grid && typeof opciones.grid === "object") {
    crearGrid(
      opciones.grid.tamano,
      opciones.grid.divisiones,
      opciones.grid.color ?? 0x1e293b,
    );
  }
  if (typeof opciones.ejes === "number") crearEjes(opciones.ejes);

  // ── Contenido ─────────────────────────────────────────────────────────────
  let contenido: THREE.Object3D | null = null;

  const setContenido = (objeto: THREE.Object3D | null) => {
    if (contenido) {
      scene.remove(contenido);
      liberarObjeto3D(contenido);
    }
    contenido = objeto;
    if (objeto) scene.add(objeto);
  };

  const encuadrar = (margen = 1.35) => {
    if (!contenido) return;
    const caja = new THREE.Box3().setFromObject(contenido);
    if (caja.isEmpty()) return;

    const esfera = caja.getBoundingSphere(new THREE.Sphere());
    const radio = Math.max(esfera.radius, 1e-3);

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    let distancia = (radio / Math.sin(fovRad / 2)) * margen;
    // Contenedores estrechos: el FOV horizontal es el limitante.
    const aspecto = camera.aspect || 1;
    if (aspecto < 1) distancia /= aspecto;

    const dir = new THREE.Vector3(...cfg.direccionCamara).normalize();
    camera.position.copy(esfera.center).addScaledVector(dir, distancia);
    camera.near = Math.max(distancia / 800, 0.01);
    camera.far = distancia * 24;
    camera.updateProjectionMatrix();

    controls.target.copy(esfera.center);
    controls.minDistance = radio * 0.25;
    controls.maxDistance = distancia * 8;
    controls.update();

    if (gridAutomatica) {
      const lado = Math.max(radio * 4, 1);
      crearGrid(lado, 20, 0x1e293b);
      grid!.position.y = caja.min.y;
    }
    if (ejesAutomaticos) crearEjes(radio * 0.9);
  };

  // ── Resize ────────────────────────────────────────────────────────────────
  const redimensionar = () => {
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    if (w === 0 || h === 0) return; // tamaños transitorios → aspect NaN
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };

  window.addEventListener("resize", redimensionar);
  const observador = new ResizeObserver(() => redimensionar());
  observador.observe(contenedor);

  // ── Bucle ─────────────────────────────────────────────────────────────────
  let rafId = 0;
  let vivo = true;
  const animar = () => {
    if (!vivo) return;
    rafId = requestAnimationFrame(animar);
    controls.update();
    renderer.render(scene, camera);
  };
  animar();

  // ── Destrucción ───────────────────────────────────────────────────────────
  const destruir = () => {
    vivo = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", redimensionar);
    observador.disconnect();
    setContenido(null);
    if (grid) liberarObjeto3D(grid);
    if (ejes) liberarObjeto3D(ejes);
    controls.dispose();
    scene.environment?.dispose();
    pmrem?.dispose();
    renderer.dispose();
    if (contenedor.contains(renderer.domElement)) {
      contenedor.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    setContenido,
    encuadrar,
    redimensionar,
    destruir,
  };
}
