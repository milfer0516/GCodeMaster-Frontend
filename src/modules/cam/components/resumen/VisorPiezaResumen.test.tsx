import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Maquina } from "../../../../services/maquinasService";
import type { MeshData } from "../../services/camService";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { StepMontaje } from "../steps/StepMontaje";
import { StepStock } from "../steps/StepStock";
import { VisorPiezaResumen } from "./VisorPiezaResumen";

const webgl = vi.hoisted(() => {
  class Renderer {
    domElement = document.createElement("canvas");
    shadowMap = { enabled: false };
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    dispose = vi.fn();
    forceContextLoss = vi.fn(() => webgl.contextos.delete(this));
    ultimoDibujo?: { escena: THREE.Scene; camara: THREE.PerspectiveCamera };
    render = vi.fn((escena: THREE.Scene, camara: THREE.PerspectiveCamera) => {
      escena.updateMatrixWorld();
      camara.updateMatrixWorld();
      this.ultimoDibujo = { escena, camara };
    });

    constructor() {
      webgl.instancias.push(this);
      webgl.contextos.add(this);
      webgl.maxContextos = Math.max(webgl.maxContextos, webgl.contextos.size);
    }
  }

  return {
    Renderer,
    instancias: [] as Renderer[],
    contextos: new Set<Renderer>(),
    maxContextos: 0,
  };
});

// jsdom carece de WebGL. Escena, controles, malla, proyección y efectos son reales.
vi.mock("three", async (importOriginal) => ({
  ...await importOriginal<typeof THREE>(),
  WebGLRenderer: webgl.Renderer,
}));

class Observador {
  static actual: Observador;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(readonly avisar: () => void) {
    Observador.actual = this;
  }
}

const frames = new Map<number, FrameRequestCallback>();
let ancho: number;
let alto: number;
let idFrame: number;

function dibujarUnFrame() {
  for (const [id, dibujar] of [...frames]) {
    if (frames.delete(id)) dibujar(performance.now());
  }
}

function dibujarPendientes() {
  let vueltas = 0;
  while (frames.size && vueltas++ < 200) dibujarUnFrame();
  expect(frames.size).toBe(0);
}

function cargarPrismaOblicuo(escala: number) {
  // Un prisma esbelto oblicuo comprueba que las esquinas vacías de su caja
  // envolvente no obligan a alejar la cámara.
  return cargarPieza(
    new THREE.BoxGeometry(2 * escala, 11 * escala, escala)
      .rotateZ(Math.PI / 6)
      .translate(70 * escala, -45 * escala, 15 * escala),
  );
}

function cargarPieza(prisma: THREE.BoxGeometry, caraApoyo = 0) {
  prisma.computeBoundingBox();
  const caja = prisma.boundingBox!;
  const { x, y, z } = caja.getSize(new THREE.Vector3());
  const dimensiones = { x, y, z };
  const positions = Array.from(prisma.getAttribute("position").array);
  const normales = prisma.getAttribute("normal");
  const indices = Array.from(prisma.index!.array);
  const malla: MeshData = {
    positions,
    indices,
    normals: Array.from(normales.array),
    faces: prisma.groups.map(({ start, count }, i) => ({
      start,
      count,
      face_id: i,
      surface_type: "Plane",
      feature: null,
      face_normal: new THREE.Vector3().fromBufferAttribute(normales, i * 4).toArray(),
    })),
    bounding_box: {
      min: caja.min.toArray(),
      max: caja.max.toArray(),
      center: caja.getCenter(new THREE.Vector3()).toArray(),
    },
    stats: {
      total_faces: prisma.groups.length,
      total_vertices: positions.length / 3,
      total_triangles: indices.length / 3,
      total_indices: indices.length,
    },
  };
  prisma.dispose();

  useCamStore.setState({
    meshData: malla,
    orientacionSellada: {
      exito: true,
      face_id_apoyo: caraApoyo,
      normal_apoyo: [0, 0, -1],
      dimensiones_marco: dimensiones,
      analisis: {},
      mesh_data: malla,
      matriz: null,
    },
  });
  return dimensiones;
}

function piezaDibujada() {
  const { escena, camara } = webgl.instancias.at(-1)!.ultimoDibujo!;
  const pieza = escena.children.find((obj) => obj instanceof THREE.Mesh) as THREE.Mesh;
  return { escena, camara, pieza };
}

function comprobarEncuadre() {
  const { camara, pieza } = piezaDibujada();
  expect(camara.aspect).toBeCloseTo(ancho / alto);
  const posiciones = pieza.geometry.getAttribute("position");
  const vertice = new THREE.Vector3();
  let ocupacion = 0;
  for (let i = 0; i < posiciones.count; i++) {
    vertice.fromBufferAttribute(posiciones, i).applyMatrix4(pieza.matrixWorld).project(camara);
    ocupacion = Math.max(ocupacion, Math.abs(vertice.x), Math.abs(vertice.y));
    expect(Math.abs(vertice.z)).toBeLessThan(1);
  }
  expect(ocupacion).toBeGreaterThan(0.84);
  expect(ocupacion).toBeLessThan(0.89);
}

beforeEach(() => {
  ancho = 300;
  alto = 340;
  idFrame = 0;
  webgl.instancias.length = 0;
  webgl.contextos.clear();
  webgl.maxContextos = 0;
  useCamStore.setState(useCamStore.getInitialState(), true);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => ancho);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => alto);
  vi.stubGlobal("ResizeObserver", Observador);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++idFrame, callback);
    return idFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  cleanup();
  frames.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("visor de la pieza en Resumen", () => {
  it.each([0.001, 250])("encuadra una pieza de escala %s al entrar y al redimensionar", (escala) => {
    cargarPrismaOblicuo(escala);
    render(<VisorPiezaResumen estado={useCamStore.getState()} />);
    dibujarPendientes();
    comprobarEncuadre();

    for (const [w, h] of [[160, 340], [620, 300], [1260, 340]]) {
      ancho = w;
      alto = h;
      Observador.actual.avisar();
      dibujarPendientes();
      comprobarEncuadre();
    }

    const renderer = webgl.instancias[0];
    expect(renderer.shadowMap.enabled).toBe(false);
    const dibujos = renderer.render.mock.calls.length;
    Observador.actual.avisar();
    expect(frames.size).toBe(0);
    expect(renderer.render).toHaveBeenCalledTimes(dibujos);
  });

  it("dibuja al hacer zoom, respeta ese zoom al redimensionar y vuelve a encuadrar con el botón", () => {
    cargarPrismaOblicuo(1);
    render(<VisorPiezaResumen estado={useCamStore.getState()} />);
    dibujarPendientes();
    const { camara } = piezaDibujada();
    const inicial = camara.position.clone();
    const renderer = webgl.instancias[0];
    const dibujos = renderer.render.mock.calls.length;
    fireEvent.wheel(renderer.domElement, { deltaY: -100 });
    dibujarPendientes();
    expect(renderer.render.mock.calls.length).toBeGreaterThan(dibujos);
    const trasZoom = camara.position.clone();
    expect(trasZoom.equals(inicial)).toBe(false);

    ancho = 540;
    Observador.actual.avisar();
    dibujarPendientes();
    expect(camara.position.distanceTo(trasZoom)).toBeLessThan(1e-10);
    fireEvent.click(screen.getByRole("button", { name: "Vista del operario" }));
    dibujarPendientes();
    comprobarEncuadre();
  });

  it("libera el visor anterior antes de entrar y descarta los recursos al salir", () => {
    const dimensiones = cargarPrismaOblicuo(10);
    const agregar = vi.spyOn(window, "addEventListener");
    const quitar = vi.spyOn(window, "removeEventListener");
    const agregarCanvas = vi.spyOn(HTMLCanvasElement.prototype, "addEventListener");
    const quitarCanvas = vi.spyOn(HTMLCanvasElement.prototype, "removeEventListener");
    const { rerender, unmount, container } = render(<CamViewer3D dimensiones={dimensiones} />);
    const anterior = webgl.instancias[0];

    rerender(<VisorPiezaResumen estado={useCamStore.getState()} />);
    dibujarPendientes();
    const resumen = webgl.instancias[1];
    expect(anterior.dispose).toHaveBeenCalledOnce();
    expect(anterior.forceContextLoss).toHaveBeenCalledOnce();
    expect(webgl.maxContextos).toBe(1);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);

    const observador = Observador.actual;
    const { escena, pieza } = piezaDibujada();
    const liberarPieza = vi.spyOn(pieza.geometry, "dispose");
    const liberarMaterial = vi.spyOn((pieza.material as THREE.Material[])[0], "dispose");
    const rejilla = escena.children.find((obj) => obj instanceof THREE.GridHelper) as THREE.GridHelper;
    const liberarRejilla = vi.spyOn(rejilla.geometry, "dispose");
    const resize = agregar.mock.calls.filter(([tipo]) => tipo === "resize").at(-1)!;
    const eventosCanvas = agregarCanvas.mock.calls.filter((_, i) =>
      agregarCanvas.mock.contexts[i] === resumen.domElement,
    );
    expect(eventosCanvas.map(([tipo]) => tipo)).toEqual(
      expect.arrayContaining(["pointerdown", "wheel", "mousemove", "click", "dblclick"]),
    );

    ancho = 520;
    observador.avisar();
    expect(frames.size).toBeGreaterThan(0);
    unmount();

    expect(frames.size).toBe(0);
    expect(observador.disconnect).toHaveBeenCalledOnce();
    expect(quitar).toHaveBeenCalledWith(...resize);
    for (const [tipo, listener] of eventosCanvas) {
      expect(quitarCanvas.mock.calls.some(([removido, fn], i) =>
        removido === tipo && fn === listener && quitarCanvas.mock.contexts[i] === resumen.domElement,
      )).toBe(true);
    }
    expect(liberarPieza).toHaveBeenCalledOnce();
    expect(liberarMaterial).toHaveBeenCalledOnce();
    expect(liberarRejilla).toHaveBeenCalledOnce();
    expect(resumen.dispose).toHaveBeenCalledOnce();
    expect(resumen.forceContextLoss).toHaveBeenCalledOnce();
    expect(webgl.contextos.size).toBe(0);
    expect(container.querySelector("canvas")).toBeNull();
    expect(useCamStore.getState().meshData).toBe(useCamStore.getState().orientacionSellada?.mesh_data);
  });
});

const maquinaConMesa: Maquina = {
  id_maquina: 1,
  nombre: "VMC-850",
  modelo: "M-850",
  marca: "Marca A",
  tipo: "fresadora_vertical",
  controlador: "fanuc",
  controlador_modelo: "0i-MF",
  rpm_min_husillo: 100,
  rpm_max_husillo: 8000,
  potencia_husillo_kw: null,
  cono_husillo: null,
  avance_max_mmmin: 10000,
  rapido_x_mmmin: 0,
  rapido_y_mmmin: 0,
  rapido_z_mmmin: 0,
  recorrido_x_mm: 850,
  recorrido_y_mm: 500,
  recorrido_z_mm: 500,
  mesa_x_mm: 850,
  mesa_y_mm: 500,
  num_herramientas_atc: null,
  diametro_herramienta_max_mm: null,
  largo_herramienta_max_mm: null,
  peso_herramienta_max_kg: null,
  refrigeracion: null,
  descripcion: null,
};

describe("resaltado de la cara de apoyo al llegar la máquina", () => {
  it.each([
    { step: "montaje", Paso: StepMontaje },
    { step: "stock", Paso: StepStock },
  ] as const)("conserva el verde de apoyo en $step tras reconstruir la pieza", ({ step, Paso }) => {
    // jsdom tampoco dibuja el fondo 2D de papel técnico.
    const contexto2D: Pick<CanvasRenderingContext2D, "fillRect" | "beginPath" | "moveTo" | "lineTo" | "stroke"> = {
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(contexto2D as CanvasRenderingContext2D);

    const caraApoyo = 5; // Grupo de la cara inferior de BoxGeometry.
    const dimensiones = cargarPieza(new THREE.BoxGeometry(16, 24, 8).translate(0, 0, 4), caraApoyo);
    const {
      orientacionSellada,
      setMontajeConfig,
      confirmMontaje,
      cerrarMontaje,
      setMaquina,
      meshData,
    } = useCamStore.getState();
    setMontajeConfig({ face_id_apoyo: caraApoyo, face_normal_apoyo: [0, 0, -1] });
    const sellada = step === "stock" ? orientacionSellada : null;
    useCamStore.setState({
      step,
      analisis: { dimensiones },
      orientacionSellada: sellada,
      estadoOrientacion: sellada ? "sellada" : "editando",
    });
    if (sellada) {
      confirmMontaje();
      cerrarMontaje();
    }
    const indiceApoyo = meshData!.faces.findIndex((cara) => cara.face_id === caraApoyo);

    expect(useCamStore.getState().maquina).toBeNull();
    render(<Paso />);
    dibujarUnFrame();
    const piezaInicial = piezaDibujada().pieza;
    const materialesIniciales = piezaInicial.material as THREE.MeshStandardMaterial[];
    expect(materialesIniciales[indiceApoyo].color.getHex()).toBe(0x00ff88);

    act(() => setMaquina(maquinaConMesa));
    dibujarUnFrame();
    const piezaActual = piezaDibujada().pieza;
    expect(piezaActual).not.toBe(piezaInicial);
    expect(piezaActual.scale.x).toBeGreaterThan(piezaInicial.scale.x);
    expect(useCamStore.getState().meshData).toBe(meshData);
    const materialesActuales = piezaActual.material as THREE.MeshStandardMaterial[];
    expect(materialesActuales[indiceApoyo].color.getHex()).toBe(0x00ff88);
    expect(materialesActuales[indiceApoyo].emissive.getHex()).toBe(0x003311);
    expect(materialesActuales[0].color.getHex()).toBe(materialesIniciales[0].color.getHex());
  });
});
