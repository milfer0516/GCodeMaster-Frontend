// src/modules/utillajes/components/SeccionUtillajes.test.tsx
// La sección Utillajes del inventario: estado vacío con DOS botones que abren
// el RegistroUtillaje compartido en la vía correspondiente, y lista del parque
// agrupada por familia cuando hay datos. Todo mockeado en la capa de servicio.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../cam/services/utillajesService", () => ({
  getUtillajes: vi.fn(),
  getFamiliasUtillaje: vi.fn(),
  getFamiliaSchema: vi.fn(),
  getCatalogoGlobal: vi.fn(),
  crearUtillajeManual: vi.fn(),
  crearUtillajeDesdePlantilla: vi.fn(),
}));

import {
  getUtillajes,
  getFamiliasUtillaje,
  getCatalogoGlobal,
  crearUtillajeDesdePlantilla,
} from "../../cam/services/utillajesService";
import { SeccionUtillajes } from "./SeccionUtillajes";

const getUtillajesMock = vi.mocked(getUtillajes);
const getFamiliasUtillajeMock = vi.mocked(getFamiliasUtillaje);
const getCatalogoGlobalMock = vi.mocked(getCatalogoGlobal);
const crearDesdePlantillaMock = vi.mocked(crearUtillajeDesdePlantilla);

const PLANTILLA = {
  id_utillaje_global: 42,
  familia: "copa",
  nombre: "Copa Ø160 DIN 6350",
  norma: "DIN 6350",
  parametros: { diametro_cuerpo_mm: 160 },
  advertencias: [],
  descripcion: null,
};

const NUEVO = {
  id_utillaje: 9,
  id_utillaje_global: 42,
  nombre: "Copa Ø160 DIN 6350",
  familia: "copa",
  parametros: { diametro_cuerpo_mm: 160 },
  notas: null,
  fecha_registro: "2026-09-18T00:00:00",
  activo: true,
};

describe("SeccionUtillajes — estado vacío del diseño", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFamiliasUtillajeMock.mockResolvedValue([
      { familia: "copa", etiqueta: "Copa / plato de garras", descripcion: "" },
    ]);
    getCatalogoGlobalMock.mockResolvedValue({
      total: 7,
      catalogo: [PLANTILLA],
      advertencia_general: "Medidas de referencia de norma.",
    });
    crearDesdePlantillaMock.mockResolvedValue({
      mensaje: "Utillaje copiado desde plantilla global",
      id_utillaje: 9,
      nombre: "Copa Ø160 DIN 6350",
      familia: "copa",
    });
  });

  it("muestra la tarjeta con los DOS botones y la nota del catálogo", async () => {
    getUtillajesMock.mockResolvedValue([]);
    render(<SeccionUtillajes />);

    expect(
      await screen.findByText("Aún no hay utillajes en el parque"),
    ).toBeTruthy();
    expect(screen.getByText("Usar plantilla")).toBeTruthy();
    expect(screen.getByText("Medidas del taller")).toBeTruthy();
    expect(
      await screen.findByText("7 plantillas listas en el catálogo"),
    ).toBeTruthy();
  });

  it("'Usar plantilla' abre RegistroUtillaje en vía plantilla y, al registrar, refresca el parque", async () => {
    getUtillajesMock.mockResolvedValueOnce([]).mockResolvedValue([NUEVO]);
    render(<SeccionUtillajes />);

    fireEvent.click(await screen.findByText("Usar plantilla"));

    // Se abre en la vía plantilla: paso 1 (familias del catálogo) ya visible.
    // Paso 1 → paso 2 → plantilla → registrar
    fireEvent.click(await screen.findByText("Copa / plato de garras"));
    fireEvent.click(await screen.findByText("Copa Ø160 DIN 6350"));
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar utillaje" }),
    );

    await waitFor(() =>
      expect(crearDesdePlantillaMock).toHaveBeenCalledTimes(1),
    );
    expect(crearDesdePlantillaMock.mock.calls[0][0]).toEqual({
      id_utillaje_global: 42,
      nombre: "Copa Ø160 DIN 6350",
    });

    // El parque se recarga y la fila nueva aparece en su acordeón
    await waitFor(() => expect(getUtillajesMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("UT-9")).toBeTruthy();
    expect(screen.getByText("Copa / plato de garras")).toBeTruthy();
    expect(
      screen.queryByText("Aún no hay utillajes en el parque"),
    ).toBeNull();
  });

  it("'Medidas del taller' abre RegistroUtillaje en vía manual", async () => {
    getUtillajesMock.mockResolvedValue([]);
    render(<SeccionUtillajes />);

    fireEvent.click(await screen.findByText("Medidas del taller"));

    // Vía manual activa: aparece el selector de familia
    expect(await screen.findByLabelText("Familia del utillaje")).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: /Manual \(medidas del taller\)/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
});

describe("SeccionUtillajes — parque con datos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFamiliasUtillajeMock.mockResolvedValue([
      { familia: "copa", etiqueta: "Copa / plato de garras", descripcion: "" },
      { familia: "prensa", etiqueta: "Prensa / mordaza de maquina", descripcion: "" },
    ]);
    getCatalogoGlobalMock.mockResolvedValue({
      total: 7,
      catalogo: [PLANTILLA],
      advertencia_general: "",
    });
    getUtillajesMock.mockResolvedValue([
      NUEVO,
      { ...NUEVO, id_utillaje: 10, nombre: "Prensa 125", familia: "prensa", parametros: { ancho_mordazas_mm: 125 } },
    ]);
  });

  it("agrupa por familia en acordeones genéricos y filtra con la búsqueda", async () => {
    render(<SeccionUtillajes />);

    expect(await screen.findByText("Copa / plato de garras")).toBeTruthy();
    expect(screen.getByText("Prensa / mordaza de maquina")).toBeTruthy();
    expect(screen.getByText("Copa Ø160 DIN 6350")).toBeTruthy();
    expect(screen.getByText("Prensa 125")).toBeTruthy();

    fireEvent.change(
      screen.getByPlaceholderText("Buscar utillaje o referencia"),
      { target: { value: "prensa" } },
    );
    expect(screen.queryByText("Copa Ø160 DIN 6350")).toBeNull();
    expect(screen.getByText("Prensa 125")).toBeTruthy();
  });
});
