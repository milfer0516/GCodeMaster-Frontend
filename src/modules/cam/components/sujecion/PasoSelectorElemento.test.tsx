// src/modules/cam/components/sujecion/PasoSelectorElemento.test.tsx
// El aviso de PARQUE VACÍO del wizard: ofrece registrar un utillaje sin salir
// del wizard; al registrar con éxito el parque se RECARGA y el utillaje nuevo
// aparece en el selector — el paso de montaje queda desbloqueado.
// Todo mockeado en la capa de servicio: sin red, sin backend, sin DB.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { UtillajeResumen } from "../../services/utillajesService";

vi.mock("../../services/utillajesService", () => ({
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
} from "../../services/utillajesService";
import { PasoSelectorElemento } from "./PasoSelectorElemento";

const getUtillajesMock = vi.mocked(getUtillajes);
const getFamiliasUtillajeMock = vi.mocked(getFamiliasUtillaje);
const getCatalogoGlobalMock = vi.mocked(getCatalogoGlobal);
const crearDesdePlantillaMock = vi.mocked(crearUtillajeDesdePlantilla);

const NUEVO: UtillajeResumen = {
  id_utillaje: 9,
  id_utillaje_global: 42,
  nombre: "Copa Ø160 DIN 6350",
  familia: "copa",
  parametros: { diametro_cuerpo_mm: 160 },
  notas: null,
  fecha_registro: "2026-09-18T00:00:00",
  activo: true,
};

describe("PasoSelectorElemento — aviso de parque vacío del wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFamiliasUtillajeMock.mockResolvedValue([
      { familia: "copa", etiqueta: "Copa / plato de garras", descripcion: "" },
    ]);
    getCatalogoGlobalMock.mockResolvedValue({
      total: 1,
      catalogo: [
        {
          id_utillaje_global: 42,
          familia: "copa",
          nombre: "Copa Ø160 DIN 6350",
          norma: "DIN 6350",
          parametros: { diametro_cuerpo_mm: 160 },
          advertencias: [],
          descripcion: null,
        },
      ],
      advertencia_general: "Medidas de referencia de norma.",
    });
    crearDesdePlantillaMock.mockResolvedValue({
      mensaje: "Utillaje copiado desde plantilla global",
      id_utillaje: 9,
      nombre: "Copa Ø160 DIN 6350",
      familia: "copa",
    });
  });

  it("el botón del aviso monta RegistroUtillaje y, tras el éxito, el parque se refresca y el montaje se desbloquea", async () => {
    // 1ª carga: parque VACÍO. 2ª carga (tras registrar): ya hay un utillaje.
    getUtillajesMock.mockResolvedValueOnce([]).mockResolvedValue([NUEVO]);
    const onSelect = vi.fn();
    render(<PasoSelectorElemento onSelect={onSelect} />);

    // Aviso de parque vacío + botón para registrar en el acto
    expect(
      await screen.findByText(/No hay utillajes registrados en el parque/),
    ).toBeTruthy();
    fireEvent.click(screen.getByText("Registrar un utillaje"));

    // Se monta el componente compartido (vía plantilla por defecto):
    // paso 1 = familias del catálogo → paso 2 = plantillas de la familia
    fireEvent.click(await screen.findByText("Copa / plato de garras"));
    const plantilla = await screen.findByText("Copa Ø160 DIN 6350");
    fireEvent.click(plantilla);
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar utillaje" }),
    );

    // Cuerpo capturado del POST /utillajes/desde-plantilla
    await waitFor(() =>
      expect(crearDesdePlantillaMock).toHaveBeenCalledTimes(1),
    );
    expect(crearDesdePlantillaMock.mock.calls[0][0]).toEqual({
      id_utillaje_global: 42,
      nombre: "Copa Ø160 DIN 6350",
    });

    // El parque se RECARGA (2ª llamada a GET /utillajes/) y el aviso desaparece
    await waitFor(() => expect(getUtillajesMock).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByText(/No hay utillajes registrados en el parque/),
    ).toBeNull();

    // El utillaje nuevo aparece en el selector y ES SELECCIONABLE:
    // el paso de montaje continúa sin salir del wizard.
    const botonNuevo = (await screen.findAllByText("Copa Ø160 DIN 6350"))
      .map((el) => el.closest("button"))
      .find((b) => b !== null)!;
    fireEvent.click(botonNuevo);
    expect(onSelect).toHaveBeenCalledWith(NUEVO);
  });
});
