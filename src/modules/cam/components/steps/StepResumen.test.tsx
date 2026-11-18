// src/modules/cam/components/steps/StepResumen.test.tsx
// Renderiza el paso Resumen REAL sobre el store REAL con el modelo REAL de
// components/resumen/hojaSetup.ts. Las decisiones del operario se aplican con
// las MISMAS acciones que usan las pantallas: setMontajeConfig({wcs})
// (SeccionCeroPieza), setFaceAllowance / setCylOffset + setStockConfig
// (StepStock), asignarHerramienta y setOperacionesSeleccionadas (Operaciones),
// confirmMontaje (alSalir de Montaje). El estado de partida se siembra con
// setState y tiene la forma de los contratos que el frontend ya espeja
// (sellado, MDE, máquina). El Setup y las caras salen de las funciones de
// dominio reales (setupDesdeOrientacionSellada, deriveStockFaces).
//
// Único sustituto: CamViewer3D. jsdom no tiene WebGL (THREE.WebGLRenderer no
// arranca), así que se reemplaza por un registro de las props con las que el
// paso lo monta. Lo que se prueba es la decisión del PASO (montarlo una sola
// vez, en solo lectura, sin malla propia, y no montarlo sin la malla del
// store); el visor en sí no es la lógica bajo prueba.
//
// La red no se mockea: se espía el cliente `api` REAL y fetch para probar que
// este paso no hace ninguna llamada.
//
// jsdom no calcula layout ni estilos: estos tests NO verifican el ancho de
// 360 px, el escritorio ni el contraste en tema claro u oscuro.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const visor = vi.hoisted(() => ({ montajes: [] as Array<Record<string, unknown>> }));
vi.mock("../CamViewer3D", () => ({
  CamViewer3D: (props: Record<string, unknown>) => {
    visor.montajes.push(props);
    return <div data-testid="visor-3d" />;
  },
}));

import { useCamStore, type CamState, type OperacionSellada } from "../../store/camStore";
import {
  buildStockPayload,
  type RespuestaOrientacionSellada,
} from "../../services/camService";
import { api } from "../../../../services/api";
import type { Maquina } from "../../../../services/maquinasService";
import type { RespuestaMDESetup } from "../../domain/mdeRecomendaciones";
import { setupDesdeOrientacionSellada } from "../../domain/setupSellado";
import { puntosDatumDeCaja } from "../../domain/datum";
import { FORMA_LABEL } from "../../domain/contextoFabricacion";
import {
  CYL_STOCK_INICIAL,
  deriveStockFaces,
  setCylOffset,
  setFaceAllowance,
  type StockFace,
  type StockFaceDirection,
} from "../../utils/stockFaces";
import {
  AVISO_ELECCION_NO_SE_ENVIA,
  ETIQUETA_BRUTO,
  NO_DECLARADO,
  NO_DISPONIBLE,
  NOTA_S_F,
  TITULO_SOBREMEDIDAS,
} from "../resumen/hojaSetup";
import {
  COLUMNAS_OPERACIONES,
  TITULO_OPERACIONES,
} from "../resumen/ListaOperacionesHoja";
import { SIN_VISOR } from "../resumen/VisorPiezaResumen";
import { StepResumen, TITULO_RESUMEN } from "./StepResumen";

// ── Datos de entrada ───────────────────────────────────────────────────────

const CAJA = { min: [-86, -86, 0], max: [86, 86, 72], center: [0, 0, 36] };

// Entrada de caras_planas de la cara de apoyo en el análisis SELLADO (mismos
// campos que lee SeccionCaraApoyo: face_index, normal, area_mm2, apunta_*).
const CARA_APOYO_SELLADA = {
  face_index: 5,
  normal: [0, 0, -1],
  area_mm2: 29584,
  apunta_abajo: true,
  apunta_arriba: false,
  z_mm: 0,
};

const MALLA = {
  positions: [],
  normals: [],
  indices: [],
  faces: [],
  bounding_box: CAJA,
  stats: { total_faces: 0, total_vertices: 0, total_triangles: 0, total_indices: 0 },
};

const ORIENTACION = {
  exito: true,
  face_id_apoyo: 5,
  normal_apoyo: [0, 0, -1],
  dimensiones_marco: { x: 172, y: 172, z: 72 },
  analisis: { operaciones: [], caras_planas: [CARA_APOYO_SELLADA] },
  mesh_data: MALLA,
  matriz: null,
} as unknown as RespuestaOrientacionSellada;

const ETIQUETA_DATUM = puntosDatumDeCaja(CAJA).find(
  (p) => p.id === "esquina_sup_izq",
)!.etiqueta;

const MATERIAL = {
  id_material: 3,
  nombre: "Acero 1045",
  grupo_iso: "P",
  categoria: "Acero al carbono",
};

const MAQUINA: Maquina = {
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
  num_herramientas_atc: null,
  diametro_herramienta_max_mm: null,
  largo_herramienta_max_mm: null,
  peso_herramienta_max_kg: null,
  refrigeracion: null,
  descripcion: null,
};

const MONTAJE: CamState["montajeConfig"] = {
  tipo_sujecion: "bridas",
  sujecion_config: {
    familia: "bridas",
    id_utillaje: 7,
    nombre_utillaje: "Juego de bridas M12",
    etiqueta_familia: "Bridas / estribos",
    parametros_montaje: {},
    envolvente: { part_bottom_z_mm: 25, part_top_z_mm: 97, fixture_top_z_mm: 110 },
  },
  id_maquina: 1,
  face_id_apoyo: 5,
  face_normal_apoyo: [0, 0, -1],
  wcs: "G55",
  notas: "Apretar en cruz",
  montaje_espacial: null,
};

const OPS: OperacionSellada[] = [
  { op_id: "op_0", tipo: "planeado", descripcion: "Planeado cara superior", setup: 1, face_indices: [2] },
  { op_id: "op_1", tipo: "taladrado", descripcion: "Taladrado Ø6.8", setup: 1, face_indices: [7] },
  { op_id: "op_2", tipo: "cajera", descripcion: "Cajera inferior", setup: 2, face_indices: [9] },
];

const hechoIdeal = (tipo: string, diametro: number) => ({
  rule_id: "R10",
  code: "ideal_tool_available",
  data: { ideal_tool_types: [tipo], matched_tool_type: tipo, matched_diameter_mm: diametro },
  conclusion: {},
  based_on: [],
});

const recomendacion = (operation: string, evidence: any[]) => ({
  operation,
  status: "required" as const,
  confidence: 0.9,
  presented: true,
  default_checked: true,
  was_conflict: false,
  evidence,
});

// Con "superior_primero", OP10 es el setup 1 y OP20 el setup 2.
const MDE: RespuestaMDESetup[] = [
  {
    setup: "OP10",
    status: "ok",
    recommendations: [
      recomendacion("planeado", [hechoIdeal("fresa_planeado", 50)]),
      recomendacion("taladrado", [hechoIdeal("broca", 6.8)]),
    ],
  },
  {
    setup: "OP20",
    status: "ok",
    recommendations: [recomendacion("cajera", [hechoIdeal("fresa_plana", 10)])],
  },
];

/** Las caras recién creadas al confirmar el montaje (sin ninguna declarada). */
function carasIniciales(): StockFace[] {
  return deriveStockFaces(setupDesdeOrientacionSellada(ORIENTACION, 25));
}

/** Aplica ediciones de cara como StepStock.setFaceOffset (setFaceAllowance). */
function editarCaras(
  caras: StockFace[],
  ediciones: Array<[StockFaceDirection, number]>,
): StockFace[] {
  return ediciones.reduce((acc, [dir, v]) => setFaceAllowance(acc, dir, v), caras);
}

// Todas las caras editables declaradas: X+ 2, X− 1, Y+ 1.5, Y− 0.5, Z+ 3.
const EDICIONES_COMPLETAS: Array<[StockFaceDirection, number]> = [
  ["x_pos", 2],
  ["x_neg", 1],
  ["y_pos", 1.5],
  ["y_neg", 0.5],
  ["z_pos", 3],
];

function estadoCompleto(): Partial<CamState> {
  return {
    step: "resumen",
    nombreArchivo: "brida.step",
    idJob: 42,
    orientacionSellada: ORIENTACION,
    estadoOrientacion: "sellada",
    montajeCerrado: true,
    // La malla teselada del store (la única): con ella el visor no tesela.
    meshData: MALLA as any,
    setup: setupDesdeOrientacionSellada(ORIENTACION, 25),
    stockConfig: {
      tipo: "rectangular",
      stockFaces: editarCaras(carasIniciales(), EDICIONES_COMPLETAS),
      cyl: { ...CYL_STOCK_INICIAL },
      uniform: { x: false, y: false, z: false },
    },
    formaDeclarada: true,
    contextoFabricacion: { estado: "torneada", proceso_origen: "TORNO" },
    contextoRespondido: true,
    material: MATERIAL,
    maquina: MAQUINA,
    montajeConfig: MONTAJE,
    wcsDeclarado: true,
    datumConfig: { origen: "esquina_sup_izq" },
    operaciones: OPS,
    operacionesSeleccionadas: ["op_0", "op_2"],
    mdeRecomendaciones: MDE,
    mdeEstado: "listo",
    ordenSetups: "superior_primero",
    herramientaPorOperacion: {},
    engineResponse: null,
  };
}

/** Lo que el operario ve para una decisión no tomada con valor inicial. */
const noDeclaradoCon = (inicial: string) => `${NO_DECLARADO} (valor inicial: ${inicial})`;

// ── Secciones (títulos del diseño) ─────────────────────────────────────────

const PIEZA = "Información de la pieza";
const MATERIAL_STOCK = "Material y stock (bruto)";
const MAQUINA_CNC = "Máquina CNC";
const MONTAJE_SUJECION = "Montaje y sujeción";
const CERO = "Cero de pieza (Z0) y marco de referencia";

/** Signo menos de las etiquetas de cara (U+2212), igual que en hojaSetup.ts. */
const MENOS = "−";

// ── Lectura de la pantalla ─────────────────────────────────────────────────

/** Texto del <dd> de la fila `etiqueta` dentro de la sección `seccion`. */
function valorDe(seccion: string, etiqueta: string | RegExp): string {
  const region = screen.getByRole("region", { name: seccion });
  const dt = within(region).getByText(etiqueta, { selector: "dt" });
  return dt.parentElement?.querySelector("dd")?.textContent ?? "";
}

/** Fila de la tabla de sobremedidas cuya primera celda (encabezado) es `fila`. */
function filaSobremedida(fila: string): HTMLElement {
  const tabla = screen.getByRole("table", { name: TITULO_SOBREMEDIDAS });
  return within(tabla).getByRole("rowheader", { name: fila }).closest("tr")!;
}

/** Valor de sobremedida de la fila `fila` (X+, Y−, Radial (Ø)…). */
function sobremedida(fila: string): string {
  return filaSobremedida(fila).querySelector("[data-valor]")?.textContent ?? "";
}

/** Rol de la cara (columna "Rol") de la fila `fila`. */
function rolDe(fila: string): string {
  return within(filaSobremedida(fila)).getAllByRole("cell")[0].textContent ?? "";
}

function tablaOperaciones(): HTMLElement {
  return screen.getByRole("table", { name: TITULO_OPERACIONES });
}

/** Filas de datos de la tabla de operaciones (sin la de encabezados). */
function operacionesEnPantalla(): HTMLElement[] {
  return within(tablaOperaciones())
    .getAllByRole("row")
    .filter((tr) => within(tr).queryAllByRole("columnheader").length === 0);
}

function celdaOperacion(
  fila: HTMLElement,
  columna: (typeof COLUMNAS_OPERACIONES)[number],
): HTMLElement {
  return within(fila).getAllByRole("cell")[COLUMNAS_OPERACIONES.indexOf(columna)];
}

/** Herramienta del MDE: el primer valor de la celda "Herramienta (MDE)". */
function herramientaDe(fila: HTMLElement): string {
  return (
    celdaOperacion(fila, "Herramienta (MDE)").querySelector("[data-valor]")?.textContent ?? ""
  );
}

/** Campo con <dt> (S (rpm), F (mm/min), Elegida por el operario). */
function campoOperacion(fila: HTMLElement, campo: string): string {
  const dt = within(fila).getByText(campo, { selector: "dt" });
  return dt.parentElement?.querySelector("dd")?.textContent ?? "";
}

/** Textos de todos los valores "falta" pintados en la hoja. */
function valoresQueFaltan(): string[] {
  return Array.from(document.querySelectorAll('[data-valor="falta"]')).map(
    (n) => n.textContent ?? "",
  );
}

// ── Red: el cliente REAL espiado ───────────────────────────────────────────

let llamadas: Array<{ mock: { calls: unknown[] } }> = [];

function llamadasDeRed(): number {
  return llamadas.reduce((n, s) => n + s.mock.calls.length, 0);
}

beforeEach(() => {
  visor.montajes.length = 0;
  llamadas = [
    vi.spyOn(api, "get"),
    vi.spyOn(api, "post"),
    vi.spyOn(api, "put"),
    vi.spyOn(api, "patch"),
    vi.spyOn(api, "delete"),
    vi.spyOn(api, "request"),
    vi.spyOn(globalThis, "fetch"),
  ];
  useCamStore.getState().reset();
  useCamStore.setState(estadoCompleto());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Datos completos ────────────────────────────────────────────────────────

describe("StepResumen — hoja de setup con todo declarado", () => {
  it("cada fila muestra el dato del store; solo S, F y la altura del Z0 quedan sin valor", () => {
    render(<StepResumen />);

    expect(screen.getByRole("heading", { name: TITULO_RESUMEN })).toBeTruthy();

    expect(valorDe(PIEZA, "Archivo")).toBe("brida.step");
    expect(valorDe(PIEZA, "Dimensiones (X × Y × Z)")).toBe("172 × 172 × 72 mm");
    expect(valorDe(PIEZA, "Estado de la pieza")).toBe("Pieza torneada");

    expect(valorDe(MATERIAL_STOCK, "Material")).toBe("Acero 1045 · ISO P · Acero al carbono");
    expect(valorDe(MATERIAL_STOCK, "Forma del bruto")).toBe(FORMA_LABEL.rectangular);
    expect(sobremedida("X+")).toBe("2 mm");
    expect(sobremedida(`X${MENOS}`)).toBe("1 mm");
    expect(sobremedida("Y+")).toBe("1.5 mm");
    expect(sobremedida(`Y${MENOS}`)).toBe("0.5 mm");
    expect(sobremedida("Z+")).toBe("3 mm");
    expect(sobremedida(`Z${MENOS}`)).toBe("0 mm · bloqueada (cara de apoyo)");
    expect(rolDe("X+")).toBe("Libre");
    expect(rolDe("Z+")).toBe("Mecanizado");
    expect(rolDe(`Z${MENOS}`)).toBe("Apoyo");
    // Lo que arma buildStockPayload para stock_json: 172+2+1, 172+1.5+0.5, 72+3.
    expect(valorDe(MATERIAL_STOCK, ETIQUETA_BRUTO)).toBe("175 × 174 × 75 mm (X × Y × Z)");

    expect(valorDe(MAQUINA_CNC, "Máquina")).toBe("VMC-850");
    expect(valorDe(MAQUINA_CNC, "Marca y modelo")).toBe("Marca A · M-850");
    expect(valorDe(MAQUINA_CNC, "Control")).toBe("fanuc · 0i-MF");
    expect(valorDe(MAQUINA_CNC, "Husillo máximo")).toBe("8000 rpm");
    expect(valorDe(MAQUINA_CNC, "Avance máximo")).toBe("10000 mm/min");
    expect(
      within(screen.getByRole("region", { name: MAQUINA_CNC })).getByText(
        "El asistente carga la primera máquina registrada; aquí no se elige.",
      ),
    ).toBeTruthy();

    expect(valorDe(MONTAJE_SUJECION, "Utillaje")).toBe("Juego de bridas M12");
    expect(valorDe(MONTAJE_SUJECION, "Familia del utillaje")).toBe("Bridas / estribos");
    expect(valorDe(MONTAJE_SUJECION, "Mesa → cara inferior de la pieza")).toBe("25 mm");
    expect(valorDe(MONTAJE_SUJECION, "Mesa → cara superior de la pieza")).toBe("97 mm");
    expect(valorDe(MONTAJE_SUJECION, "Mesa → punto más alto del amarre")).toBe("110 mm");
    expect(valorDe(MONTAJE_SUJECION, "Notas de montaje")).toBe("Apretar en cruz");

    expect(valorDe(CERO, "Punto del cero (Z0)")).toBe(ETIQUETA_DATUM);
    expect(valorDe(CERO, "Corrector de origen")).toBe("G55");

    // Ninguna decisión pendiente: falta la altura del Z0 (nadie la declara) y
    // S y F de las dos operaciones seleccionadas (antes de generar no existen).
    expect(valoresQueFaltan()).toEqual([
      NO_DECLARADO,
      NO_DISPONIBLE,
      NO_DISPONIBLE,
      NO_DISPONIBLE,
      NO_DISPONIBLE,
    ]);
  });
});

// ── Regla 1: botón "Siguiente paso", sin generar, sin API ──────────────────

describe("Regla 1 — 'Siguiente paso', ningún botón de generar, ninguna llamada a la API", () => {
  it("datos declarados: el botón inferior es 'Siguiente paso' y no hay red", () => {
    render(<StepResumen />);
    expect(screen.getByRole("button", { name: /Siguiente paso/ })).toBeTruthy();
    expect(screen.queryAllByRole("button", { name: /generar/i })).toHaveLength(0);
    expect(llamadasDeRed()).toBe(0);
  });

  it("datos sin declarar (trabajo recién reiniciado): igual, y sin red", () => {
    useCamStore.getState().reset();
    useCamStore.setState({ step: "resumen" });
    render(<StepResumen />);
    expect(screen.getByRole("button", { name: /Siguiente paso/ })).toBeTruthy();
    expect(screen.queryAllByRole("button", { name: /generar/i })).toHaveLength(0);
    expect(llamadasDeRed()).toBe(0);
  });

  it("la pantalla de error de material sigue igual, con 'Siguiente paso' bloqueado", () => {
    useCamStore.setState({
      engineResponse: { error: "El bruto es menor que la pieza en X." } as any,
    });
    render(<StepResumen />);
    expect(screen.getByText("Material insuficiente")).toBeTruthy();
    expect(screen.getByText("El bruto es menor que la pieza en X.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "← Volver a configurar material bruto" }),
    ).toBeTruthy();
    const siguiente = screen.getByRole("button", { name: /Siguiente paso/ }) as HTMLButtonElement;
    expect(siguiente.disabled).toBe(true);
    expect(screen.queryAllByRole("button", { name: /generar/i })).toHaveLength(0);
    expect(visor.montajes).toHaveLength(0);
    expect(llamadasDeRed()).toBe(0);
  });
});

// ── Reglas 2 y 3: tabla de operaciones y parámetros de corte ───────────────

describe("Reglas 2 y 3 — tabla 'Operaciones seleccionadas' y 'Parámetros de corte'", () => {
  it("encabezado y columnas de la tabla", () => {
    render(<StepResumen />);
    expect(screen.getByRole("heading", { name: "Operaciones seleccionadas" })).toBeTruthy();
    const encabezados = within(tablaOperaciones())
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(encabezados).toEqual([...COLUMNAS_OPERACIONES]);
    expect(encabezados).toContain("Parámetros de corte");
  });

  it("S y F dicen 'no disponible' en cada operación, con la nota del motor", () => {
    useCamStore.getState().setOperacionesSeleccionadas(["op_0", "op_1", "op_2"]);
    render(<StepResumen />);
    const filas = operacionesEnPantalla();
    expect(filas).toHaveLength(3);
    for (const fila of filas) {
      const parametros = celdaOperacion(fila, "Parámetros de corte");
      expect(campoOperacion(parametros, "S (rpm)")).toBe(NO_DISPONIBLE);
      expect(campoOperacion(parametros, "F (mm/min)")).toBe(NO_DISPONIBLE);
    }
    const region = screen.getByRole("region", { name: TITULO_OPERACIONES });
    expect(within(region).getByText(NOTA_S_F)).toBeTruthy();
    expect(NOTA_S_F).toMatch(/por herramienta después de generar/);
  });

  it("aunque el store tenga una respuesta de generación, S y F siguen 'no disponible'", () => {
    useCamStore.setState({
      engineResponse: { parametros_corte: { rpm: 9991, feed_mm_min: 8881 } } as any,
    });
    render(<StepResumen />);
    for (const fila of operacionesEnPantalla()) {
      expect(campoOperacion(fila, "S (rpm)")).toBe(NO_DISPONIBLE);
      expect(campoOperacion(fila, "F (mm/min)")).toBe(NO_DISPONIBLE);
    }
  });
});

// ── Regla 4: cero de pieza ─────────────────────────────────────────────────

describe("Regla 4 — cero de pieza: corrector, valor inicial y altura del Z0", () => {
  it("corrector sin elegir: 'no declarado (valor inicial: G54)' y aviso de que se enviará G54", () => {
    useCamStore.setState({ montajeConfig: { ...MONTAJE, wcs: "G54" }, wcsDeclarado: false });
    render(<StepResumen />);
    expect(valorDe(CERO, "Corrector de origen")).toBe(noDeclaradoCon("G54"));
    const region = screen.getByRole("region", { name: CERO });
    expect(
      within(region).getByText("No eligió corrector de origen: se enviará G54 (valor inicial)."),
    ).toBeTruthy();
    expect(valorDe(CERO, "Altura del Z0")).toBe(NO_DECLARADO);
  });

  it("corrector elegido (G55): dato, sin aviso de valor inicial; altura del Z0 sigue 'no declarado'", () => {
    render(<StepResumen />);
    expect(valorDe(CERO, "Corrector de origen")).toBe("G55");
    const region = screen.getByRole("region", { name: CERO });
    expect(within(region).queryByText(/se enviará/)).toBeNull();
    expect(valorDe(CERO, "Altura del Z0")).toBe(NO_DECLARADO);
  });

  it("ningún texto habla de los valores por defecto del control", () => {
    useCamStore.setState({ datumConfig: {}, wcsDeclarado: false });
    render(<StepResumen />);
    expect(document.body.textContent).not.toMatch(/defecto del control|valores por defecto/i);
    expect(valorDe(CERO, "Punto del cero (Z0)")).toBe(NO_DECLARADO);
  });

  it("el operario elige G54 (igual al inicial): pasa a ser dato y desaparece el aviso", () => {
    useCamStore.setState({ montajeConfig: { ...MONTAJE, wcs: "G54" }, wcsDeclarado: false });
    useCamStore.getState().setMontajeConfig({ wcs: "G54" });
    render(<StepResumen />);
    expect(valorDe(CERO, "Corrector de origen")).toBe("G54");
    expect(
      within(screen.getByRole("region", { name: CERO })).queryByText(/se enviará/),
    ).toBeNull();
  });

  it("el operario elige G57: dato G57", () => {
    useCamStore.setState({ montajeConfig: { ...MONTAJE, wcs: "G54" }, wcsDeclarado: false });
    useCamStore.getState().setMontajeConfig({ wcs: "G57" });
    render(<StepResumen />);
    expect(valorDe(CERO, "Corrector de origen")).toBe("G57");
  });

  it("cambiar otra parte del montaje no declara el corrector", () => {
    useCamStore.setState({ montajeConfig: { ...MONTAJE, wcs: "G54" }, wcsDeclarado: false });
    useCamStore.getState().setMontajeConfig({ notas: "Otra nota" });
    render(<StepResumen />);
    expect(valorDe(CERO, "Corrector de origen")).toBe(noDeclaradoCon("G54"));
  });

  it("un trabajo nuevo (reset) vuelve a 'sin declarar'", () => {
    useCamStore.getState().setMontajeConfig({ wcs: "G56" });
    expect(useCamStore.getState().wcsDeclarado).toBe(true);
    useCamStore.getState().reset();
    expect(useCamStore.getState().wcsDeclarado).toBe(false);
    expect(useCamStore.getState().montajeConfig.wcs).toBe("G54");
  });
});

// ── Regla 5: sobremedidas sin declarar, nunca un guion ─────────────────────

/** Ninguna celda de valor de la hoja está vacía ni es un guion. */
function sinGuionesNiHuecos() {
  const celdas = Array.from(document.querySelectorAll("dd, td, [data-valor]"));
  expect(celdas.length).toBeGreaterThan(0);
  for (const celda of celdas) {
    const t = (celda.textContent ?? "").trim();
    expect(t).not.toBe("");
    expect(t).not.toMatch(/^[—–-]+$/);
  }
}

describe("Regla 5 — sobremedidas declaradas o 'no declarado (valor inicial: 0 mm)'", () => {
  it("caras recién creadas: cada cara editable dice 'no declarado (valor inicial: 0 mm)'", () => {
    const { stockConfig } = useCamStore.getState();
    useCamStore.getState().setStockConfig({ ...stockConfig, stockFaces: carasIniciales() });
    render(<StepResumen />);

    for (const fila of ["X+", `X${MENOS}`, "Y+", `Y${MENOS}`, "Z+"]) {
      expect(sobremedida(fila)).toBe(noDeclaradoCon("0 mm"));
    }
    // La cara de apoyo es regla, no decisión ni valor por defecto.
    expect(sobremedida(`Z${MENOS}`)).toBe("0 mm · bloqueada (cara de apoyo)");
    // El bruto que se enviará se muestra, avisando que lleva valores iniciales.
    expect(valorDe(MATERIAL_STOCK, ETIQUETA_BRUTO)).toBe(
      "172 × 172 × 72 mm (X × Y × Z) · incluye sobremedidas no declaradas",
    );
    sinGuionesNiHuecos();
  });

  it("datos declarados: tampoco hay guiones ni huecos", () => {
    render(<StepResumen />);
    sinGuionesNiHuecos();
  });

  it("trabajo sin nada declarado: ninguna celda vacía ni con guion", () => {
    useCamStore.getState().reset();
    useCamStore.setState({ step: "resumen" });
    render(<StepResumen />);
    expect(valorDe(MATERIAL_STOCK, TITULO_SOBREMEDIDAS)).toBe(NO_DISPONIBLE);
    sinGuionesNiHuecos();
  });

  it("solo la cara que editó el operario pasa a ser dato", () => {
    const { stockConfig } = useCamStore.getState();
    useCamStore.getState().setStockConfig({
      ...stockConfig,
      stockFaces: editarCaras(carasIniciales(), [["x_pos", 2]]),
    });
    render(<StepResumen />);
    expect(sobremedida("X+")).toBe("2 mm");
    expect(sobremedida("Z+")).toBe(noDeclaradoCon("0 mm"));
    expect(valorDe(MATERIAL_STOCK, ETIQUETA_BRUTO)).toBe(
      "174 × 172 × 72 mm (X × Y × Z) · incluye sobremedidas no declaradas",
    );
  });

  it("una cara devuelta a 0 vuelve a 'no declarado' (el campo de Stock la muestra vacía)", () => {
    const { stockConfig } = useCamStore.getState();
    useCamStore.getState().setStockConfig({
      ...stockConfig,
      stockFaces: editarCaras(carasIniciales(), [
        ["x_pos", 2],
        ["x_pos", 0],
      ]),
    });
    render(<StepResumen />);
    expect(sobremedida("X+")).toBe(noDeclaradoCon("0 mm"));
  });

  it("confirmar el montaje otra vez regenera las caras y borra las declaraciones", () => {
    useCamStore.getState().confirmMontaje();
    render(<StepResumen />);
    expect(sobremedida("X+")).toBe(noDeclaradoCon("0 mm"));
    expect(sobremedida("Z+")).toBe(noDeclaradoCon("0 mm"));
  });

  it("cilíndrico: región declarada con setCylOffset es dato; la no tocada, valor inicial", () => {
    const { stockConfig } = useCamStore.getState();
    useCamStore.getState().setStockConfig({
      ...stockConfig,
      tipo: "cilindrico",
      cyl: setCylOffset({ ...CYL_STOCK_INICIAL }, "radial", 1),
    });
    render(<StepResumen />);
    expect(valorDe(MATERIAL_STOCK, "Forma del bruto")).toBe(FORMA_LABEL.cilindrico);
    expect(sobremedida("Radial (Ø)")).toBe("1 mm");
    expect(sobremedida("Cara de mecanizado")).toBe(noDeclaradoCon("0 mm"));
    expect(sobremedida("Cara de apoyo")).toBe("0 mm · bloqueada (cara de apoyo)");
    // buildStockPayload: Ø 172 + 2×1, longitud 72 + 0.
    expect(valorDe(MATERIAL_STOCK, ETIQUETA_BRUTO)).toBe(
      "Ø174 × 72 mm · incluye sobremedidas no declaradas",
    );
    sinGuionesNiHuecos();
  });

  it("cilíndrico con las dos regiones declaradas: bruto sin aviso", () => {
    const { stockConfig } = useCamStore.getState();
    const cyl = setCylOffset(
      setCylOffset({ ...CYL_STOCK_INICIAL }, "radial", 1),
      "axial_machining",
      2,
    );
    useCamStore.getState().setStockConfig({ ...stockConfig, tipo: "cilindrico", cyl });
    render(<StepResumen />);
    expect(sobremedida("Cara de mecanizado")).toBe("2 mm");
    expect(valorDe(MATERIAL_STOCK, ETIQUETA_BRUTO)).toBe("Ø174 × 74 mm");
  });

  it("el registro de declaración no cambia stock_json", () => {
    const dims = { x: 172, y: 172, z: 72 };
    const rect = useCamStore.getState().stockConfig;
    const rectSinRegistro = {
      ...rect,
      stockFaces: rect.stockFaces.map(({ declarada: _d, ...cara }) => cara),
    };
    expect(rect.stockFaces.some((c) => c.declarada === true)).toBe(true);
    expect(buildStockPayload(rect, dims)).toEqual(buildStockPayload(rectSinRegistro, dims));
    expect(JSON.stringify(buildStockPayload(rect, dims))).not.toMatch(/declarad/);

    const cyl = setCylOffset({ ...CYL_STOCK_INICIAL }, "radial", 1);
    const { declaradas: _d, ...cylSinRegistro } = cyl;
    const conCyl = { ...rect, tipo: "cilindrico" as const, cyl };
    const conCylSinRegistro = { ...rect, tipo: "cilindrico" as const, cyl: cylSinRegistro };
    expect(buildStockPayload(conCyl, dims)).toEqual(buildStockPayload(conCylSinRegistro, dims));
    expect(JSON.stringify(buildStockPayload(conCyl, dims))).not.toMatch(/declarad/);
  });
});

// ── Regla 6: solo iconos ───────────────────────────────────────────────────

describe("Regla 6 — solo iconos, sin dibujos de máquina ni de utillaje", () => {
  const CASOS: Array<{ nombre: string; preparar: () => void }> = [
    { nombre: "datos declarados", preparar: () => {} },
    {
      nombre: "datos sin declarar",
      preparar: () => {
        useCamStore.getState().reset();
        useCamStore.setState({ step: "resumen" });
      },
    },
  ];
  it.each(CASOS)("$nombre: ninguna imagen, cada <svg> es un icono lucide", ({ preparar }) => {
    preparar();
    render(<StepResumen />);
    expect(document.querySelectorAll("img, picture, canvas, object, embed")).toHaveLength(0);
    const svgs = Array.from(document.querySelectorAll("svg"));
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.classList.contains("lucide")).toBe(true);
    }
    // Cada sección lleva su icono junto al título.
    for (const seccion of [PIEZA, MATERIAL_STOCK, MAQUINA_CNC, MONTAJE_SUJECION, CERO]) {
      const region = screen.getByRole("region", { name: seccion });
      expect(region.querySelector("svg.lucide")).not.toBeNull();
    }
  });
});

// ── Regla 7: el visor único, sin segunda malla ni teselación ───────────────

describe("Regla 7 — CamViewer3D reutilizado, con la malla única del store", () => {
  it("con la malla del store: un solo visor, en solo lectura, sin malla propia", () => {
    render(<StepResumen />);
    expect(screen.getAllByTestId("visor-3d")).toHaveLength(1);
    expect(visor.montajes.length).toBeGreaterThan(0);
    for (const props of visor.montajes) {
      expect(Object.keys(props).sort()).toEqual(["dimensiones", "faceIdDestacada", "modoResumen"]);
      expect(props.dimensiones).toBe(ORIENTACION.dimensiones_marco);
      expect(props.faceIdDestacada).toBe(5);
      expect(props.modoResumen).toBe(true);
    }
    expect(llamadasDeRed()).toBe(0);
  });

  it("sin la malla teselada del store: no se monta el visor (no podría teselar) y se dice", () => {
    useCamStore.setState({ meshData: null });
    render(<StepResumen />);
    expect(screen.queryByTestId("visor-3d")).toBeNull();
    expect(visor.montajes).toHaveLength(0);
    expect(screen.getByText(SIN_VISOR)).toBeTruthy();
    // El Setup y el bruto declarado siguen intactos (setMeshData los borraría).
    expect(useCamStore.getState().setup).not.toBeNull();
    expect(sobremedida("X+")).toBe("2 mm");
    expect(llamadasDeRed()).toBe(0);
  });

  it("sin medidas del sellado: no se monta el visor y se dice", () => {
    useCamStore.setState({
      orientacionSellada: { ...ORIENTACION, dimensiones_marco: undefined } as any,
    });
    render(<StepResumen />);
    expect(visor.montajes).toHaveLength(0);
    expect(
      screen.getByText(
        "Vista 3D no disponible: el motor no devolvió las medidas de la pieza orientada.",
      ),
    ).toBeTruthy();
  });
});

// ── Regla 8: cara de apoyo en palabras del operario ───────────────────────

describe("Regla 8 — cara de apoyo en palabras del operario, nunca 'Cara N'", () => {
  it("sellada con descripción del motor: orientación y área de caras_planas", () => {
    render(<StepResumen />);
    expect(valorDe(MONTAJE_SUJECION, "Cara de apoyo")).toBe(
      "Cara plana inferior · 29584 mm² · establecida",
    );
    expect(document.body.textContent).not.toMatch(/Cara \d|ID \d/);
  });

  it("sellada sin la entrada en caras_planas: lo dice, sin número de cara", () => {
    useCamStore.setState({
      orientacionSellada: { ...ORIENTACION, analisis: { operaciones: [] } } as any,
    });
    render(<StepResumen />);
    expect(valorDe(MONTAJE_SUJECION, "Cara de apoyo")).toBe(
      "Establecida · el motor no devolvió su descripción",
    );
    expect(document.body.textContent).not.toMatch(/Cara \d|ID \d/);
  });

  it("cara con solo el área (sin orientación): la dice sin inventar el lado", () => {
    useCamStore.setState({
      orientacionSellada: {
        ...ORIENTACION,
        analisis: { operaciones: [], caras_planas: [{ face_index: 5, area_mm2: 1200.5 }] },
      } as any,
    });
    render(<StepResumen />);
    expect(valorDe(MONTAJE_SUJECION, "Cara de apoyo")).toBe(
      "Cara plana · 1200.5 mm² · establecida",
    );
  });

  it("sin sellar: 'no declarado', sin número de cara", () => {
    useCamStore.setState({ estadoOrientacion: "editando" });
    render(<StepResumen />);
    expect(valorDe(MONTAJE_SUJECION, "Cara de apoyo")).toBe(NO_DECLARADO);
    expect(document.body.textContent).not.toMatch(/Cara \d|ID \d/);
  });
});

// ── Cada campo que falta ───────────────────────────────────────────────────

const ENVOLVENTE = MONTAJE.sujecion_config!.envolvente!;

const CASOS_FALTANTES: Array<{
  nombre: string;
  cambio: () => Partial<CamState>;
  seccion: string;
  etiqueta: string;
  esperado: string;
}> = [
  {
    nombre: "sin archivo → no disponible",
    cambio: () => ({ nombreArchivo: "", archivo: null }),
    seccion: PIEZA,
    etiqueta: "Archivo",
    esperado: NO_DISPONIBLE,
  },
  {
    nombre: "sin medidas del motor → no disponible",
    cambio: () => ({
      orientacionSellada: { ...ORIENTACION, dimensiones_marco: undefined } as any,
    }),
    seccion: PIEZA,
    etiqueta: "Dimensiones (X × Y × Z)",
    esperado: NO_DISPONIBLE,
  },
  {
    nombre: "estado de la pieza sin responder → no declarado con su valor inicial",
    cambio: () => ({
      contextoRespondido: false,
      contextoFabricacion: { estado: "desconocido", proceso_origen: "DESCONOCIDO" },
    }),
    seccion: PIEZA,
    etiqueta: "Estado de la pieza",
    esperado: noDeclaradoCon("No estoy seguro"),
  },
  {
    nombre: "sin material → no declarado",
    cambio: () => ({ material: null }),
    seccion: MATERIAL_STOCK,
    etiqueta: "Material",
    esperado: NO_DECLARADO,
  },
  {
    nombre: "forma del bruto sin declarar → no declarado con su valor inicial",
    cambio: () => ({ formaDeclarada: false }),
    seccion: MATERIAL_STOCK,
    etiqueta: "Forma del bruto",
    esperado: noDeclaradoCon(FORMA_LABEL.rectangular),
  },
  {
    nombre: "sin caras de bruto → sobremedidas no disponibles",
    cambio: () => ({
      setup: null,
      stockConfig: { ...useCamStore.getState().stockConfig, stockFaces: [] },
    }),
    seccion: MATERIAL_STOCK,
    etiqueta: TITULO_SOBREMEDIDAS,
    esperado: NO_DISPONIBLE,
  },
  {
    nombre: "sin Setup → bruto no disponible (nunca relleno con 0)",
    cambio: () => ({ setup: null }),
    seccion: MATERIAL_STOCK,
    etiqueta: ETIQUETA_BRUTO,
    esperado: NO_DISPONIBLE,
  },
  {
    nombre: "sin máquina → no disponible",
    cambio: () => ({ maquina: null }),
    seccion: MAQUINA_CNC,
    etiqueta: "Máquina",
    esperado: NO_DISPONIBLE,
  },
  {
    nombre: "máquina sin husillo máximo → no disponible",
    cambio: () => ({ maquina: { ...MAQUINA, rpm_max_husillo: null as any } }),
    seccion: MAQUINA_CNC,
    etiqueta: "Husillo máximo",
    esperado: NO_DISPONIBLE,
  },
  {
    nombre: "sin sujeción → utillaje no declarado",
    cambio: () => ({ montajeConfig: { ...MONTAJE, sujecion_config: null } }),
    seccion: MONTAJE_SUJECION,
    etiqueta: "Utillaje",
    esperado: NO_DECLARADO,
  },
  {
    nombre: "sin sujeción → cota inferior no declarada",
    cambio: () => ({ montajeConfig: { ...MONTAJE, sujecion_config: null } }),
    seccion: MONTAJE_SUJECION,
    etiqueta: "Mesa → cara inferior de la pieza",
    esperado: NO_DECLARADO,
  },
  {
    nombre: "cota superior sin medir → no declarado",
    cambio: () => ({
      montajeConfig: {
        ...MONTAJE,
        sujecion_config: {
          ...MONTAJE.sujecion_config!,
          envolvente: { ...ENVOLVENTE, part_top_z_mm: null },
        },
      },
    }),
    seccion: MONTAJE_SUJECION,
    etiqueta: "Mesa → cara superior de la pieza",
    esperado: NO_DECLARADO,
  },
  {
    nombre: "altura del amarre sin medir → no declarado",
    cambio: () => ({
      montajeConfig: {
        ...MONTAJE,
        sujecion_config: {
          ...MONTAJE.sujecion_config!,
          envolvente: { ...ENVOLVENTE, fixture_top_z_mm: null },
        },
      },
    }),
    seccion: MONTAJE_SUJECION,
    etiqueta: "Mesa → punto más alto del amarre",
    esperado: NO_DECLARADO,
  },
  {
    nombre: "sin notas → no declarado",
    cambio: () => ({ montajeConfig: { ...MONTAJE, notas: "" } }),
    seccion: MONTAJE_SUJECION,
    etiqueta: "Notas de montaje",
    esperado: NO_DECLARADO,
  },
  {
    nombre: "Z0 sin elegir → no declarado",
    cambio: () => ({ datumConfig: {} }),
    seccion: CERO,
    etiqueta: "Punto del cero (Z0)",
    esperado: NO_DECLARADO,
  },
];

describe("StepResumen — cada dato que falta se dice, nunca queda en blanco", () => {
  it.each(CASOS_FALTANTES)("$nombre", ({ cambio, seccion, etiqueta, esperado }) => {
    useCamStore.setState(cambio());
    render(<StepResumen />);
    expect(valorDe(seccion, etiqueta)).toBe(esperado);
  });

  it("Z0 declarado sin punto dibujable: muestra el origen que viaja, no 'no declarado'", () => {
    useCamStore.setState({
      orientacionSellada: {
        ...ORIENTACION,
        mesh_data: { ...ORIENTACION.mesh_data, bounding_box: undefined },
      } as any,
      meshData: null,
    });
    render(<StepResumen />);
    expect(valorDe(CERO, "Punto del cero (Z0)")).toBe("esquina_sup_izq");
  });
});

// ── Operaciones ────────────────────────────────────────────────────────────

describe("StepResumen — operaciones seleccionadas", () => {
  it("varias operaciones: en el orden del análisis, con estrategia, herramienta del MDE y setup", () => {
    useCamStore.getState().setOperacionesSeleccionadas(["op_2", "op_0", "op_1"]);
    render(<StepResumen />);

    const filas = operacionesEnPantalla();
    expect(filas).toHaveLength(3);
    expect(celdaOperacion(filas[0], "Operación").textContent).toContain("Planeado cara superior");
    expect(celdaOperacion(filas[1], "Operación").textContent).toContain("Taladrado Ø6.8");
    expect(celdaOperacion(filas[2], "Operación").textContent).toContain("Cajera inferior");

    expect(herramientaDe(filas[0])).toBe("Fresa planeadora Ø50 mm");
    expect(herramientaDe(filas[1])).toBe("Broca Ø6.8 mm");
    expect(herramientaDe(filas[2])).toBe("Fresa plana Ø10 mm");

    expect(within(filas[0]).getByText("Setup 1")).toBeTruthy();
    expect(within(filas[1]).getByText("Setup 1")).toBeTruthy();
    expect(within(filas[2]).getByText("Setup 2")).toBeTruthy();

    const region = screen.getByRole("region", { name: TITULO_OPERACIONES });
    expect(within(region).getByText("3 de 3")).toBeTruthy();
  });

  it("herramienta elegida por el operario: se muestra con el aviso de que hoy no se envía al motor", () => {
    useCamStore.getState().setOperacionesSeleccionadas(["op_0", "op_1", "op_2"]);
    useCamStore.getState().asignarHerramienta("op_2", 41);
    render(<StepResumen />);

    const filas = operacionesEnPantalla();
    expect(campoOperacion(filas[2], "Elegida por el operario")).toBe(
      "Herramienta del inventario #41",
    );
    expect(within(filas[2]).getByText(AVISO_ELECCION_NO_SE_ENVIA)).toBeTruthy();
    // La recomendación del MDE sigue a la vista, sin sustituirse.
    expect(herramientaDe(filas[2])).toBe("Fresa plana Ø10 mm");

    // Sin elección del operario: ni la fila ni el aviso.
    for (const fila of [filas[0], filas[1]]) {
      expect(within(fila).queryByText("Elegida por el operario")).toBeNull();
      expect(within(fila).queryByText(AVISO_ELECCION_NO_SE_ENVIA)).toBeNull();
    }
  });

  it("las no seleccionadas no aparecen", () => {
    render(<StepResumen />);
    expect(operacionesEnPantalla()).toHaveLength(2);
    expect(screen.queryByText("Taladrado Ø6.8")).toBeNull();
    const region = screen.getByRole("region", { name: TITULO_OPERACIONES });
    expect(within(region).getByText("2 de 3")).toBeTruthy();
  });

  it("sin análisis del MDE: herramienta no disponible y aviso visible", () => {
    useCamStore.setState({ mdeRecomendaciones: null });
    render(<StepResumen />);
    for (const fila of operacionesEnPantalla()) {
      expect(herramientaDe(fila)).toBe(NO_DISPONIBLE);
    }
    expect(screen.getByRole("status").textContent).toContain("Sin análisis del MDE");
  });

  it("MDE no disponible: muestra el motivo del motor", () => {
    useCamStore.setState({
      mdeRecomendaciones: [{ setup: "OP10", status: "mde_unavailable", reason: "motor_timeout" }],
    });
    render(<StepResumen />);
    expect(screen.getByRole("status").textContent).toBe(
      "El motor no pudo consultar al MDE: motor_timeout",
    );
    expect(herramientaDe(operacionesEnPantalla()[0])).toBe(NO_DISPONIBLE);
  });

  it("el MDE no encontró herramienta en el taller: se dice con la familia que pidió", () => {
    useCamStore.setState({
      mdeRecomendaciones: [
        {
          setup: "OP10",
          status: "ok",
          recommendations: [
            recomendacion("planeado", [
              {
                rule_id: "R10",
                code: "ideal_tool_not_available",
                data: { ideal_tool_types: ["fresa_planeado"] },
                conclusion: {},
                based_on: [],
              },
            ]),
          ],
        },
      ],
    });
    render(<StepResumen />);
    expect(herramientaDe(operacionesEnPantalla()[0])).toBe(
      "Sin herramienta en el taller (Fresa planeadora)",
    );
  });

  it("ninguna operación seleccionada: se dice, sin tabla vacía", () => {
    useCamStore.setState({ operacionesSeleccionadas: [] });
    render(<StepResumen />);
    expect(screen.getByText("Ninguna operación seleccionada.")).toBeTruthy();
    expect(screen.queryByRole("table", { name: TITULO_OPERACIONES })).toBeNull();
  });
});

// ── La hoja no muestra nada de la respuesta de generación ──────────────────

// Forma del 200 de /cam/generate (anexo §1), con valores reconocibles. Ninguno
// debe aparecer en la hoja: es el paso de resultado quien los muestra.
const RESPUESTA_GENERATE = {
  exito: true,
  id_job: 42,
  parametros_corte: { rpm: 9991, feed_mm_min: 8881 },
  plan_mecanizado: { pasadas_desbaste: 7771 },
  setups: [
    {
      nombre: "OP10",
      exito: true,
      gcode: "G0 X0 Y0",
      ops: ["op_0"],
      errores: ["error-de-setup-6661"],
      advertencias: ["advertencia-5551"],
      parametros_corte: {
        por_herramienta: [
          { tipo: "fresa_plana", diametro_mm: 10, rpm_final: 3217, avance_final: 643 },
        ],
      },
      plan_mecanizado: { remocion_stock: { x: { total_mm: 4441 } } },
    },
  ],
  mde_recommendations: [],
  advertencias_maquina: ["maquina-3331"],
};

describe("StepResumen — sin datos de la respuesta de generación", () => {
  it("con una respuesta de generación en el store, la hoja es idéntica y no muestra ningún valor suyo", () => {
    const { container, unmount } = render(<StepResumen />);
    const hojaSinRespuesta = container.textContent;
    unmount();

    useCamStore.setState({ engineResponse: RESPUESTA_GENERATE as any });
    const { container: conRespuesta } = render(<StepResumen />);

    expect(conRespuesta.textContent).toBe(hojaSinRespuesta);
    expect(document.body.textContent).not.toMatch(
      /9991|8881|7771|3217|643|6661|5551|4441|3331|G0 X0 Y0/,
    );
    // Cinco secciones de la hoja + la de operaciones.
    expect(screen.getAllByRole("region")).toHaveLength(6);
  });
});
