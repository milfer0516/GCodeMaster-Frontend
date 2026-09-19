// src/modules/utillajes/components/RegistroUtillaje.test.tsx
// El alta de utillajes, SIN red ni backend: se mockea la capa de servicio y se
// CAPTURA el cuerpo exacto que sale en cada POST para compararlo con el
// contrato trazado del código del backend:
//   POST /utillajes/manual          ← UtillajeCrearManual
//                                     (utillaje_schema.py:110-120)
//   POST /utillajes/desde-plantilla ← UtillajeCrearDesdePlantilla
//                                     (utillaje_schema.py:123-135)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type {
  CatalogoGlobal,
  FamiliaSchema,
} from "../../cam/services/utillajesService";

// Mock de la capa API: los schemas/plantillas llegan "del backend" sin red.
vi.mock("../../cam/services/utillajesService", () => ({
  getCatalogoGlobal: vi.fn(),
  getFamiliasUtillaje: vi.fn(),
  getFamiliaSchema: vi.fn(),
  crearUtillajeManual: vi.fn(),
  crearUtillajeDesdePlantilla: vi.fn(),
}));

import {
  getCatalogoGlobal,
  getFamiliasUtillaje,
  getFamiliaSchema,
  crearUtillajeManual,
  crearUtillajeDesdePlantilla,
} from "../../cam/services/utillajesService";
import { RegistroUtillaje } from "./RegistroUtillaje";

const getCatalogoGlobalMock = vi.mocked(getCatalogoGlobal);
const getFamiliasUtillajeMock = vi.mocked(getFamiliasUtillaje);
const getFamiliaSchemaMock = vi.mocked(getFamiliaSchema);
const crearManualMock = vi.mocked(crearUtillajeManual);
const crearDesdePlantillaMock = vi.mocked(crearUtillajeDesdePlantilla);

// Schema de familia estilo "prensa": solo campos numero en campos_utillaje.
const SCHEMA_PRENSA: FamiliaSchema = {
  familia: "prensa",
  etiqueta: "Prensa / mordaza de maquina",
  descripcion: "Prensa atornillada a la mesa.",
  advertencias: [],
  campos_montaje: [],
  campos_utillaje: [
    {
      nombre: "ancho_mordazas_mm",
      etiqueta: "Ancho de las mordazas",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
    },
    {
      nombre: "altura_mordazas_mm",
      etiqueta: "Altura de las mordazas",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
    },
    {
      nombre: "apertura_max_mm",
      etiqueta: "Apertura maxima",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
    },
    {
      nombre: "altura_bancada_mm",
      etiqueta: "Altura de la bancada sobre la mesa",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
    },
  ],
};

// Familia que el frontend NO conoce, con visible_si y opcion_multiple: prueba
// que el formulario sale entero del schema, sin nada hardcodeado.
const SCHEMA_GENERICO: FamiliaSchema = {
  familia: "generico",
  etiqueta: "Otro (utillaje a medida)",
  descripcion: "Utillaje hecho en casa.",
  advertencias: [],
  campos_montaje: [],
  campos_utillaje: [
    {
      nombre: "forma",
      etiqueta: "Forma de la envolvente",
      tipo: "opcion",
      unidad: null,
      obligatorio: true,
      opciones: ["caja", "cilindro"],
    },
    {
      nombre: "largo_mm",
      etiqueta: "Largo (X)",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
      visible_si: { campo: "forma", igual_a: "caja" },
    },
    {
      nombre: "ancho_mm",
      etiqueta: "Ancho (Y)",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
      visible_si: { campo: "forma", igual_a: "caja" },
    },
    {
      nombre: "diametro_mm",
      etiqueta: "Diametro",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
      visible_si: { campo: "forma", igual_a: "cilindro" },
    },
    {
      nombre: "altura_mm",
      etiqueta: "Altura sobre la mesa",
      tipo: "numero",
      unidad: "mm",
      obligatorio: true,
      minimo: 0,
    },
    {
      nombre: "bloquea",
      etiqueta: "Direcciones que bloquea",
      tipo: "opcion_multiple",
      unidad: null,
      obligatorio: true,
      opciones: ["axial", "radial"],
    },
  ],
};

const CATALOGO: CatalogoGlobal = {
  total: 2,
  catalogo: [
    {
      id_utillaje_global: 42,
      familia: "copa",
      nombre: "Copa Ø160 DIN 6350",
      norma: "DIN 6350",
      parametros: {
        diametro_cuerpo_mm: 160,
        altura_cuerpo_mm: 60,
        altura_mordaza_mm: 20,
      },
      advertencias: ["Verifique las medidas contra su utillaje real."],
      descripcion: "Plato de 3 garras estándar.",
    },
    {
      id_utillaje_global: 43,
      familia: "prensa",
      nombre: "Prensa de precision 160",
      norma: null,
      parametros: {},
      advertencias: [],
      descripcion: null,
    },
  ],
  advertencia_general:
    "Las medidas de una plantilla del catalogo global son de referencia de norma.",
};

// Catálogo con una familia que el frontend NO conoce ("torre") y sin etiqueta
// en /utillajes/familias: prueba que el paso 1 se DERIVA del catálogo, nada
// hardcodeado.
const CATALOGO_EXTRA: CatalogoGlobal = {
  total: 4,
  catalogo: [
    ...CATALOGO.catalogo,
    {
      id_utillaje_global: 44,
      familia: "copa",
      nombre: "Copa Ø200 DIN 6350",
      norma: "DIN 6350",
      parametros: {},
      advertencias: [],
      descripcion: null,
    },
    {
      id_utillaje_global: 45,
      familia: "torre",
      nombre: "Torre de amarre 400",
      norma: null,
      parametros: {},
      advertencias: [],
      descripcion: null,
    },
  ],
  advertencia_general: "",
};

// Catálogo con MUCHAS plantillas en una sola familia: la lista expandida es
// más alta que el modal. Prueba el scroll del paso 2 y que el botón de
// registro sigue al alcance.
const CATALOGO_LARGO: CatalogoGlobal = {
  total: 12,
  catalogo: Array.from({ length: 12 }, (_, i) => ({
    id_utillaje_global: 100 + i,
    familia: "copa",
    nombre: `Copa ${i + 1} del lote grande`,
    norma: "DIN 6350",
    parametros: {},
    advertencias: [],
    descripcion: `Descripcion de la copa ${i + 1}.`,
  })),
  advertencia_general: "",
};

const FAMILIAS_MOCK = [
  { familia: "copa", etiqueta: "Copa / plato de garras", descripcion: "" },
  {
    familia: "prensa",
    etiqueta: "Prensa / mordaza de maquina",
    descripcion: "",
  },
];

async function irAModoManual() {
  fireEvent.click(
    screen.getByRole("tab", { name: /Manual \(medidas del taller\)/ }),
  );
  await screen.findByLabelText("Familia del utillaje");
}

describe("RegistroUtillaje — vía USAR PLANTILLA (dos pasos)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFamiliasUtillajeMock.mockResolvedValue(FAMILIAS_MOCK);
  });

  it("la pestaña se llama 'Usar plantilla'", async () => {
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO);
    render(<RegistroUtillaje />);
    expect(
      screen.getByRole("tab", { name: /Usar plantilla/ }),
    ).toBeTruthy();
    await screen.findByText("Copa / plato de garras");
  });

  it("PASO 1: muestra SOLO las familias presentes en el catálogo, con etiqueta del backend y conteo derivado", async () => {
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO_EXTRA);
    render(<RegistroUtillaje />);

    // Familias DERIVADAS del catálogo agrupado por `familia`: copa (2
    // plantillas), prensa (1), y la desconocida "torre" (1) — aparece sola,
    // con su clave al no tener etiqueta en /utillajes/familias.
    expect(await screen.findByText("Copa / plato de garras")).toBeTruthy();
    expect(screen.getByText("Prensa / mordaza de maquina")).toBeTruthy();
    expect(screen.getByText("torre")).toBeTruthy();
    expect(screen.getByText("2 plantillas")).toBeTruthy();
    expect(screen.getAllByText("1 plantilla")).toHaveLength(2);

    // El paso 1 NO muestra la lista plana de plantillas…
    expect(screen.queryByText("Copa Ø160 DIN 6350")).toBeNull();
    expect(screen.queryByText("Prensa de precision 160")).toBeNull();
    // …ni familias que no estén en el catálogo (nada hardcodeado).
    expect(screen.queryByText(/Bridas/)).toBeNull();
    expect(screen.queryByText(/Mesa magn/)).toBeNull();
  });

  it("PASO 2: al elegir familia muestra SOLO sus plantillas, y 'Cambiar familia' vuelve al paso 1", async () => {
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO_EXTRA);
    render(<RegistroUtillaje />);

    fireEvent.click(await screen.findByText("Copa / plato de garras"));

    // Solo las copas, no la prensa ni la torre
    expect(await screen.findByText("Copa Ø160 DIN 6350")).toBeTruthy();
    expect(screen.getByText("Copa Ø200 DIN 6350")).toBeTruthy();
    expect(screen.queryByText("Prensa de precision 160")).toBeNull();
    expect(screen.queryByText("Torre de amarre 400")).toBeNull();

    // Vuelta atrás → paso 1 otra vez
    fireEvent.click(screen.getByText(/Cambiar familia/));
    expect(await screen.findByText("Prensa / mordaza de maquina")).toBeTruthy();
    expect(screen.getByText("torre")).toBeTruthy();
    expect(screen.queryByText("Copa Ø160 DIN 6350")).toBeNull();
  });

  it("la plantilla elegida SOBREVIVE a plegar la lista y a cambiar de familia", async () => {
    // El bug: volver al paso 1 borraba la seleccion y dejaba "Registrar
    // utillaje" deshabilitado, sin forma de saber por que.
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO_EXTRA);
    render(<RegistroUtillaje />);

    fireEvent.click(await screen.findByText("Copa / plato de garras"));
    fireEvent.click(await screen.findByText("Copa Ø160 DIN 6350"));

    const boton = () =>
      screen.getByText("Registrar utillaje").closest("button")!;
    expect(boton().disabled).toBe(false);

    // Plegar la lista (volver al paso 1): la seleccion sigue ahi y a la vista.
    fireEvent.click(screen.getByText(/Cambiar familia/));
    expect(await screen.findByText("Plantilla seleccionada")).toBeTruthy();
    expect(boton().disabled).toBe(false);

    // Entrar a OTRA familia solo a mirar tampoco la deshace.
    fireEvent.click(screen.getByText("Prensa / mordaza de maquina"));
    expect(screen.getByText("Plantilla seleccionada")).toBeTruthy();
    expect(boton().disabled).toBe(false);

    // "Quitar" es la unica via para deshacerla, y entonces si se deshabilita.
    fireEvent.click(screen.getByText("Quitar"));
    expect(screen.queryByText("Plantilla seleccionada")).toBeNull();
    expect(boton().disabled).toBe(true);
  });

  it("SCROLL: con la lista larga expandida, la lista se desplaza en su caja y el botón queda en una barra fija (sticky)", async () => {
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO_LARGO);
    render(<RegistroUtillaje />);

    fireEvent.click(await screen.findByText("Copa / plato de garras"));
    const ultima = await screen.findByText("Copa 12 del lote grande");

    // La lista del paso 2 tiene scroll PROPIO: overflow-y-auto + max-h.
    const lista = ultima.closest("button")!.parentElement!;
    expect(lista.className).toContain("overflow-y-auto");
    expect(lista.className).toMatch(/max-h-/);

    // La barra de acciones es sticky: el botón no se va con el scroll.
    const barra = screen.getByText("Registrar utillaje").closest("div")!;
    expect(barra.className).toContain("sticky");
    expect(barra.className).toContain("bottom-0");
  });

  it("las advertencias de medida se CIERRAN con su 'x' y el botón sigue clicable y registrando", async () => {
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO);
    crearDesdePlantillaMock.mockResolvedValue({
      mensaje: "ok",
      id_utillaje: 20,
      nombre: "Copa Ø160 DIN 6350",
      familia: "copa",
    });
    const onRegistrado = vi.fn();
    render(<RegistroUtillaje onRegistrado={onRegistrado} />);

    // Advertencia general del catálogo, visible al entrar.
    expect(await screen.findByText(/referencia de norma/)).toBeTruthy();

    // Al elegir la plantilla aparece SU advertencia de medidas.
    fireEvent.click(await screen.findByText("Copa / plato de garras"));
    fireEvent.click(await screen.findByText("Copa Ø160 DIN 6350"));
    expect(
      await screen.findByText(/Verifique las medidas contra su utillaje real/),
    ).toBeTruthy();

    // Las DOS advertencias se descartan con su "x"…
    const cierres = screen.getAllByRole("button", { name: "Cerrar aviso" });
    expect(cierres).toHaveLength(2);
    for (const c of cierres) fireEvent.click(c);

    // …y ya no ocupan sitio ni empujan el botón fuera de la vista.
    expect(screen.queryByText(/referencia de norma/)).toBeNull();
    expect(
      screen.queryByText(/Verifique las medidas contra su utillaje real/),
    ).toBeNull();

    // El botón sigue habilitado y dispara el registro con el MISMO contrato.
    const boton = screen.getByText("Registrar utillaje").closest("button")!;
    expect(boton.disabled).toBe(false);
    fireEvent.click(boton);
    await waitFor(() => expect(onRegistrado).toHaveBeenCalledTimes(1));
    expect(crearDesdePlantillaMock).toHaveBeenCalledWith({
      id_utillaje_global: 42,
      nombre: "Copa Ø160 DIN 6350",
    });
  });

  it("elige familia → plantilla y envía el cuerpo EXACTO del contrato (sin cambios)", async () => {
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO);
    crearDesdePlantillaMock.mockResolvedValue({
      mensaje: "Utillaje copiado desde plantilla global",
      id_utillaje: 9,
      nombre: "Mi copa del taller",
      familia: "copa",
    });
    const onRegistrado = vi.fn();
    render(<RegistroUtillaje onRegistrado={onRegistrado} />);

    // Advertencia general del contrato sigue visible en el paso 1
    expect(await screen.findByText(/referencia de norma/)).toBeTruthy();

    // Paso 1 → paso 2 → plantilla
    fireEvent.click(await screen.findByText("Copa / plato de garras"));
    fireEvent.click(await screen.findByText("Copa Ø160 DIN 6350"));
    fireEvent.change(screen.getByLabelText("Nombre en su parque"), {
      target: { value: "Mi copa del taller" },
    });

    fireEvent.click(screen.getByText("Registrar utillaje"));

    await waitFor(() => expect(onRegistrado).toHaveBeenCalledTimes(1));

    // CUERPO CAPTURADO — UtillajeCrearDesdePlantilla: id_utillaje_global +
    // nombre. SIN `parametros` (se copian los de la plantilla) y SIN `notas`
    // (vacías se omiten). Ninguna clave inventada.
    expect(crearDesdePlantillaMock).toHaveBeenCalledTimes(1);
    expect(crearDesdePlantillaMock.mock.calls[0][0]).toEqual({
      id_utillaje_global: 42,
      nombre: "Mi copa del taller",
    });
    expect(onRegistrado).toHaveBeenCalledWith({
      mensaje: "Utillaje copiado desde plantilla global",
      id_utillaje: 9,
      nombre: "Mi copa del taller",
      familia: "copa",
    });
  });

  it("omite `nombre` si se deja vacío (el backend usa el de la plantilla)", async () => {
    getCatalogoGlobalMock.mockResolvedValue(CATALOGO);
    crearDesdePlantillaMock.mockResolvedValue({
      mensaje: "ok",
      id_utillaje: 10,
      nombre: "Copa Ø160 DIN 6350",
      familia: "copa",
    });
    render(<RegistroUtillaje onRegistrado={() => {}} />);

    fireEvent.click(await screen.findByText("Copa / plato de garras"));
    fireEvent.click(await screen.findByText("Copa Ø160 DIN 6350"));
    fireEvent.change(screen.getByLabelText("Nombre en su parque"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText("Registrar utillaje"));

    await waitFor(() =>
      expect(crearDesdePlantillaMock).toHaveBeenCalledTimes(1),
    );
    expect(crearDesdePlantillaMock.mock.calls[0][0]).toEqual({
      id_utillaje_global: 42,
    });
  });
});

describe("RegistroUtillaje — vía MANUAL (schema-driven)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFamiliasUtillajeMock.mockResolvedValue([
      { familia: "prensa", etiqueta: "Prensa / mordaza de maquina", descripcion: "" },
      { familia: "generico", etiqueta: "Otro (utillaje a medida)", descripcion: "" },
    ]);
  });

  it("pinta los campos_utillaje del schema mockeado y envía el cuerpo EXACTO del contrato", async () => {
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_PRENSA);
    crearManualMock.mockResolvedValue({
      mensaje: "Utillaje registrado",
      id_utillaje: 11,
      nombre: "Prensa 160 mesa 2",
      familia: "prensa",
    });
    const onRegistrado = vi.fn();
    render(<RegistroUtillaje onRegistrado={onRegistrado} />);

    await irAModoManual();
    fireEvent.change(screen.getByLabelText("Familia del utillaje"), {
      target: { value: "prensa" },
    });

    // Los cuatro campos salen del schema, ninguno hardcodeado
    expect(await screen.findByLabelText(/Ancho de las mordazas/)).toBeTruthy();
    expect(screen.getByLabelText(/Altura de las mordazas/)).toBeTruthy();
    expect(screen.getByLabelText(/Apertura maxima/)).toBeTruthy();
    expect(
      screen.getByLabelText(/Altura de la bancada sobre la mesa/),
    ).toBeTruthy();
    expect(getFamiliaSchemaMock).toHaveBeenCalledWith("prensa");

    fireEvent.change(screen.getByLabelText("Nombre en su parque"), {
      target: { value: "Prensa 160 mesa 2" },
    });
    fireEvent.change(screen.getByLabelText(/Ancho de las mordazas/), {
      target: { value: "160" },
    });
    fireEvent.change(screen.getByLabelText(/Altura de las mordazas/), {
      target: { value: "55" },
    });
    fireEvent.change(screen.getByLabelText(/Apertura maxima/), {
      target: { value: "200" },
    });
    fireEvent.change(screen.getByLabelText(/Altura de la bancada/), {
      target: { value: "35" },
    });
    fireEvent.change(screen.getByLabelText(/Notas/), {
      target: { value: "Mesa 2" },
    });

    fireEvent.click(screen.getByText("Registrar utillaje"));

    await waitFor(() => expect(onRegistrado).toHaveBeenCalledTimes(1));

    // CUERPO CAPTURADO — UtillajeCrearManual: { nombre, familia, parametros,
    // notas }. Claves de parametros = nombre de cada campo del schema.
    expect(crearManualMock).toHaveBeenCalledTimes(1);
    expect(crearManualMock.mock.calls[0][0]).toEqual({
      nombre: "Prensa 160 mesa 2",
      familia: "prensa",
      parametros: {
        ancho_mordazas_mm: 160,
        altura_mordazas_mm: 55,
        apertura_max_mm: 200,
        altura_bancada_mm: 35,
      },
      notas: "Mesa 2",
    });
  });

  it("ESCALABILIDAD: una familia con visible_si y opcion_multiple se pinta y se envía sin tocar el frontend", async () => {
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_GENERICO);
    crearManualMock.mockResolvedValue({
      mensaje: "Utillaje registrado",
      id_utillaje: 12,
      nombre: "Tope casero",
      familia: "generico",
    });
    render(<RegistroUtillaje onRegistrado={() => {}} />);

    await irAModoManual();
    fireEvent.change(screen.getByLabelText("Familia del utillaje"), {
      target: { value: "generico" },
    });

    // visible_si: al elegir "cilindro", Largo/Ancho desaparecen y Diametro aparece
    fireEvent.change(await screen.findByLabelText(/Forma de la envolvente/), {
      target: { value: "cilindro" },
    });
    expect(screen.queryByLabelText(/Largo \(X\)/)).toBeNull();
    expect(screen.queryByLabelText(/Ancho \(Y\)/)).toBeNull();
    expect(screen.getByLabelText(/Diametro/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nombre en su parque"), {
      target: { value: "Tope casero" },
    });
    fireEvent.change(screen.getByLabelText(/Diametro/), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText(/Altura sobre la mesa/), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByRole("button", { name: "axial" }));

    fireEvent.click(screen.getByText("Registrar utillaje"));

    await waitFor(() => expect(crearManualMock).toHaveBeenCalledTimes(1));
    const body = crearManualMock.mock.calls[0][0];
    expect(body).toEqual({
      nombre: "Tope casero",
      familia: "generico",
      parametros: {
        forma: "cilindro",
        diametro_mm: 120,
        altura_mm: 40,
        bloquea: ["axial"],
      },
    });
    // Los campos no visibles NO viajan: enviarlos sería un 422 en el backend.
    expect(body.parametros).not.toHaveProperty("largo_mm");
    expect(body.parametros).not.toHaveProperty("ancho_mm");
  });

  it("pinta junto al campo el 422 estructurado del backend ({mensaje, errores:[{campo, motivo}]})", async () => {
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_PRENSA);
    crearManualMock.mockRejectedValue({
      response: {
        data: {
          detail: {
            mensaje:
              "Los parametros no cumplen el schema de la familia 'prensa'.",
            familia: "prensa",
            errores: [
              {
                campo: "ancho_mordazas_mm",
                motivo: "debe ser >= 0, llego -5.0",
              },
            ],
          },
        },
      },
    });
    render(<RegistroUtillaje onRegistrado={() => {}} />);

    await irAModoManual();
    fireEvent.change(screen.getByLabelText("Familia del utillaje"), {
      target: { value: "prensa" },
    });
    await screen.findByLabelText(/Ancho de las mordazas/);

    fireEvent.change(screen.getByLabelText("Nombre en su parque"), {
      target: { value: "Prensa mala" },
    });
    fireEvent.change(screen.getByLabelText(/Ancho de las mordazas/), {
      target: { value: "160" },
    });
    fireEvent.change(screen.getByLabelText(/Altura de las mordazas/), {
      target: { value: "55" },
    });
    fireEvent.change(screen.getByLabelText(/Apertura maxima/), {
      target: { value: "200" },
    });
    fireEvent.change(screen.getByLabelText(/Altura de la bancada/), {
      target: { value: "35" },
    });
    fireEvent.click(screen.getByText("Registrar utillaje"));

    expect(
      await screen.findByText(/no cumplen el schema de la familia 'prensa'/),
    ).toBeTruthy();
    expect(
      await screen.findByText("debe ser >= 0, llego -5.0"),
    ).toBeTruthy();
  });
});
