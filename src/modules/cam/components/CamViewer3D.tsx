// src/modules/cam/components/CamViewer3D.tsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useCamStore } from "../store/camStore";
import { tessellateStep } from "../services/camService";
import type { MeshData, FaceMetadata } from "../services/camService";
import type { Operacion } from "../store/camStore";
import { Loader2, AlertCircle } from "lucide-react";

// ── Props — mismas que el visor anterior para no romper StepOperaciones ──
// DESPUÉS
interface Props {
  dimensiones: { x: number; y: number; z: number };
  operaciones?: Operacion[];
  operacionesBackend?: any[];
  seleccionadas?: string[];
  faceIdDestacada?: number | null;
  onToggle?: (id: string) => void;
  onFaceClick?: (faceId: number) => void;
}
// ── Colores ────────────────────────────────────────────────────────────────
const COLOR_BASE = new THREE.Color(0x4a90d9); // azul acero — cara sin feature
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

// ── Construir array de materiales (uno por cara) ───────────────────────────
function buildMaterials(
  faces: FaceMetadata[],
  operaciones: Operacion[],
  seleccionadas: string[],
): THREE.MeshStandardMaterial[] {
  return faces.map((face) => {
    // Buscar si esta cara tiene una operación asociada via feature.op_id
    const opId = face.feature?.op_id as string | undefined;
    const op = opId ? operaciones.find((o) => o.id === opId) : undefined;
    const isSeleccionada = op ? seleccionadas.includes(op.id) : false;

    const color = isSeleccionada
      ? COLOR_SELECCIONADO
      : op
        ? colorPorTipo(op.tipo)
        : COLOR_BASE;

    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.55,
      roughness: 0.35,
      side: THREE.DoubleSide,
      transparent: isSeleccionada,
      opacity: isSeleccionada ? 0.92 : 1.0,
    });
  });
}

// ── Componente principal ───────────────────────────────────────────────────
// DESPUÉS — misma ubicación
export function CamViewer3D({
  dimensiones,
  operaciones = [],
  operacionesBackend = [],
  seleccionadas = [],
  faceIdDestacada = null,
  onToggle = () => {},
  onFaceClick,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const hoveredRef = useRef<number | null>(null); // face_id en hover
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

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

    // Grid
    const grid = new THREE.GridHelper(maxDim * 4, 24, 0x1e293b, 0x1e293b);
    scene.add(grid);

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

    // Resize
    const onResize = () => {
      const W2 = el.clientWidth;
      const H2 = el.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
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
    mesh.position.set(
      -center[0], // centrar en X
      -bbMin[2],  // base en Y=0: Z_min de OCC → punto más bajo del mesh
      -center[1], // centrar en Z (Y de OCC — negado por la rotación)
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
    console.log("useEffect 3 ejecutado — meshData:", meshData?.stats);
    console.log("scene existe:", !!sceneRef.current);
    console.log("mesh agregado:", !!meshRef.current);
  }, [meshData]);

  // ── 4. Actualizar colores cuando cambia selección ───────────────────────
  useEffect(() => {
    if (!meshData || materialsRef.current.length === 0) return;

    meshData.faces.forEach((face) => {
      const mat = materialsRef.current[face.face_id];
      if (!mat) return;

      const opId = face.feature?.op_id as string | undefined;
      const op = opId ? operaciones.find((o) => o.id === opId) : undefined;
      const isSeleccionada = op ? seleccionadas.includes(op.id) : false;

      // No sobreescribir si está en hover
      if (hoveredRef.current === face.face_id) return;

      const color = isSeleccionada
        ? COLOR_SELECCIONADO
        : op
          ? colorPorTipo(op.tipo)
          : COLOR_BASE;

      mat.color.copy(color);
      mat.transparent = isSeleccionada;
      mat.opacity = isSeleccionada ? 0.92 : 1.0;
    });

    meshData.faces.forEach((face) => {
      const mat = materialsRef.current[face.face_id];
      if (!mat) return;
      if (face.face_id === faceIdDestacada) {
        mat.color.set(0x00ff88);
        mat.emissive.set(0x003311);
      }
    });
  }, [seleccionadas, operaciones, meshData, faceIdDestacada]);

  // ── 4b. Rotar mesh con animación suave según cara de apoyo ─────────────
  useEffect(() => {
    if (!meshRef.current || !meshData || faceIdDestacada === null) return;

    const face = meshData.faces.find((f) => f.face_id === faceIdDestacada);
    if (!face || !face.face_normal) return;

    const [nx, ny, nz] = face.face_normal;
    const normalThree = new THREE.Vector3(nx, nz, -ny).normalize();
    const targetDown = new THREE.Vector3(0, -1, 0);

    // Quaternion destino: normal de cara apunta hacia -Y (mesa)
    const qDelta = new THREE.Quaternion();
    qDelta.setFromUnitVectors(normalThree, targetDown);

    const baseQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.PI / 2, 0, 0),
    );
    const qTarget = qDelta.multiply(baseQ);

    // Calcular posición Y para que la pieza quede sobre la grilla
    // El bounding box rotado determina cuánto debe subirse el mesh
    const bb = meshData.bounding_box;
    const halfDiag =
      Math.sqrt(
        (bb.max[0] - bb.min[0]) ** 2 +
          (bb.max[1] - bb.min[1]) ** 2 +
          (bb.max[2] - bb.min[2]) ** 2,
      ) / 2;
    const posYTarget = halfDiag * 0.5;
    const posYStart = meshRef.current.position.y;

    // Animación slerp — 600ms
    const DURACION_MS = 600;
    const qStart = meshRef.current.quaternion.clone();
    const inicio = performance.now();
    let animId: number;

    const animar = (ahora: number) => {
      if (!meshRef.current) return;
      const t = Math.min((ahora - inicio) / DURACION_MS, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      meshRef.current.quaternion.slerpQuaternions(qStart, qTarget, ease);
      // Ajustar Y simultáneamente con la rotación
      meshRef.current.position.y = posYStart + (posYTarget - posYStart) * ease;
      if (t < 1) {
        animId = requestAnimationFrame(animar);
      }
    };

    animId = requestAnimationFrame(animar);

    return () => cancelAnimationFrame(animId);
  }, [faceIdDestacada, meshData]);

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
          const opId = face?.feature?.op_id as string | undefined;
          const op = opId ? operaciones.find((o) => o.id === opId) : undefined;
          const isSel = op ? seleccionadas.includes(op.id) : false;
          prev.color.copy(
            isSel
              ? COLOR_SELECCIONADO
              : op
                ? colorPorTipo(op.tipo)
                : COLOR_BASE,
          );
          prev.emissive.set(0x000000);
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

    // Click
    const handleClick = (e: MouseEvent) => {
      const faceId = getHitFaceId(e);
      //console.log("CLICK faceId:", faceId);
      if (faceId === null) return;
      if (onFaceClick) {
        onFaceClick(faceId);
        return;
      }
      const opId = faceToOpId.get(faceId);
      if (opId) onToggle(opId);
    };

    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("click", handleClick);

    return () => {
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("click", handleClick);
    };
  }, [meshData, operaciones, seleccionadas, onToggle, onFaceClick]);

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
    <div
      ref={mountRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: "380px", cursor: "grab", background: "#0d1117" }}
    />
  );
}
