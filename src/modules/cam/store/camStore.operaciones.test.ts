// src/modules/cam/store/camStore.operaciones.test.ts
// Recorridos REALES: respuesta sellada → camStore → POST MDE (array completo);
// y selección del operador → ruta de producción → POST generate (seleccionadas).
// Solo api.post se sustituye para capturar la frontera de red.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/api", () => ({
  api: { post: vi.fn() },
}));

import { api } from "../../../services/api";
import {
  operacionesSeleccionadasParaEnvio,
  useCamStore,
  type OperacionSellada,
} from "./camStore";
import {
  generateGcode,
  type RespuestaOrientacionSellada,
  type TrabajoPayload,
} from "../services/camService";
import { solicitarRecomendacionesMDE } from "../services/mdeService";
import { pasoPorId } from "../domain/pasos";

const postMock = vi.mocked(api.post);

// Incluye claves conocidas, anidamiento y una extensión futura. Ningún valor se
// calcula en el frontend: todos son datos de entrada de la respuesta del motor.
const OP_PLANEADO = {
  op_id: "op_0",
  tipo: "planeado",
  descripcion: "Planeado cara superior",
  setup: 1,
  face_indices: [2, 3],
  orientacion: {
    origen: "normal_cara_plana",
    eje_herramienta_pieza: [0.0, 0.0, 1.0],
  },
  freecad_op: "Path.Op.Face",
};

const OP_TALADRADO = {
  op_id: "op_1",
  tipo: "taladrado",
  descripcion: "Taladrado",
  setup: 1,
  face_indices: [7],
  diametro_mm: 6.8,
  profundidad_mm: 22,
  orientacion: {
    origen: "eje_cilindro",
    eje_herramienta_pieza: [0.0, 0.0, 1.0],
  },
  campo_futuro: {
    valores: [1, { dato: "conservar" }],
  },
};

const OPS_BACKEND = [OP_PLANEADO, OP_TALADRADO];

function completarSellado(operaciones: Record<string, any>[]) {
  const estado = useCamStore.getState();
  useCamStore.setState({
    idJob: 42,
    estadoOrientacion: "sellando",
    montajeConfig: {
      ...estado.montajeConfig,
      face_id_apoyo: 3,
    },
  });
  const respuesta = {
    exito: true,
    face_id_apoyo: 3,
    normal_apoyo: [0, 0, -1],
    dimensiones_marco: { x: 60, y: 40, z: 100 },
    analisis: { operaciones },
    mesh_data: { faces: [] },
    matriz: null,
  } as RespuestaOrientacionSellada;
  useCamStore.getState().completarSellado(respuesta, 3, 42);
}

function payloadCon(operaciones: OperacionSellada[]): TrabajoPayload {
  const estado = useCamStore.getState();
  return {
    archivo: new File(["STEP"], "pieza.step"),
    idJob: 42,
    operaciones,
    herramientas: [],
    materialKey: "acero",
    stockConfig: estado.stockConfig,
    partDims: { x: 60, y: 40, z: 100 },
    datumConfig: estado.datumConfig,
    montajeConfig: estado.montajeConfig,
    contextoFabricacion: estado.contextoFabricacion,
    ordenSetups: estado.ordenSetups,
    idMaquina: 2,
  };
}

function operacionesJson(form: FormData): unknown {
  const crudo = form.get("operaciones_json");
  expect(typeof crudo).toBe("string");
  return JSON.parse(crudo as string);
}

describe("camStore — operaciones selladas exactas", () => {
  beforeEach(() => {
    useCamStore.getState().reset();
    postMock.mockReset();
  });

  it("almacena los objetos completos y la selección solo cambia sus op_id", () => {
    completarSellado(OPS_BACKEND);

    const antes = useCamStore.getState();
    expect(antes.operaciones).toEqual(OPS_BACKEND);
    expect(antes.operaciones[0]).toBe(OP_PLANEADO);
    expect(antes.operaciones[1]).toBe(OP_TALADRADO);
    expect(antes.operaciones[1]).not.toHaveProperty("id");
    expect(antes.operaciones[1]).not.toHaveProperty("seleccionada");
    expect(pasoPorId("operaciones").puedeAvanzar(antes)).toBe(false);

    antes.toggleOperacion("op_1");

    const despues = useCamStore.getState();
    expect(despues.operacionesSeleccionadas).toEqual(["op_1"]);
    expect(despues.operaciones).toEqual(OPS_BACKEND);
    expect(despues.operaciones[1]).toBe(OP_TALADRADO);
    expect(pasoPorId("operaciones").puedeAvanzar(despues)).toBe(true);
  });

  it("rechaza una operación sin op_id en vez de inventar una identidad", () => {
    expect(() =>
      completarSellado([{ ...OP_TALADRADO, op_id: "" }]),
    ).toThrow(/sin op_id válido/);
  });

  it("rechaza ids desconocidos con error visible y sin crear selección huérfana", () => {
    completarSellado(OPS_BACKEND);

    useCamStore.getState().setOperacionesSeleccionadas(["op_inexistente"]);
    let estado = useCamStore.getState();
    expect(estado.operacionesSeleccionadas).toEqual([]);
    expect(estado.errorAvance).toMatch(/op_inexistente/);
    expect(pasoPorId("operaciones").puedeAvanzar(estado)).toBe(false);
    expect(estado.operaciones).toEqual(OPS_BACKEND);

    estado.toggleOperacion("op_desconocido");
    estado = useCamStore.getState();
    expect(estado.operacionesSeleccionadas).toEqual([]);
    expect(estado.errorAvance).toMatch(/op_desconocido/);
    expect(pasoPorId("operaciones").puedeAvanzar(estado)).toBe(false);

    estado.toggleOperacion("op_1");
    estado = useCamStore.getState();
    expect(estado.operacionesSeleccionadas).toEqual(["op_1"]);
    expect(estado.errorAvance).toBeNull();

    // Rechazo atómico: ni siquiera una selección válida anterior permite
    // avanzar mientras el intento con id desconocido tenga un error visible.
    estado.setOperacionesSeleccionadas(["op_1", "op_inexistente"]);
    estado = useCamStore.getState();
    expect(estado.operacionesSeleccionadas).toEqual(["op_1"]);
    expect(estado.errorAvance).toMatch(/op_inexistente/);
    expect(pasoPorId("operaciones").puedeAvanzar(estado)).toBe(false);
  });

  it("bloquea una selección huérfana y nunca la convierte en todas las operaciones", () => {
    completarSellado(OPS_BACKEND);
    useCamStore.setState({
      operacionesSeleccionadas: ["op_huerfano"],
      errorAvance: null,
    });
    const estado = useCamStore.getState();

    expect(pasoPorId("operaciones").puedeAvanzar(estado)).toBe(false);
    expect(() =>
      operacionesSeleccionadasParaEnvio(
        estado.operaciones,
        estado.operacionesSeleccionadas,
      ),
    ).toThrow(/op_huerfano/);
    expect(() =>
      operacionesSeleccionadasParaEnvio(estado.operaciones, []),
    ).toThrow(/al menos una operación/);

    estado.setMdeRecomendaciones(null);
    const despues = useCamStore.getState();
    expect(despues.operacionesSeleccionadas).toEqual(["op_huerfano"]);
    expect(despues.errorAvance).toMatch(/op_huerfano/);
    expect(despues.mdeEstado).toBe("error");
    expect(pasoPorId("operaciones").puedeAvanzar(despues)).toBe(false);
  });

  it("envía a MDE el array completo y a generate solo la selección obtenida por la ruta de producción", async () => {
    completarSellado(OPS_BACKEND);
    useCamStore.getState().toggleOperacion("op_1");
    const estado = useCamStore.getState();
    const seleccionadas = operacionesSeleccionadasParaEnvio(
      estado.operaciones,
      estado.operacionesSeleccionadas,
    );
    expect(seleccionadas).toEqual([OP_TALADRADO]);
    expect(seleccionadas[0]).toBe(OP_TALADRADO);
    postMock.mockResolvedValue({ data: {} } as any);

    await solicitarRecomendacionesMDE(payloadCon(estado.operaciones));
    await generateGcode(payloadCon(seleccionadas));

    expect(postMock.mock.calls.map(([url]) => url)).toEqual([
      "/cam/mde-recommendations",
      "/cam/generate",
    ]);
    const formMDE = postMock.mock.calls[0][1] as FormData;
    const formGenerate = postMock.mock.calls[1][1] as FormData;
    const crudoMDE = formMDE.get("operaciones_json") as string;
    const crudoGenerate = formGenerate.get("operaciones_json") as string;

    // Evidencia cruda para el reporte del Reviewer.
    console.log("POST /cam/mde-recommendations operaciones_json:", crudoMDE);
    console.log("POST /cam/generate operaciones_json:", crudoGenerate);

    expect(operacionesJson(formMDE)).toEqual(OPS_BACKEND);
    expect(operacionesJson(formGenerate)).toEqual([OP_TALADRADO]);
    expect(JSON.parse(crudoGenerate)[0].op_id).toBe("op_1");
    expect(
      JSON.parse(crudoGenerate).some((op: OperacionSellada) => op.op_id === "op_0"),
    ).toBe(false);
    expect(JSON.parse(crudoGenerate)[0].campo_futuro).toEqual(
      OP_TALADRADO.campo_futuro,
    );
  });
});
