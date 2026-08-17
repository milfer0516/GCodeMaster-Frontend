// src/modules/cam/components/CamViewer3D.tsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useCamStore } from "../store/camStore";
import { tessellateStep } from "../services/camService";
import type { MeshData, FaceMetadata } from "../services/camService";
import type { Operacion } from "../store/camStore";
import { Loader2, AlertCircle } from "lucide-react";
import { formatMm } from "../../../utils/format";
import type { SujecionConfig, StockConfig } from "../store/camStore";
import type { StockFaceRole, StockPickRegion } from "../utils/stockFaces";
import { cylTotals } from "../utils/stockFaces";

// ── Props — mismas que el visor anterior para no romper StepOperaciones ──
// DESPUÉS
interface Props {
  dimensiones: { x: number; y: number; z: number };
  operaciones?: Operacion[];
  operacionesBackend?: any[];
  seleccionadas?: string[];
  faceIdDestacada?: number | null;

  // ── Operación ENFOCADA (paso Operaciones) ──
  // Es la que el operador está mirando en la lista/panel MDE, y NO es lo mismo
  // que `seleccionadas` (esas son las que se van a mecanizar). Cuando llega un
  // id, sus caras se pintan en el color de SU TIPO con brillo y el resto de la
  // pieza se atenúa a gris: así se ve DÓNDE mecaniza la operación, que es todo
  // el objetivo. En null el visor se comporta exactamente como siempre.
  opEnfocada?: string | null;

  onToggle?: (id: string) => void;
  onFaceClick?: (faceId: number) => void;
  sujecionConfig?: SujecionConfig | null;
  piezaBoundingBox?: { x: number; y: number; z: number };
  stockConfig?: StockConfig | null;

  // ── Mesa física (Fase 1) ──
  // Gate on/off para dibujar el plano de la mesa BAJO la pieza. Las medidas
  // (mesa_x_mm × mesa_y_mm) se leen del store (maquina) ya normalizadas por
  // getMaquinas; este prop NO transporta dimensiones ni reinterpreta largo/ancho.
  mostrarMesa?: boolean;

  // ── Stock por-región — el visor es consumidor VISUAL puro ──
  // El dominio entrega las regiones pickables YA ordenadas por materialIndex:
  // rectangular = 6 caras de la BoxGeometry (0..5); cilíndrico = 3 regiones
  // (0=lateral/radial, 1=tapa mecanizado, 2=tapa apoyo). El visor solo las
  // indexa por materialIndex; NUNCA mapea índice→dirección/rol. Ver stockFaces.ts.
  stockFacesByBoxIndex?: StockPickRegion[] | null;
  activeStockFaceIndex?: number | null;
  onStockFaceClick?: (
    faceIndex: number,
    screen: { x: number; y: number },
    locked: boolean,
  ) => void;
  onStockFaceHover?: (faceIndex: number | null) => void;
}

// Colores del stock por rol + estado (hover/activo). El VISOR no decide roles:
// recibe el rol ya derivado por el dominio y solo lo pinta.
function stockFaceColor(
  role: StockFaceRole,
  isHover: boolean,
  isActive: boolean,
): { color: number; opacity: number } {
  if (isActive) return { color: 0xfbbf24, opacity: 0.48 }; // ámbar fuerte
  if (isHover) return { color: 0xfbbf24, opacity: 0.34 }; // ámbar
  switch (role) {
    case "apoyo":
      return { color: 0x64748b, opacity: 0.1 }; // gris/atenuado (bloqueado)
    case "mecanizado":
      return { color: 0x22c55e, opacity: 0.2 }; // verde (objetivo primario)
    case "libre":
    default:
      return { color: 0x15803d, opacity: 0.22 }; // verde profundo translúcido — material bruto
  }
}
// ── Colores ────────────────────────────────────────────────────────────────
const COLOR_BASE = new THREE.Color(0xb4b8bf); // gris/plata metálico — cara sin feature
const COLOR_HOVER = new THREE.Color(0xfbbf24); // amarillo — hover
const COLOR_SELECCIONADO = new THREE.Color(0xfbbf24); // amarillo — seleccionada
const COLOR_PLANEADO = new THREE.Color(0x3b82f6); // azul
const COLOR_TALADRADO = new THREE.Color(0x22c55e); // verde
const COLOR_CAJERA = new THREE.Color(0xa855f7); // morado
const COLOR_CONTORNO = new THREE.Color(0xf97316); // naranja

function colorPorTipo(tipo: string): THREE.Color {
  switch (tipo) {
    case "planeado":
      return COLOR_PLANEADO;
    case "taladrado":
      return COLOR_TALADRADO;
    case "cajera":
      return COLOR_CAJERA;
    case "contorneado_exterior":
      return COLOR_CONTORNO;
    default:
      return COLOR_BASE;
  }
}

// ── Texto de dimensión por cara según su tipo de superficie ────────────────
function formatFaceDimension(face: FaceMetadata): string {
  const f = face.feature;
  // Redondeo a 1 decimal solo para la visualización
  const r1 = (n: number) => Math.round(n * 10) / 10;

  switch (face.surface_type) {
    case "cylinder": {
      if (f?.diametro_mm == null) return "Cilindro";
      let txt = `Ø${r1(f.diametro_mm)} mm`;
      if (f.profundidad_mm != null) txt += ` · prof ${r1(f.profundidad_mm)} mm`;
      return txt;
    }
    case "plane": {
      if (f?.dim_largo_mm != null && f?.dim_ancho_mm != null)
        return `${r1(f.dim_largo_mm)} × ${r1(f.dim_ancho_mm)} mm`;
      if (f?.area_mm2 != null) return `${r1(f.area_mm2)} mm²`;
      return "Plano";
    }
    case "cone": {
      if (f?.diametro_mm != null && f?.angulo_grados != null)
        return `Ø${r1(f.diametro_mm)} mm · ${r1(f.angulo_grados)}°`;
      return "Chaflán";
    }
    case "torus": {
      if (f?.radio_menor_mm != null) return `R ${r1(f.radio_menor_mm)} mm`;
      return "Filete";
    }
    default:
      return face.surface_type || "Cara";
  }
}

// ── Conversión frame OCC/máquina → display Three.js ─────────────────────────
// El Setup del dominio almacena la rotación en el frame OCC (Z arriba, mesa en
// Z=0). El visor la lleva a coordenadas Three.js aplicando la base -90°X
// (OCC Z → Three.js Y). Ésta es la ÚNICA conversión de frame de la app: NO
// debe existir en computeSetup ni en los datos del Setup — es un detalle de
// implementación de esta librería de render y vive solo aquí.
const VIEWER_BASE_Q = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0),
);

function occToDisplay(
  rotationOCC: [number, number, number, number],
): THREE.Quaternion {
  const qOCC = new THREE.Quaternion(
    rotationOCC[0],
    rotationOCC[1],
    rotationOCC[2],
    rotationOCC[3],
  );
  // display = baseQ · rotationOCC  (reproduce exactamente el qTarget histórico)
  return VIEWER_BASE_Q.clone().multiply(qOCC);
}

// ── Construir BufferGeometry desde MeshData ────────────────────────────────
function buildBufferGeometry(meshData: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();

  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(meshData.positions), 3),
  );
  geo.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(meshData.normals), 3),
  );
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1));

  // Un grupo por cara → materialIndex = face_id → picking O(1)
  meshData.faces.forEach((face) => {
    geo.addGroup(face.start, face.count, face.face_id);
  });

  return geo;
}

// ── Operación a la que pertenece una cara ──────────────────────────────────
// Primero por feature.op_id (el vínculo que manda el backend); si no está, por
// face_indices. Extraído para que el color inicial, el recoloreado por
// selección y la restauración tras el hover no puedan divergir.
function operacionDeCara(
  face: FaceMetadata,
  operaciones: Operacion[],
): Operacion | undefined {
  const opId = face.feature?.op_id as string | undefined;
  const porId = opId ? operaciones.find((o) => o.id === opId) : undefined;
  if (porId) return porId;
  return operaciones.find(
    (o) => o.face_indices && o.face_indices.includes(face.face_id),
  );
}

interface AspectoCara {
  color: THREE.Color;
  emissive: number;
  transparent: boolean;
  opacity: number;
}

// ── Aspecto de una cara: la ÚNICA regla de color de la pieza ───────────────
// Con `opEnfocada` la pieza entra en modo enfoque: solo la operación mirada
// conserva color (el de su tipo, con brillo) y todo lo demás baja a gris, para
// que se lea de un vistazo DÓNDE mecaniza. Sin `opEnfocada` rige el
// comportamiento histórico (amarillo = seleccionada, color de tipo si no).
function aspectoDeCara(
  face: FaceMetadata,
  operaciones: Operacion[],
  seleccionadas: string[],
  opEnfocada: string | null,
): AspectoCara {
  const op = operacionDeCara(face, operaciones);

  if (opEnfocada) {
    const esEnfocada = !!op && op.id === opEnfocada;
    return {
      color: esEnfocada ? colorPorTipo(op!.tipo) : COLOR_BASE,
      emissive: esEnfocada ? 0x222222 : 0x000000,
      transparent: false,
      opacity: 1.0,
    };
  }

  const isSeleccionada = op ? seleccionadas.includes(op.id) : false;
  return {
    color: isSeleccionada
      ? COLOR_SELECCIONADO
      : op
        ? colorPorTipo(op.tipo)
        : COLOR_BASE,
    emissive: 0x000000,
    transparent: isSeleccionada,
    opacity: isSeleccionada ? 0.92 : 1.0,
  };
}

// ── Construir array de materiales (uno por cara) ───────────────────────────
function buildMaterials(
  faces: FaceMetadata[],
  operaciones: Operacion[],
  seleccionadas: string[],
  opEnfocada: string | null,
): THREE.MeshStandardMaterial[] {
  return faces.map((face) => {
    const aspecto = aspectoDeCara(face, operaciones, seleccionadas, opEnfocada);

    return new THREE.MeshStandardMaterial({
      color: aspecto.color,
      emissive: new THREE.Color(aspecto.emissive),
      metalness: 0.55,
      roughness: 0.35,
      side: THREE.DoubleSide,
      transparent: aspecto.transparent,
      opacity: aspecto.opacity,
    });
  });
}

// ── Escala de LECTURA de la pieza (SOLO display, paso montaje) ─────────────
// Como un plano acotado con un detalle ampliado: la pieza se dibuja MÁS GRANDE
// que su proporción real sobre la mesa para que se lea su geometría, pero acotada
// para que su huella escalada NUNCA rebase el rectángulo de la mesa. Es un factor
// de RENDER puro (three.js): NO altera ninguna medida real (dimensiones de pieza,
// mesa_x/y, pos_x/pos_y, altura_total) — esas llegan al motor sin escalar. La
// cota usa la mayor extensión de la pieza para no rebasar en NINGUNA orientación
// de apoyo. Nunca encoge (mín 1) ni amplía de forma absurda (tope 6). Fuera del
// montaje (mostrarMesa=false) devuelve 1 ⇒ el resto de pasos no cambian.
function pieceDisplayScale(
  meshData: MeshData | null,
  maquina: { mesa_x_mm?: number | null; mesa_y_mm?: number | null } | null,
  mostrarMesa: boolean,
): number {
  if (!mostrarMesa || !meshData) return 1;
  const mx = maquina?.mesa_x_mm;
  const my = maquina?.mesa_y_mm;
  if (!mx || !my || mx <= 0 || my <= 0) return 1;
  const bb = meshData.bounding_box;
  const footprintMax = Math.max(
    bb.max[0] - bb.min[0],
    bb.max[1] - bb.min[1],
    bb.max[2] - bb.min[2],
  );
  if (!(footprintMax > 0)) return 1;
  const sMax = (0.45 * Math.min(mx, my)) / footprintMax;
  return Math.max(1, Math.min(sMax, 6));
}

// ── Componente principal ───────────────────────────────────────────────────
// DESPUÉS — misma ubicación
export function CamViewer3D({
  dimensiones,
  operaciones = [],
  operacionesBackend = [],
  seleccionadas = [],
  faceIdDestacada = null,
  opEnfocada = null,
  onToggle = () => {},
  onFaceClick,
  sujecionConfig = null,
  piezaBoundingBox,
  stockConfig = null,
  mostrarMesa = false,
  stockFacesByBoxIndex = null,
  activeStockFaceIndex = null,
  onStockFaceClick,
  onStockFaceHover,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const hoveredRef = useRef<number | null>(null); // face_id en hover
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const stockMeshRef = useRef<THREE.Group | null>(null);
  // Malla de la caja de stock (para picking) y sus 6 materiales (uno por cara
  // de la BoxGeometry, materialIndex 0..5) para resaltar caras individuales.
  const stockPickMeshRef = useRef<THREE.Mesh | null>(null);
  const stockMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  // Mesa física (Fase 1): grupo propio, NUNCA referenciado por los raycasters
  // de pieza/stock ⇒ excluido del picking por construcción.
  const tableGroupRef = useRef<THREE.Group | null>(null);
  const didFitTableRef = useRef(false);

  // Cara seleccionada con click simple para mostrar su dimensión en el panel
  const [faceInfo, setFaceInfo] = useState<FaceMetadata | null>(null);
  // Índice de cara de stock bajo el cursor (para resaltar + label de valor).
  const [stockHover, setStockHover] = useState<number | null>(null);

  const {
    archivo,
    idJob,
    meshData,
    meshLoading,
    meshError,
    setMeshData,
    setMeshLoading,
    setMeshError,
  } = useCamStore();

  const maquina = useCamStore((s) => s.maquina);
  const analisis = useCamStore((s) => s.analisis); // normales confiables (caras_planas) para la rotación de apoyo
  const setup = useCamStore((s) => s.setup); // montaje confirmado (verdad en frame OCC)

  // Limpiar la cara de info cuando cambia la geometría cargada
  useEffect(() => {
    setFaceInfo(null);
  }, [meshData]);

  // ── 1. Cargar mesh OCC la primera vez que se monta ──────────────────────
  useEffect(() => {
    if (!archivo || !idJob || meshData || meshLoading) return;

    const cargar = async () => {
      setMeshLoading(true);
      try {
        const data = await tessellateStep(archivo, idJob);
        setMeshData(data);
      } catch (err: any) {
        setMeshError(
          err?.response?.data?.detail ?? "Error al cargar geometría 3D.",
        );
      }
    };

    cargar();
  }, [archivo, idJob]);

  // ── 2. Inicializar Three.js una sola vez ────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth || 600;
    const H = el.clientHeight || 400;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    sceneRef.current = scene;

    // Cámara
    const maxDim = Math.max(dimensiones.x, dimensiones.y, dimensiones.z);
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 10000);
    camera.position.set(maxDim * 1.8, maxDim * 1.4, maxDim * 1.8);
    cameraRef.current = camera;

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = maxDim * 0.2;
    controls.maxDistance = maxDim * 8;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(maxDim * 1.5, maxDim * 2, maxDim);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.4);
    fillLight.position.set(-maxDim, maxDim * 0.5, -maxDim);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, -maxDim, 0);
    scene.add(rimLight);

    // Grid genérico (4× la pieza) — COMPARTIDO por todos los pasos que montan
    // CamViewer3D (Operaciones, Stock, Montaje). En el paso de MONTAJE
    // (mostrarMesa) NO se añade: la mesa dibuja su propia rejilla RECORTADA a su
    // footprint (efecto 7), y esta rejilla genérica excedería la mesa. El resto
    // de contextos (mostrarMesa=false) la conservan idéntica ⇒ sin regresión.
    // mostrarMesa es constante durante el ciclo de vida del montaje del visor,
    // así que leerlo del closure de este efecto de init (deps []) es seguro.
    if (!mostrarMesa) {
      const grid = new THREE.GridHelper(maxDim * 4, 24, 0x1e293b, 0x1e293b);
      scene.add(grid);
    }

    // Ejes
    scene.add(new THREE.AxesHelper(maxDim * 0.4));

    // Loop de animación
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize — sincroniza renderer + cámara con el tamaño ACTUAL del contenedor.
    const onResize = () => {
      const W2 = el.clientWidth;
      const H2 = el.clientHeight;
      if (W2 === 0 || H2 === 0) return; // ignora tamaños transitorios (evita aspect NaN)
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    // ResizeObserver sobre el contenedor del canvas: window.resize NO se dispara
    // cuando cambia el layout CSS interno (p.ej. el reparto visor/formulario), y
    // sin esto el renderer/cámara quedan con el tamaño viejo y el raycaster (que
    // usa getBoundingClientRect en vivo) recibe un canvas de tamaño distinto → los
    // clics caen fuera. Observar el contenedor mantiene todo sincronizado.
    const resizeObserver = new ResizeObserver(() => onResize());
    resizeObserver.observe(el);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ── 3. Cargar mesh en escena cuando meshData está disponible ────────────
  useEffect(() => {
    if (
      !meshData ||
      !sceneRef.current ||
      !cameraRef.current ||
      !controlsRef.current
    )
      return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Eliminar mesh anterior si existe
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      materialsRef.current.forEach((m) => m.dispose());
      meshRef.current = null;
    }

    // Construir geometría y materiales
    const geo = buildBufferGeometry(meshData);
    const materials = buildMaterials(
      meshData.faces,
      operaciones,
      seleccionadas,
      opEnfocada,
    );
    materialsRef.current = materials;

    const mesh = new THREE.Mesh(geo, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Convertir coordenadas OCC → Three.js
    // OCC: Z=altura → Three.js: Y=altura
    // Rotar -90° en X para que el eje Z de OCC apunte hacia Y en Three.js
    mesh.rotation.x = -Math.PI / 2;

    // Después de rotar -90° en X:
    // - El eje Z de OCC (altura) se convierte en el eje Y de Three.js
    // - La base de la pieza (ZMin=0 en OCC) debe quedar en Y=0 en Three.js
    // - El centro OCC es [cx, cy, cz] → en Three.js tras rotar: [cx, cz, -cy]
    // Para centrar XZ y apoyar la base en Y=0:
    const center = meshData.bounding_box.center;
    const bbMin = meshData.bounding_box.min;
    const halfHeight = (meshData.bounding_box.max[2] - bbMin[2]) / 2;

    // Escala de LECTURA (SOLO display). Amplía la pieza sobre la mesa sin tocar
    // dato alguno: se aplica al transform three.js (mesh.scale) y, para que la
    // pieza siga CENTRADA y APOYADA (pivote base-centro = (0,0,0) aquí, base en
    // Y=0), se escalan también los offsets de centrado. En montaje s>1; en el
    // resto de pasos (mostrarMesa=false) s=1 ⇒ comportamiento idéntico al previo.
    const s = pieceDisplayScale(meshData, maquina, mostrarMesa);
    mesh.scale.setScalar(s);
    mesh.position.set(
      -center[0] * s, // centrar en X (pivote 0 ⇒ pos = s·pos)
      -bbMin[2] * s,  // base en Y=0: Z_min de OCC → punto más bajo del mesh
      -center[1] * s, // centrar en Z (Y de OCC — negado por la rotación)
    );

    scene.add(mesh);
    meshRef.current = mesh;

    // Ajustar cámara al tamaño real de la pieza
    const bbMax = meshData.bounding_box.max;
    const diagonal = Math.sqrt(
      (bbMax[0] - bbMin[0]) ** 2 +
        (bbMax[1] - bbMin[1]) ** 2 +
        (bbMax[2] - bbMin[2]) ** 2,
    );
    // El centro visual del mesh en Three.js tras la rotación y posicionamiento
    const meshCenterY = halfHeight;
    camera.position.set(
      diagonal * 1.0,
      meshCenterY + diagonal * 0.8,
      diagonal * 1.0,
    );
    controls.target.set(0, meshCenterY, 0);
    camera.near = diagonal * 0.001;
    camera.far = diagonal * 20;
    camera.updateProjectionMatrix();
    controls.minDistance = diagonal * 0.1;
    controls.maxDistance = diagonal * 6;
    controls.target.set(0, meshCenterY, 0);
    controls.update();
    // maquina/mostrarMesa: la escala de lectura depende de mesa_x/y; reconstruir
    // desde meshData (ya cacheado, sin re-teselar) al llegar la máquina en montaje.
  }, [meshData, maquina, mostrarMesa]);

  // ── 4. Actualizar colores cuando cambia selección ───────────────────────
  useEffect(() => {
    if (!meshData || materialsRef.current.length === 0) return;

    meshData.faces.forEach((face) => {
      const mat = materialsRef.current[face.face_id];
      if (!mat) return;

      // No sobreescribir si está en hover
      if (hoveredRef.current === face.face_id) return;

      const aspecto = aspectoDeCara(
        face,
        operaciones,
        seleccionadas,
        opEnfocada,
      );
      mat.color.copy(aspecto.color);
      mat.emissive.set(aspecto.emissive);
      mat.transparent = aspecto.transparent;
      mat.opacity = aspecto.opacity;
    });

    meshData.faces.forEach((face) => {
      const mat = materialsRef.current[face.face_id];
      if (!mat) return;
      if (face.face_id === faceIdDestacada) {
        mat.color.set(0x00ff88);
        mat.emissive.set(0x003311);
      }
    });
  }, [seleccionadas, operaciones, meshData, faceIdDestacada, opEnfocada]);

  // ── 4b. Rotar mesh con animación suave según cara de apoyo ─────────────
  useEffect(() => {
    if (!meshRef.current || !meshData || faceIdDestacada === null) return;
    if (!controlsRef.current) return;

    let qTarget: THREE.Quaternion;
    let posXTarget: number;
    let posYTarget: number;
    let posZTarget: number;
    let centerYMundo: number;
    // Plano de apoyo (base de la pieza) — pivote vertical de la escala de lectura.
    let pivotY = 0;

    // Si existe un montaje confirmado para ESTA cara, el destino se lee del
    // Setup (verdad de dominio en frame OCC) y se convierte a display solo con
    // occToDisplay / VIEWER_BASE_Q. Si no (cara elegida pero sin confirmar), se
    // recomputa en vivo desde la normal para que la interacción previa funcione.
    const setupAplicable =
      !!setup?.confirmed && setup.supportFace.faceId === faceIdDestacada;

    if (setupAplicable && setup) {
      // ── Camino Setup (dominio → display) ──
      qTarget = occToDisplay(setup.rotationOCC);
      const posV = new THREE.Vector3(
        setup.position[0],
        setup.position[1],
        setup.position[2],
      ).applyQuaternion(VIEWER_BASE_Q);
      posXTarget = posV.x;
      posYTarget = posV.y;
      posZTarget = posV.z;
      // El centro vertical en el mundo display equivale al centro Z máquina
      // (base en z_apoyo, altura = rotatedBBox.height).
      centerYMundo = setup.zApoyoMm + setup.rotatedBBox.height / 2;
      pivotY = setup.zApoyoMm;
    } else {
      // ── Camino en vivo (cara seleccionada, montaje aún sin confirmar) ──
      const face = meshData.faces.find((f) => f.face_id === faceIdDestacada);
      if (!face || !face.face_normal) return;

      // La normal del teselado (face.face_normal) puede venir con el signo
      // invertido respecto al análisis. caras_planas es la fuente confiable:
      // usamos esa y caemos de vuelta al teselado solo si la cara no aparece
      // en el análisis.
      const caraAnalisis = (analisis?.caras_planas ?? []).find(
        (c: any) => c.face_index === faceIdDestacada,
      );
      const normalApoyo = caraAnalisis?.normal ?? face.face_normal;
      const [nx, ny, nz] = normalApoyo;

      const normalThree = new THREE.Vector3(nx, nz, -ny).normalize();
      const targetDown = new THREE.Vector3(0, -1, 0);

      // Quaternion destino: normal de cara apunta hacia -Y (mesa)
      const qDelta = new THREE.Quaternion();
      qDelta.setFromUnitVectors(normalThree, targetDown);

      // display = qDelta · baseQ (misma conversión de frame que occToDisplay)
      const qLive = qDelta.multiply(VIEWER_BASE_Q.clone());

      // Calcular posición: transformar las 8 esquinas del AABB OCC por qLive
      const bb = meshData.bounding_box;
      const corners: THREE.Vector3[] = [
        [bb.min[0], bb.min[1], bb.min[2]],
        [bb.max[0], bb.min[1], bb.min[2]],
        [bb.min[0], bb.max[1], bb.min[2]],
        [bb.max[0], bb.max[1], bb.min[2]],
        [bb.min[0], bb.min[1], bb.max[2]],
        [bb.max[0], bb.min[1], bb.max[2]],
        [bb.min[0], bb.max[1], bb.max[2]],
        [bb.max[0], bb.max[1], bb.max[2]],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z).applyQuaternion(qLive));

      // Calcular nuevo centro X/Y/Z del bounding box transformado
      const minYTransformado = Math.min(...corners.map((v) => v.y));
      const maxYTransformado = Math.max(...corners.map((v) => v.y));
      const minXTransformado = Math.min(...corners.map((v) => v.x));
      const maxXTransformado = Math.max(...corners.map((v) => v.x));
      const minZTransformado = Math.min(...corners.map((v) => v.z));
      const maxZTransformado = Math.max(...corners.map((v) => v.z));

      const centerXTransformado = (minXTransformado + maxXTransformado) / 2;
      const centerYTransformado = (minYTransformado + maxYTransformado) / 2;
      const centerZTransformado = (minZTransformado + maxZTransformado) / 2;

      const zApoyo = sujecionConfig?.envolvente?.z_apoyo_mm ?? 0;

      // Posiciones target del mesh: centrar en X/Z y apoyar en Y
      qTarget = qLive;
      posYTarget = -minYTransformado + zApoyo;
      posXTarget = -centerXTransformado;
      posZTarget = -centerZTransformado;
      centerYMundo = posYTarget + centerYTransformado;
      pivotY = zApoyo;
    }

    // ── Escala de LECTURA (SOLO display) ──
    // Amplía visualmente la pieza manteniéndola centrada (X=Z=0) y apoyada en el
    // plano base (pivote (0, pivotY, 0)). Escalar un emplazamiento rígido respecto
    // a un pivote P es: pos_s = (1-s)·P + s·pos  (uniforme, independiente de la
    // geometría). Solo toca mesh.scale y estas posiciones de RENDER; NINGÚN dato
    // real cambia. Fuera de montaje s=1 ⇒ animación idéntica a la previa.
    const s = pieceDisplayScale(meshData, maquina, mostrarMesa);
    meshRef.current.scale.setScalar(s);
    posXTarget = s * posXTarget;
    posZTarget = s * posZTarget;
    posYTarget = (1 - s) * pivotY + s * posYTarget;
    centerYMundo = (1 - s) * pivotY + s * centerYMundo;

    // Posiciones iniciales
    const posYStart = meshRef.current.position.y;
    const posXStart = meshRef.current.position.x;
    const posZStart = meshRef.current.position.z;

    // Target de la cámara: apuntar al centro visual de la pieza en el mundo
    // (X=0, Z=0 por construcción: la pieza queda centrada en el origen XZ)
    const controls = controlsRef.current;
    const targetStart = controls.target.clone();
    const targetEnd = new THREE.Vector3(0, centerYMundo, 0);

    // Animación slerp — 1200ms
    const DURACION_MS = 1200;
    const qStart = meshRef.current.quaternion.clone();
    const inicio = performance.now();
    let animId: number;

    const animar = (ahora: number) => {
      if (!meshRef.current || !controlsRef.current) return;
      const t = Math.min((ahora - inicio) / DURACION_MS, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Interpolar rotación
      meshRef.current.quaternion.slerpQuaternions(qStart, qTarget, ease);

      // Interpolar posición X/Y/Z simultáneamente con la rotación
      meshRef.current.position.x = posXStart + (posXTarget - posXStart) * ease;
      meshRef.current.position.y = posYStart + (posYTarget - posYStart) * ease;
      meshRef.current.position.z = posZStart + (posZTarget - posZStart) * ease;

      // Interpolar target de la cámara para que siga al centro visual del mesh
      controlsRef.current.target.lerpVectors(targetStart, targetEnd, ease);

      if (t < 1) {
        animId = requestAnimationFrame(animar);
      }
    };

    animId = requestAnimationFrame(animar);

    return () => cancelAnimationFrame(animId);
  }, [faceIdDestacada, meshData, sujecionConfig, analisis, setup, maquina, mostrarMesa]);

  // ── 5. Picking por cara — hover y click ────────────────────────────────
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;
    if (!meshRef.current) return;

    const el = mountRef.current!;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Mapeo face_id → op_id para respuesta rápida
    const faceToOpId = new Map<number, string>();
    if (meshData) {
      meshData.faces.forEach((face) => {
        const opId = face.feature?.op_id as string | undefined;
        if (opId) faceToOpId.set(face.face_id, opId);
      });
    }

    const getHitFaceId = (e: MouseEvent): number | null => {
      if (!meshRef.current) return null;
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObject(meshRef.current, false);
      if (hits.length === 0) return null;

      // hits[0].face.materialIndex == face_id (por el addGroup)
      return hits[0].face?.materialIndex ?? null;
    };

    // Hover
    const handleMouseMove = (e: MouseEvent) => {
      const faceId = getHitFaceId(e);

      // Restaurar cara anterior si cambió
      if (hoveredRef.current !== null && hoveredRef.current !== faceId) {
        const prev = materialsRef.current[hoveredRef.current];
        if (prev && meshData) {
          const face = meshData.faces[hoveredRef.current];
          if (face) {
            // Se restaura con la MISMA regla que pintó la cara (incluido el
            // modo enfoque); si no, salir del hover la dejaría con el color de
            // otro modo.
            const aspecto = aspectoDeCara(
              face,
              operaciones,
              seleccionadas,
              opEnfocada,
            );
            prev.color.copy(aspecto.color);
            prev.emissive.set(aspecto.emissive);
            prev.transparent = aspecto.transparent;
            prev.opacity = aspecto.opacity;
          }
        }
        hoveredRef.current = null;
        el.style.cursor = "grab";
      }

      // Aplicar hover a cara nueva
      if (faceId !== null && faceId !== hoveredRef.current) {
        const mat = materialsRef.current[faceId];
        if (mat) {
          mat.color.copy(COLOR_HOVER);
          mat.emissive.set(0x332200);
          hoveredRef.current = faceId;
          el.style.cursor = "pointer";
        }
      }
    };

    // Click simple — SOLO muestra la dimensión de la cara, no selecciona.
    const handleClick = (e: MouseEvent) => {
      const faceId = getHitFaceId(e);
      if (faceId === null) {
        setFaceInfo(null); // click al vacío → ocultar panel
        return;
      }
      const face = meshData?.faces.find((f) => f.face_id === faceId) ?? null;
      // TEMP DEBUG - remove later
      console.log("🔍 DEBUG: [CamViewer3D] click simple en cara", {
        face_id: faceId,
        surface_type: face?.surface_type,
        feature: face?.feature,
      });
      setFaceInfo(face);
    };

    // Doble click — selecciona/deselecciona la operación (lógica previa del click).
    const handleDoubleClick = (e: MouseEvent) => {
      const faceId = getHitFaceId(e);
      if (faceId === null) return;
      if (onFaceClick) {
        // TEMP DEBUG - remove later
        console.log("🔍 DEBUG: [CamViewer3D] doble clic en cara (onFaceClick)", {
          face_id: faceId,
        });
        onFaceClick(faceId);
        return;
      }
      const opId = faceToOpId.get(faceId);
      if (opId) {
        const opToggled = operaciones.find((o) => o.id === opId);
        // TEMP DEBUG - remove later
        console.log("🔍 DEBUG: [CamViewer3D] doble clic → toggle operación", {
          op_id: opToggled?.id,
          tipo: opToggled?.tipo,
          descripcion: opToggled?.descripcion,
          face_indices: (opToggled as any)?.face_indices,
        });
        onToggle(opId);
      }
    };

    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);

    return () => {
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [meshData, operaciones, seleccionadas, opEnfocada, onToggle, onFaceClick]);

  // ── 6. Dibujar stock (wireframe + translúcido) ──────────────────────────
  useEffect(() => {
    if (!sceneRef.current || !meshData) return;
    const scene = sceneRef.current;

    // Limpiar stock anterior
    if (stockMeshRef.current) {
      scene.remove(stockMeshRef.current);
      stockMeshRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      stockMeshRef.current = null;
    }
    stockPickMeshRef.current = null;
    stockMaterialsRef.current = [];

    // Sin stockConfig o sin Setup confirmado no se dibuja stock: el stock vive
    // en el frame MÁQUINA definido por setup.rotatedBBox (ya post-rotación).
    // NO se recomputa la rotación aquí; la caja es axis-aligned en máquina y
    // solo se lleva a display con VIEWER_BASE_Q (OCC/máquina → Three.js).
    if (!stockConfig || !setup) return;

    // SIN GATE. El envelope se dibuja SIEMPRE (offsets por defecto en 0 =
    // skin-tight, envolviendo la pieza) para que el operador VEA el stock y sepa
    // qué regiones puede clicar desde que entra al paso. Es feedback VISUAL: los
    // campos del formulario siguen vacíos (no se inventa ninguna medida).
    const rbb = setup.rotatedBBox; // { min, max, center, width, depth, height }

    const stockGroup = new THREE.Group();

    // Material de aristas (wireframe) compartido.
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4499dd,
      linewidth: 2,
    });

    if (stockConfig.tipo === "rectangular") {
      // Las 6 caras deben venir del dominio; sin ellas no hay stock que pintar.
      if (!stockFacesByBoxIndex || stockFacesByBoxIndex.length !== 6) return;

      // Stock = pieza ± offset por cara (materialIndex 0..5). Todos los offsets en
      // 0 ⇒ el box coincide con el bounding box de la pieza (skin-tight).
      const a = (i: number) => stockFacesByBoxIndex[i]?.allowance ?? 0;
      const maxX = rbb.max[0] + a(0);
      const minX = rbb.min[0] - a(1);
      const maxY = rbb.max[1] + a(2);
      const minY = rbb.min[1] - a(3);
      const maxZ = rbb.max[2] + a(4);
      const minZ = rbb.min[2] - a(5);

      const boxGeometry = new THREE.BoxGeometry(
        maxX - minX,
        maxY - minY,
        maxZ - minZ,
      );
      boxGeometry.translate(
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2,
      );

      // 6 materiales (uno por cara/materialIndex) para resaltar y para picking.
      const mats = stockFacesByBoxIndex.map((face, i) => {
        const { color, opacity } = stockFaceColor(
          face.role,
          i === stockHover,
          i === activeStockFaceIndex,
        );
        return new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
        });
      });
      stockMaterialsRef.current = mats;
      const boxMesh = new THREE.Mesh(boxGeometry, mats);
      stockPickMeshRef.current = boxMesh;

      const edges = new THREE.EdgesGeometry(boxGeometry);
      const wireframe = new THREE.LineSegments(edges, lineMaterial);

      stockGroup.add(boxMesh);
      stockGroup.add(wireframe);
    } else {
      // Cilíndrico: Ø/longitud DERIVADOS de pieza + offsets de región. Offsets en
      // 0 ⇒ cilindro skin-tight. 3 materiales por región (materialIndex
      // 0=lateral/radial, 1=tapa mecanizado, 2=tapa apoyo) para resaltar y
      // picking — mismo mecanismo que la caja.
      const regions = stockFacesByBoxIndex; // 3 regiones en orden de materialIndex
      const { diameter, length } = cylTotals(
        rbb,
        stockConfig.cyl,
        setup.partCylinderOD,
        setup.partCylinderLen,
      );

      // CylinderGeometry tiene el eje en Y; lo giramos a Z (máquina) y lo
      // colocamos con la base (tapa de apoyo) en la mesa, centrado en el footprint.
      const cylinderGeometry = new THREE.CylinderGeometry(
        diameter / 2,
        diameter / 2,
        length,
        48,
      );
      cylinderGeometry.rotateX(Math.PI / 2); // eje Y → eje Z (máquina)
      cylinderGeometry.translate(
        rbb.center[0],
        rbb.center[1],
        rbb.min[2] + length / 2,
      );

      const mats = [0, 1, 2].map((i) => {
        const { color, opacity } = stockFaceColor(
          regions?.[i]?.role ?? "libre",
          i === stockHover,
          i === activeStockFaceIndex,
        );
        return new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
        });
      });
      stockMaterialsRef.current = mats;
      const cylinderMesh = new THREE.Mesh(cylinderGeometry, mats);
      stockPickMeshRef.current = cylinderMesh;

      // thresholdAngle=30°: oculta las costuras entre facetas del cilindro
      // (≈7.5° con 48 segmentos) y conserva solo el contorno real (los aros
      // superior/inferior a 90°). Es geometría de DISPLAY — el pick mesh
      // (cylinderMesh, arriba) usa cylinderGeometry sin tocar.
      const edges = new THREE.EdgesGeometry(cylinderGeometry, 30);
      const wireframe = new THREE.LineSegments(edges, lineMaterial);

      stockGroup.add(cylinderMesh);
      stockGroup.add(wireframe);
    }

    // La caja está en coords MÁQUINA (Z arriba). VIEWER_BASE_Q la lleva a
    // display (misma conversión de frame que usa el mesh vía occToDisplay).
    // NO se copia mesh.quaternion: el stock ya incorpora la orientación.
    stockGroup.quaternion.copy(VIEWER_BASE_Q);
    stockGroup.position.set(0, 0, 0);

    scene.add(stockGroup);
    stockMeshRef.current = stockGroup;
    // Nota: los colores de hover/activo se re-aplican en el efecto 6b (no
    // reconstruye la geometría — solo recolorea los materiales por cara).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockConfig, meshData, setup, stockFacesByBoxIndex]);

  // ── 6a-fit. Auto-fit camera to frame both part and stock envelope ───────
  // IMPORTANTE: solo debe encuadrar UNA VEZ por Setup (cuando aparece), NUNCA en
  // cada edición del stock. Antes dependía de `stockConfig`, así que cada tecla
  // del formulario/popover reencuadraba la cámara y la pieza "saltaba". La cámara
  // solo debe moverse cuando el usuario orbita. Guard por setup.id.
  const didFitSetupIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!setup || !stockConfig || !cameraRef.current || !controlsRef.current) return;
    if (didFitSetupIdRef.current === setup.id) return;
    didFitSetupIdRef.current = setup.id;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const rbb = setup.rotatedBBox;

    // Encuadre inicial basado en la PIEZA: los offsets arrancan en 0 (skin-tight),
    // así que el stock coincide con la pieza en el primer render. La cámara solo
    // vuelve a moverse cuando el operador orbita (este efecto corre una vez/Setup).
    const maxDim = Math.max(rbb.width, rbb.depth, rbb.height);

    // Position camera to frame the entire envelope
    const distance = maxDim * 1.8;
    camera.position.set(distance, distance * 0.75, distance);
    camera.lookAt(0, 0, maxDim * 0.3); // Look slightly above center

    // Update controls limits based on new scale
    controls.minDistance = maxDim * 0.2;
    controls.maxDistance = maxDim * 8;
    controls.target.set(0, 0, maxDim * 0.3);
    controls.update();
  }, [stockConfig, setup]);

  // ── 6b. Resaltar cara de stock activa / en hover (sin reconstruir) ──────
  useEffect(() => {
    const mats = stockMaterialsRef.current;
    if (!mats.length || !stockFacesByBoxIndex) return;
    mats.forEach((m, i) => {
      const role = stockFacesByBoxIndex[i]?.role ?? "libre";
      const { color, opacity } = stockFaceColor(
        role,
        i === stockHover,
        i === activeStockFaceIndex,
      );
      m.color.setHex(color);
      m.opacity = opacity;
    });
  }, [activeStockFaceIndex, stockHover, stockFacesByBoxIndex]);

  // ── 6c. Picking de caras de stock (solo reporta ÍNDICE + posición) ──────
  // El visor NO conoce roles ni ejes: raycastea la caja de stock, obtiene el
  // materialIndex (0..5) de la cara pinchada y lo reporta al dominio, junto con
  // la proyección a pantalla del punto para anclar el popover. La interpretación
  // (dirección/rol/bloqueo) la hace el dominio (resolveStockFace).
  useEffect(() => {
    if (!onStockFaceClick && !onStockFaceHover) return;
    if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;

    const el = mountRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getHit = (e: MouseEvent) => {
      const box = stockPickMeshRef.current;
      if (!box) return null;
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(box, false);
      if (hits.length === 0) return null;
      const faceIndex = hits[0].face?.materialIndex ?? null;
      if (faceIndex === null) return null;
      return { faceIndex, point: hits[0].point };
    };

    const projectToScreen = (worldPoint: THREE.Vector3) => {
      const rect = el.getBoundingClientRect();
      const v = worldPoint.clone().project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * rect.width,
        y: (-v.y * 0.5 + 0.5) * rect.height,
      };
    };

    const handleMove = (e: MouseEvent) => {
      const hit = getHit(e);
      const idx = hit ? hit.faceIndex : null;
      setStockHover((prev) => (prev === idx ? prev : idx));
      onStockFaceHover?.(idx);
    };

    const handleClick = (e: MouseEvent) => {
      const hit = getHit(e);
      if (!hit) return;
      const locked =
        stockFacesByBoxIndex?.[hit.faceIndex]?.locked ?? false;
      onStockFaceClick?.(hit.faceIndex, projectToScreen(hit.point), locked);
    };

    renderer.domElement.addEventListener("mousemove", handleMove);
    renderer.domElement.addEventListener("click", handleClick);
    return () => {
      renderer.domElement.removeEventListener("mousemove", handleMove);
      renderer.domElement.removeEventListener("click", handleClick);
    };
  }, [onStockFaceClick, onStockFaceHover, stockFacesByBoxIndex]);

  // ── 7. Dibujar la MESA física (Fase 1 — plano + rejilla métrica) ───────
  // Sigue el MISMO patrón que el stock (efecto 6): construye un THREE.Group en
  // coords MÁQUINA (Z arriba) y lo lleva a display con VIEWER_BASE_Q. La mesa se
  // coloca en el plano de APOYO derivado del transform real: machine Z = z_apoyo
  // (rotatedBBox.min[2]) → viewer Y = z_apoyo, que es DONDE se apoya la base de
  // la pieza (efecto 4b: base en Y = zApoyoMm; sin setup, base en Y = 0). NO se
  // asume Z=0 de la mesa máquina: se usa el plano de la superficie de apoyo para
  // que la pieza quede SOBRE la mesa, no flotando. Aditivo: no toca la pieza ni
  // el stock, y su grupo nunca entra en los raycasters (picking intacto).
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Limpiar mesa anterior
    if (tableGroupRef.current) {
      scene.remove(tableGroupRef.current);
      tableGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      tableGroupRef.current = null;
    }

    if (!mostrarMesa || !maquina) return;
    // mesa_x_mm / mesa_y_mm YA normalizadas por getMaquinas (largo→X, ancho→Y).
    // El visor las consume tal cual: NO reinterpreta ni re-deriva el mapeo.
    const mesaX = maquina.mesa_x_mm;
    const mesaY = maquina.mesa_y_mm;
    if (!mesaX || !mesaY || mesaX <= 0 || mesaY <= 0) return;

    // Plano de apoyo (superficie sobre la que descansa la base de la pieza).
    // Con Setup confirmado = z_apoyo; sin Setup = 0 (base de la pieza en Y=0).
    const zApoyo = setup?.zApoyoMm ?? 0;

    const hx = mesaX / 2; // proporción física mesaX:mesaY preservada EXACTA:
    const hy = mesaY / 2; // se usan mm reales, sin escalar X/Y por separado.
    const group = new THREE.Group();

    // Relleno del tablero: un pelín por debajo del plano de apoyo para que la
    // base de la pieza quede visualmente SOBRE la mesa sin z-fighting.
    const fillGeo = new THREE.PlaneGeometry(mesaX, mesaY);
    fillGeo.translate(0, 0, zApoyo - 0.6);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(fillGeo, fillMat));

    // Rejilla métrica cada 50 mm, RECORTADA EXACTAMENTE a los bordes de la mesa
    // (las líneas nunca exceden [-hx,hx]×[-hy,hy]) y a escala en mm reales.
    const STEP = 50;
    const zGrid = zApoyo - 0.5;
    const gridPts: number[] = [];
    for (let x = -hx; x <= hx + 1e-6; x += STEP) {
      gridPts.push(x, -hy, zGrid, x, hy, zGrid);
    }
    for (let y = -hy; y <= hy + 1e-6; y += STEP) {
      gridPts.push(-hx, y, zGrid, hx, y, zGrid);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(gridPts), 3),
    );
    group.add(
      new THREE.LineSegments(
        gridGeo,
        new THREE.LineBasicMaterial({ color: 0x1e293b }),
      ),
    );

    // Borde del tablero (contorno más marcado).
    const zBorder = zApoyo - 0.4;
    const borderGeo = new THREE.BufferGeometry();
    borderGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          -hx, -hy, zBorder, hx, -hy, zBorder,
          hx, -hy, zBorder, hx, hy, zBorder,
          hx, hy, zBorder, -hx, hy, zBorder,
          -hx, hy, zBorder, -hx, -hy, zBorder,
        ]),
        3,
      ),
    );
    group.add(
      new THREE.LineSegments(
        borderGeo,
        new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 2 }),
      ),
    );

    // Coords MÁQUINA (Z arriba) → display: MISMA conversión de frame que el
    // stock/pieza. NO se copia mesh.quaternion: la mesa es axis-aligned en
    // máquina y su altura (z_apoyo) ya va incluida en la geometría.
    group.quaternion.copy(VIEWER_BASE_Q);
    group.position.set(0, 0, 0);
    group.renderOrder = -1; // dibujar detrás de pieza/stock

    scene.add(group);
    tableGroupRef.current = group;
  }, [mostrarMesa, maquina, setup]);

  // ── 7a-fit. Encuadre MÍNIMO y SEPARADO cuando aparece la mesa ───────────
  // La mesa es mucho mayor que la pieza; el fit de la pieza ([meshData]) la
  // dejaría fuera de cuadro. Este efecto es ADITIVO: si no hay mesa, retorna y
  // el comportamiento de cámara existente queda INTACTO. Encuadra UNA sola vez
  // (guard didFitTableRef) para no pelear con el orbit del usuario.
  useEffect(() => {
    if (!mostrarMesa || !maquina || !meshData) return;
    if (!cameraRef.current || !controlsRef.current) return;
    if (didFitTableRef.current) return;
    const mesaX = maquina.mesa_x_mm;
    const mesaY = maquina.mesa_y_mm;
    if (!mesaX || !mesaY || mesaX <= 0 || mesaY <= 0) return;
    didFitTableRef.current = true;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const zApoyo = setup?.zApoyoMm ?? 0;

    // Extensión vertical de la pieza (frame OCC Z → viewer Y) para dejarla dentro
    // de cuadro apoyada sobre la mesa. Sin datos, 0 (solo la mesa manda el fit).
    const piezaH = meshData
      ? Math.max(0, meshData.bounding_box.max[2] - meshData.bounding_box.min[2])
      : 0;

    // Aspect REAL del elemento renderizado (no el de la cámara, que puede estar
    // obsoleto en el instante del fit). Se sincroniza en la cámara ANTES de
    // encuadrar, para que la proyección con la que se dibuja coincida con la que
    // se usó para calcular la distancia (antes la "matemática" no cuadraba con
    // los píxeles porque el aspect no estaba sincronizado).
    const elFit = mountRef.current;
    const wFit = elFit?.clientWidth ?? 0;
    const hFit = elFit?.clientHeight ?? 0;
    const aspect = wFit > 0 && hFit > 0 ? wFit / hFit : camera.aspect || 1;
    camera.aspect = aspect;

    // Fit estándar por esfera envolvente de la MESA + PIEZA (mm reales, ratio
    // mesa_x:mesa_y intacto). Se elige el semiángulo MÁS restrictivo (vertical u
    // horizontal según el aspect) para que la mesa quepa también a lo ancho.
    const R = 0.5 * Math.sqrt(mesaX * mesaX + mesaY * mesaY + piezaH * piezaH);
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const fitHalf = Math.min(vHalf, hHalf);

    // FACTOR < 1: la cámara entra DENTRO de la esfera envolvente. La mesa es un
    // plano (no una esfera), así que su silueta llena bastante menos que la
    // esfera; al acercar la cámara la mesa DOMINA la vista (~80-90% de la
    // dimensión menor) en vez de quedar diminuta rodeada de vacío. Valor ajustado
    // por el resultado RENDERADO, no por una fórmula: el encuadre "correcto" a la
    // esfera dejaba la mesa pequeña. Ante la duda, más cerca (mesa más grande);
    // errar por "demasiado grande" es lo pedido, "demasiado pequeña" es el bug.
    const FACTOR = 0.5;
    const distance = (R / Math.sin(fitHalf)) * FACTOR;

    // Objetivo: centro de la mesa (Y=zApoyo) elevado media altura de pieza para
    // encuadrar ambos. Dirección de vista isométrica EXISTENTE; solo cambia la
    // DISTANCIA (tamaño aparente), nunca la geometría ni la proporción.
    const target = new THREE.Vector3(0, zApoyo + piezaH / 2, 0);
    const dir = new THREE.Vector3(1, 0.8, 1).normalize();
    camera.position.copy(target).addScaledVector(dir, distance);

    camera.near = Math.max(0.5, distance * 0.05);
    camera.far = distance + R * 4;
    camera.updateProjectionMatrix();

    controls.target.copy(target);
    controls.minDistance = R * 0.3;
    controls.maxDistance = distance * 4;
    controls.update();
  }, [mostrarMesa, maquina, meshData, setup]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (meshLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0d1117] rounded-xl">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
          <p className="text-sm">Cargando geometría 3D...</p>
        </div>
      </div>
    );
  }

  if (meshError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0d1117] rounded-xl">
        <div className="flex flex-col items-center gap-2 text-red-400 px-6 text-center">
          <AlertCircle className="h-7 w-7" />
          <p className="text-sm">{meshError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: "300px" }}>
      <div
        ref={mountRef}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ minHeight: "300px", cursor: "grab", background: "#0d1117" }}
      />

      {/* Panel de dimensión — esquina inferior izquierda.
          pointer-events:none para no estorbar la rotación con OrbitControls. */}
      {faceInfo && (
        <div
          className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
          style={{ pointerEvents: "none" }}
        >
          {formatFaceDimension(faceInfo)}
        </div>
      )}

      {/* Label de la cara de stock en hover — muestra su sobre-material actual.
          Los datos (rol/allowance) vienen ya resueltos del dominio; el visor
          solo indexa por el índice de cara. */}
      {stockHover !== null && stockFacesByBoxIndex?.[stockHover] && (
        <div
          className="absolute top-2 right-2 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
          style={{ pointerEvents: "none" }}
        >
          {stockFacesByBoxIndex[stockHover].locked
            ? "Apoyo · bloqueado (0 mm)"
            : `${formatMm(stockFacesByBoxIndex[stockHover].allowance)} mm`}
        </div>
      )}
    </div>
  );
}
