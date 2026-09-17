// src/modules/cam/domain/camposMontaje.test.ts
// El schema usado aquí imita la FORMA real de GET /utillajes/familias/{familia}
// (backend: app/schemas/utillaje_familias.py) — mockeado, sin red ni backend.
import { describe, it, expect } from "vitest";
import type { CampoSchema } from "../services/utillajesService";
import {
  camposIncompletos,
  camposVisibles,
  construirParametrosYEnvolvente,
  distribuirPuntosAlrededor,
  alturaTotalDeclarada,
} from "./camposMontaje";

// Las tres cotas medidas que toda familia lleva en campos_montaje (medida_desde).
const COTAS: CampoSchema[] = [
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
];

// Familia BRIDAS (forma real): las tres cotas + posiciones puntos_xy.
const BRIDAS: CampoSchema[] = [
  ...COTAS,
  {
    nombre: "posiciones",
    etiqueta: "Posiciones de las bridas sobre la mesa",
    tipo: "puntos_xy",
    unidad: "mm",
    obligatorio: true,
    ayuda: "Un punto {x_mm, y_mm} por cada brida, en coordenadas de la mesa.",
  },
];

describe("construirParametrosYEnvolvente", () => {
  it("reparte: cotas con medida_desde → envolvente; el resto → parametros_montaje", () => {
    const { parametros_montaje, envolvente } = construirParametrosYEnvolvente(
      BRIDAS,
      {
        part_bottom_z_mm: "78",
        part_top_z_mm: "122",
        fixture_top_z_mm: "104",
        posiciones: [
          { x_mm: "-60", y_mm: "0" },
          { x_mm: "60", y_mm: "0" },
        ],
      },
    );

    expect(envolvente).toEqual({
      part_bottom_z_mm: 78,
      part_top_z_mm: 122,
      fixture_top_z_mm: 104,
    });
    // posiciones viaja en parametros_montaje con claves x_mm / y_mm
    expect(parametros_montaje).toEqual({
      posiciones: [
        { x_mm: -60, y_mm: 0 },
        { x_mm: 60, y_mm: 0 },
      ],
    });
    // NADA de la trampa legacy: ni posiciones_bridas ni claves x/y peladas
    expect(parametros_montaje).not.toHaveProperty("posiciones_bridas");
    expect(JSON.stringify(parametros_montaje)).not.toContain('"x":');
    expect(JSON.stringify(parametros_montaje)).not.toContain('"y":');
  });

  it("un campo opcional sin valor no se envía (no se inventan medidas)", () => {
    const campos: CampoSchema[] = [
      ...COTAS,
      {
        nombre: "nota",
        etiqueta: "Nota",
        tipo: "texto",
        unidad: null,
        obligatorio: false,
      },
    ];
    const { parametros_montaje } = construirParametrosYEnvolvente(campos, {
      part_bottom_z_mm: "10",
      part_top_z_mm: "20",
      fixture_top_z_mm: "15",
      nota: "",
    });
    expect(parametros_montaje).toEqual({});
  });

  it("visible_si no cumplido → el campo no se envía aunque tenga valor", () => {
    const campos: CampoSchema[] = [
      {
        nombre: "forma",
        etiqueta: "Forma",
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
        visible_si: { campo: "forma", igual_a: "caja" },
      },
    ];
    const { parametros_montaje } = construirParametrosYEnvolvente(campos, {
      forma: "cilindro",
      largo_mm: "999", // no aplica: forma = cilindro
    });
    expect(parametros_montaje).toEqual({ forma: "cilindro" });
    expect(camposVisibles(campos, { forma: "cilindro" }).map((c) => c.nombre))
      .toEqual(["forma"]);
  });

  it("descarta filas de puntos incompletas", () => {
    const { parametros_montaje } = construirParametrosYEnvolvente(BRIDAS, {
      part_bottom_z_mm: "1",
      part_top_z_mm: "2",
      fixture_top_z_mm: "2",
      posiciones: [
        { x_mm: "10", y_mm: "20" },
        { x_mm: "", y_mm: "5" }, // incompleta → fuera
      ],
    });
    expect(parametros_montaje.posiciones).toEqual([{ x_mm: 10, y_mm: 20 }]);
  });
});

describe("camposIncompletos", () => {
  it("lista los obligatorios visibles sin valor", () => {
    const incompletos = camposIncompletos(BRIDAS, {
      part_bottom_z_mm: "78",
      part_top_z_mm: "122",
      fixture_top_z_mm: "104",
      posiciones: [],
    });
    expect(incompletos.map((c) => c.nombre)).toEqual(["posiciones"]);
  });

  it("vacío cuando todo lo obligatorio está declarado", () => {
    expect(
      camposIncompletos(BRIDAS, {
        part_bottom_z_mm: "78",
        part_top_z_mm: "122",
        fixture_top_z_mm: "104",
        posiciones: [{ x_mm: "0", y_mm: "0" }],
      }),
    ).toEqual([]);
  });
});

describe("distribuirPuntosAlrededor", () => {
  it("reparte con claves x_mm/y_mm y holgura sobre la huella de la pieza", () => {
    const puntos = distribuirPuntosAlrededor(4, 100, 80, 45);
    expect(puntos).toHaveLength(4);
    for (const p of puntos) {
      expect(Object.keys(p).sort()).toEqual(["x_mm", "y_mm"]);
      expect(Math.abs(p.x_mm)).toBe(100 / 2 + 45);
      expect(Math.abs(p.y_mm)).toBe(80 / 2 + 45);
    }
  });
});

describe("alturaTotalDeclarada", () => {
  it("es el máximo de las cotas medidas declaradas; 0 sin envolvente", () => {
    expect(alturaTotalDeclarada(null)).toBe(0);
    expect(
      alturaTotalDeclarada({
        part_bottom_z_mm: 78,
        part_top_z_mm: 122,
        fixture_top_z_mm: 104,
      }),
    ).toBe(122);
  });
});
