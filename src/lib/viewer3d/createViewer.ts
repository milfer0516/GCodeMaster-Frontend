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
  /** Encuadra el contenido actual: mueve cámara, target y distancia. */
  encuadrar(margen?: number): void;
  /**
   * Recentra el target (y arrastra la cámara) sobre el centro actual del
   * contenido, SIN cambiar distancia ni ángulo. Para cuando el objeto cambia
   * de cotas y su centro se desplaza.
   */
  recentrar(): void;
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

  /** Caja envolvente del contenido en coordenadas de mundo, o null si no hay. */
  const cajaContenido = (): THREE.Box3 | null => {
    if (!contenido) return null;
    const caja = new THREE.Box3().setFromObject(contenido);
    return caja.isEmpty() ? null : caja;
  };

  const radioDe = (caja: THREE.Box3): number =>
    Math.max(caja.getBoundingSphere(new THREE.Sphere()).radius, 1e-3);

  const ajustarPlanos = (distancia: number, radio: number) => {
    camera.near = Math.max(distancia / 800, 0.01);
    camera.far = Math.max((distancia + radio * 4) * 8, distancia * 4);
    camera.updateProjectionMatrix();
  };

  /**
   * Distancia a la que la ESFERA envolvente cabe entera, con el margen dado
   * (1 = justa en el borde). Se usa la esfera y no la caja porque el operador
   * puede orbitar libremente: lo que cabe como esfera cabe desde cualquier
   * ángulo. Se contempla el FOV horizontal además del vertical — en un panel
   * estrecho el limitante es el horizontal.
   */
  const distanciaParaCaber = (radio: number, margen: number): number => {
    const fovV = THREE.MathUtils.degToRad(camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (camera.aspect || 1));
    return (radio / Math.sin(Math.min(fovV, fovH) / 2)) * margen;
  };

  /** Holgura del encuadre normal. */
  const MARGEN_ENCUADRE = 1.35;
  /** Por debajo de esta holgura la pieza se sale del canvas. */
  const MARGEN_DESBORDE = 1.02;
  /** Por encima de esta holgura la pieza se ve como un punto. */
  const MARGEN_DIMINUTA = 3.2;

  /**
   * La rejilla se apoya BAJO el contenido y lo sigue en XZ. No se ancla al
   * origen del mundo a propósito: en Montaje el contenido (mesa + pieza) no
   * estará centrado en (0,0,0).
   */
  const colocarGrid = (caja: THREE.Box3) => {
    if (!grid) return;
    const centro = caja.getCenter(new THREE.Vector3());
    grid.position.set(centro.x, caja.min.y, centro.z);
  };

  // Si el contenedor aún no tiene tamaño (modal recién montado), el encuadre
  // se calcularía contra el aspecto de reserva. Se aplaza al primer resize real.
  let encuadrePendiente = false;

  // Estado con el que se fijó la distancia actual. Sirve para distinguir "la
  // pieza cambió de tamaño" de "el operador acercó la cámara": la prueba de
  // encaje solo debe reaccionar a lo primero, nunca pelearse con el zoom manual.
  let radioAjustado = 0;
  let aspectoAjustado = 0;

  const encuadrar = (margen = MARGEN_ENCUADRE) => {
    const caja = cajaContenido();
    if (!caja) return;

    // El aspecto tiene que ser el REAL antes de calcular la distancia.
    redimensionar();
    if (contenedor.clientWidth === 0 || contenedor.clientHeight === 0) {
      encuadrePendiente = true;
      return;
    }
    encuadrePendiente = false;

    const centro = caja.getCenter(new THREE.Vector3());
    const radio = radioDe(caja);

    const distancia = distanciaParaCaber(radio, margen);
    const dir = new THREE.Vector3(...cfg.direccionCamara).normalize();
    camera.position.copy(centro).addScaledVector(dir, distancia);
    ajustarPlanos(distancia, radio);

    controls.target.copy(centro);
    controls.minDistance = radio * 0.25;
    controls.maxDistance = distancia * 8;
    controls.update();

    radioAjustado = radio;
    aspectoAjustado = camera.aspect;

    if (gridAutomatica) crearGrid(Math.max(radio * 4, 1), 20, 0x1e293b);
    colocarGrid(caja);
    if (ejesAutomaticos) crearEjes(radio * 0.9);
  };

  /**
   * Mantiene el contenido CENTRADO y COMPLETAMENTE VISIBLE cuando cambian sus
   * cotas, sin reencuadrar en cada tecla. Dos pasos:
   *
   *   1. Seguir el centro — siempre. Traslada target y cámara por el mismo
   *      delta, así el ángulo y la distancia de la órbita quedan intactos.
   *      Hace falta porque con la convención "punta en y = 0, cuerpo hacia +Y"
   *      el centro de la caja SE MUEVE al editar: pasar el filo de 26 a 90
   *      sube el centro 42 mm y la pieza se iría del canvas.
   *
   *   2. Prueba de encaje — solo si hace falta. La distancia únicamente se
   *      toca si la pieza YA NO CABE (una validación visual a medias no sirve
   *      de nada) o si quedó tan pequeña que no se aprecia. Entre ambos
   *      umbrales hay ZONA MUERTA: teclear cotas pequeñas no mueve la cámara.
   *      Tras un ajuste la distancia queda dentro de la zona muerta, así que
   *      no puede oscilar.
   */
  const recentrar = () => {
    const caja = cajaContenido();
    if (!caja) return;

    const centro = caja.getCenter(new THREE.Vector3());
    const radio = radioDe(caja);

    // 1 · Seguir el centro.
    const delta = centro.clone().sub(controls.target);
    if (delta.lengthSq() > 1e-10) {
      controls.target.add(delta);
      camera.position.add(delta);
    }

    // 2 · Prueba de encaje. Solo se evalúa si cambió lo que puede sacar la
    //     pieza de cuadro por sí solo — su tamaño o el del panel. Si la
    //     geometría es la misma, la distancia es cosa del operador y no se
    //     toca: acercarse a mirar la punta es una acción deliberada.
    let distancia = camera.position.distanceTo(controls.target);
    const cambioTamano = Math.abs(radio - radioAjustado) > radioAjustado * 1e-6;
    const cambioPanel = Math.abs(camera.aspect - aspectoAjustado) > 1e-9;

    if (cambioTamano || cambioPanel) {
      const noCabe = distancia < distanciaParaCaber(radio, MARGEN_DESBORDE);
      const diminuta = distancia > distanciaParaCaber(radio, MARGEN_DIMINUTA);

      if (noCabe || diminuta) {
        distancia = distanciaParaCaber(radio, MARGEN_ENCUADRE);
        // Se conserva el ÁNGULO de órbita: solo cambia el alejamiento.
        const dir = camera.position.clone().sub(controls.target);
        if (dir.lengthSq() < 1e-12) dir.set(...cfg.direccionCamara);
        dir.normalize();
        camera.position.copy(controls.target).addScaledVector(dir, distancia);

        // La referencia se actualiza SOLO al mover la cámara: así una cadena
        // de ediciones pequeñas se mide desde el último ajuste y no se puede
        // colar un desborde a base de incrementos por debajo del umbral.
        radioAjustado = radio;
        aspectoAjustado = camera.aspect;
      }
    }

    // Los límites de OrbitControls se refrescan SIEMPRE: si no, update()
    // volvería a clampar la distancia recién calculada contra el maxDistance
    // del encuadre anterior y la pieza seguiría desbordando.
    controls.minDistance = radio * 0.25;
    controls.maxDistance = distanciaParaCaber(radio, MARGEN_ENCUADRE) * 8;
    ajustarPlanos(distancia, radio);
    colocarGrid(caja);
    controls.update();
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

  // Al cambiar el tamaño se recalcula el aspecto y, si el encuadre se había
  // aplazado por un contenedor de 0×0 (modal recién montado), se hace ahora.
  // Si ya estaba encuadrado se repasa el encaje: estrechar el panel reduce el
  // FOV útil y puede dejar la pieza fuera de cuadro sin que cambie el contenido.
  const alRedimensionar = () => {
    redimensionar();
    if (encuadrePendiente) encuadrar();
    else recentrar();
  };

  window.addEventListener("resize", alRedimensionar);
  const observador = new ResizeObserver(alRedimensionar);
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
    window.removeEventListener("resize", alRedimensionar);
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
    recentrar,
    redimensionar,
    destruir,
  };
}
