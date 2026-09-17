// src/modules/cam/components/sujecion/PasoConfigElemento.test.tsx
// El formulario del montaje se pinta DESDE el schema de la familia (mockeado
// aquí, sin red ni backend) y el payload sale en la forma del contrato:
// posiciones dentro de parametros_montaje con claves x_mm/y_mm.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { FamiliaSchema, UtillajeResumen } from "../../services/utillajesService";
import type { Maquina } from "../../../../services/maquinasService";
import type { SujecionConfig } from "../../store/camStore";

// Mock de la capa API: el schema llega "del backend" sin tocar la red.
vi.mock("../../services/utillajesService", () => ({
  getFamiliaSchema: vi.fn(),
}));

import { getFamiliaSchema } from "../../services/utillajesService";
import { PasoConfigElemento } from "./PasoConfigElemento";

const getFamiliaSchemaMock = vi.mocked(getFamiliaSchema);

const COTAS = [
  {
    nombre: "part_bottom_z_mm",
    etiqueta: "Altura de la cara INFERIOR de la pieza",
    tipo: "numero",
    unidad: "mm",
    obligatorio: true,
    minimo: 0,
    medida_desde: "mesa_a_cara_inferior_pieza",
  },
  {
    nombre: "part_top_z_mm",
    etiqueta: "Altura de la cara SUPERIOR de la pieza",
    tipo: "numero",
    unidad: "mm",
    obligatorio: true,
    minimo: 0,
    medida_desde: "mesa_a_cara_superior_pieza",
  },
  {
    nombre: "fixture_top_z_mm",
    etiqueta: "Altura del punto MAS ALTO del amarre",
    tipo: "numero",
    unidad: "mm",
    obligatorio: true,
    minimo: 0,
    medida_desde: "mesa_a_punto_mas_alto_amarre",
  },
] as const;

const SCHEMA_BRIDAS: FamiliaSchema = {
  familia: "bridas",
  etiqueta: "Bridas / estribos",
  descripcion: "Bridas atornilladas a las ranuras de la mesa.",
  advertencias: [],
  campos_utillaje: [],
  campos_montaje: [
    ...COTAS,
    {
      nombre: "posiciones",
      etiqueta: "Posiciones de las bridas sobre la mesa",
      tipo: "puntos_xy",
      unidad: "mm",
      obligatorio: true,
      ayuda: "Un punto {x_mm, y_mm} por cada brida.",
    },
  ],
};

const UTILLAJE: UtillajeResumen = {
  id_utillaje: 7,
  id_utillaje_global: null,
  nombre: "Juego bridas M12",
  familia: "bridas",
  parametros: {},
  notas: null,
  fecha_registro: "2026-09-15T00:00:00",
  activo: true,
};

const MAQUINA = {
  diametro_herramienta_max_mm: 80,
  largo_herramienta_max_mm: 300,
  recorrido_z_mm: 500,
} as unknown as Maquina;

const DIMENSIONES = { x: 100, y: 80, z: 40 };

function renderForm(onConfirm: (c: Partial<SujecionConfig>) => void) {
  return render(
    <PasoConfigElemento
      utillaje={UTILLAJE}
      dimensiones={DIMENSIONES}
      maquina={MAQUINA}
      onBack={() => {}}
      onConfirm={onConfirm}
    />,
  );
}

function llenarCotas() {
  fireEvent.change(
    screen.getByLabelText(/cara INFERIOR de la pieza/),
    { target: { value: "78" } },
  );
  fireEvent.change(
    screen.getByLabelText(/cara SUPERIOR de la pieza/),
    { target: { value: "122" } },
  );
  fireEvent.change(
    screen.getByLabelText(/punto MAS ALTO del amarre/),
    { target: { value: "104" } },
  );
}

describe("PasoConfigElemento — formulario desde el schema del backend", () => {
  beforeEach(() => {
    getFamiliaSchemaMock.mockReset();
  });

  it("pinta los campos del schema mockeado (ninguno hardcodeado) y pide el schema de la familia del utillaje", async () => {
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_BRIDAS);
    renderForm(() => {});

    expect(
      await screen.findByLabelText(/cara INFERIOR de la pieza/),
    ).toBeTruthy();
    expect(screen.getByLabelText(/cara SUPERIOR de la pieza/)).toBeTruthy();
    expect(screen.getByLabelText(/punto MAS ALTO del amarre/)).toBeTruthy();
    expect(
      screen.getByText("Posiciones de las bridas sobre la mesa (mm)"),
    ).toBeTruthy();
    expect(getFamiliaSchemaMock).toHaveBeenCalledWith("bridas");
  });

  it("bloquea Continuar hasta completar los obligatorios", async () => {
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_BRIDAS);
    renderForm(() => {});

    const boton = (await screen.findByText("Continuar")).closest("button")!;
    expect(boton.disabled).toBe(true);

    llenarCotas();
    fireEvent.click(screen.getByText("Añadir punto"));
    fireEvent.change(
      screen.getByLabelText(/punto 1 x_mm/), { target: { value: "10" } });
    fireEvent.change(
      screen.getByLabelText(/punto 1 y_mm/), { target: { value: "20" } });

    await waitFor(() => expect(boton.disabled).toBe(false));
  });

  it("construye el payload del contrato: posiciones en parametros_montaje con x_mm/y_mm, cotas en envolvente", async () => {
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_BRIDAS);
    const onConfirm = vi.fn();
    renderForm(onConfirm);

    await screen.findByLabelText(/cara INFERIOR de la pieza/);
    llenarCotas();

    // Dos puntos declarados a mano
    fireEvent.click(screen.getByText("Añadir punto"));
    fireEvent.click(screen.getByText("Añadir punto"));
    fireEvent.change(screen.getByLabelText(/punto 1 x_mm/), {
      target: { value: "-60" },
    });
    fireEvent.change(screen.getByLabelText(/punto 1 y_mm/), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/punto 2 x_mm/), {
      target: { value: "60" },
    });
    fireEvent.change(screen.getByLabelText(/punto 2 y_mm/), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByText("Continuar"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const config = onConfirm.mock.calls[0][0];

    expect(config.familia).toBe("bridas");
    expect(config.id_utillaje).toBe(7);
    expect(config.envolvente).toEqual({
      part_bottom_z_mm: 78,
      part_top_z_mm: 122,
      fixture_top_z_mm: 104,
    });
    expect(config.parametros_montaje).toEqual({
      posiciones: [
        { x_mm: -60, y_mm: 0 },
        { x_mm: 60, y_mm: 0 },
      ],
    });
    // La trampa legacy no existe en el payload
    expect(config.parametros_montaje).not.toHaveProperty("posiciones_bridas");
    expect(JSON.stringify(config)).not.toContain("posiciones_bridas");
  });

  it("reparte puntos alrededor de la pieza con claves x_mm/y_mm", async () => {
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_BRIDAS);
    const onConfirm = vi.fn();
    renderForm(onConfirm);

    await screen.findByLabelText(/cara INFERIOR de la pieza/);
    llenarCotas();
    fireEvent.click(screen.getByText(/Repartir 4 alrededor de la pieza/));
    fireEvent.click(screen.getByText("Continuar"));

    const config = onConfirm.mock.calls[0][0];
    const posiciones = config.parametros_montaje!.posiciones as Array<{
      x_mm: number;
      y_mm: number;
    }>;
    expect(posiciones).toHaveLength(4);
    // holgura = ceil(80/2)+5 = 45 → esquinas a ±(50+45), ±(40+45)
    expect(posiciones[0]).toEqual({ x_mm: 95, y_mm: 85 });
  });

  it("ESCALABILIDAD: una familia nueva del backend se pinta y se envía sin tocar el frontend", async () => {
    // Familia que NO existe hoy en el frontend: solo llega su schema.
    const SCHEMA_NUEVO: FamiliaSchema = {
      familia: "placa_sacrificio",
      etiqueta: "Placa de sacrificio",
      descripcion: "Placa bajo la pieza.",
      advertencias: [],
      campos_utillaje: [],
      campos_montaje: [
        ...COTAS,
        {
          nombre: "espesor_placa_mm",
          etiqueta: "Espesor de la placa",
          tipo: "numero",
          unidad: "mm",
          obligatorio: true,
          minimo: 0,
        },
        {
          nombre: "fijacion",
          etiqueta: "Fijación de la placa",
          tipo: "opcion",
          unidad: null,
          obligatorio: true,
          opciones: ["ranuras", "pegado"],
        },
      ],
    };
    getFamiliaSchemaMock.mockResolvedValue(SCHEMA_NUEVO);
    const onConfirm = vi.fn();
    render(
      <PasoConfigElemento
        utillaje={{ ...UTILLAJE, familia: "placa_sacrificio" }}
        dimensiones={DIMENSIONES}
        maquina={MAQUINA}
        onBack={() => {}}
        onConfirm={onConfirm}
      />,
    );

    // El campo nuevo aparece solo, sin cambio de frontend
    const espesor = await screen.findByLabelText(/Espesor de la placa/);
    llenarCotas();
    fireEvent.change(espesor, { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText(/Fijación de la placa/), {
      target: { value: "ranuras" },
    });
    fireEvent.click(screen.getByText("Continuar"));

    const config = onConfirm.mock.calls[0][0];
    expect(config.familia).toBe("placa_sacrificio");
    expect(config.parametros_montaje).toEqual({
      espesor_placa_mm: 12,
      fijacion: "ranuras",
    });
  });
});
