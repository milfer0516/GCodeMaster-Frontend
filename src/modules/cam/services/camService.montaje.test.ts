// src/modules/cam/services/camService.montaje.test.ts
// Captura el CUERPO REAL que sale del frontend hacia /cam/generate (y
// /cam/mde-recommendations, que comparte el constructor): el FormData que arma
// construirFormularioTrabajo. Todo local — sin red, sin backend, sin VM.
import { describe, it, expect } from "vitest";
import { construirFormularioTrabajo, type TrabajoPayload } from "./camService";
import type { MontajeConfig, StockConfig } from "../store/camStore";

const STOCK: StockConfig = {
  tipo: "rectangular",
  stockFaces: [],
  cyl: { radial: 0, axialMecanizado: 0, axialApoyo: 0 } as never,
  uniform: { x: false, y: false, z: false },
};

// El montaje tal como lo deja el nuevo paso Montaje (schema-driven):
// bridas con posiciones declaradas en parametros_montaje.
const MONTAJE: MontajeConfig = {
  tipo_sujecion: "bridas",
  sujecion_config: {
    familia: "bridas",
    id_utillaje: 7,
    nombre_utillaje: "Juego bridas M12",
    etiqueta_familia: "Bridas / estribos",
    parametros_montaje: {
      posiciones: [
        { x_mm: -95, y_mm: 85 },
        { x_mm: 95, y_mm: 85 },
        { x_mm: -95, y_mm: -85 },
        { x_mm: 95, y_mm: -85 },
      ],
    },
    envolvente: {
      part_bottom_z_mm: 78,
      part_top_z_mm: 122,
      fixture_top_z_mm: 104,
    },
    obstaculos: [],
  },
  id_maquina: 2,
  face_id_apoyo: 3,
  face_normal_apoyo: [0, 0, -1],
  wcs: "G54",
  notas: "",
  montaje_espacial: null,
};

function payload(): TrabajoPayload {
  return {
    archivo: new File(["STEP"], "pieza.step"),
    idJob: 42,
    operaciones: [{ tipo: "planeado", setup: 1 }],
    herramientas: [],
    materialKey: "acero",
    stockConfig: STOCK,
    partDims: { x: 100, y: 80, z: 40 },
    datumConfig: { x: 0, y: 0, z: 0 },
    montajeConfig: MONTAJE,
    contextoFabricacion: {
      estado: "desconocido",
      proceso_origen: "DESCONOCIDO",
    } as never,
    ordenSetups: "superior_primero",
    idMaquina: 2,
  };
}

describe("construirFormularioTrabajo — cuerpo saliente montaje_json", () => {
  it("sujecion_config lleva posiciones en parametros_montaje con x_mm/y_mm y las cotas medidas en envolvente", () => {
    const form = construirFormularioTrabajo(payload());

    const montajeJson = form.get("montaje_json");
    expect(typeof montajeJson).toBe("string");
    const montaje = JSON.parse(montajeJson as string);

    // Evidencia para el reporte: el cuerpo que sale del frontend.
    console.log(
      "montaje_json saliente:",
      JSON.stringify(montaje.sujecion_config, null, 2),
    );

    const sujecion = montaje.sujecion_config;
    expect(sujecion.familia).toBe("bridas");
    expect(sujecion.id_utillaje).toBe(7);

    // posiciones DENTRO de parametros_montaje, claves x_mm / y_mm
    expect(sujecion.parametros_montaje.posiciones).toEqual([
      { x_mm: -95, y_mm: 85 },
      { x_mm: 95, y_mm: 85 },
      { x_mm: -95, y_mm: -85 },
      { x_mm: 95, y_mm: -85 },
    ]);

    // cotas medidas en envolvente (contrato T2)
    expect(sujecion.envolvente).toEqual({
      part_bottom_z_mm: 78,
      part_top_z_mm: 122,
      fixture_top_z_mm: 104,
    });

    // La trampa legacy NO aparece en ningún nivel
    const crudo = montajeJson as string;
    expect(crudo).not.toContain("posiciones_bridas");
    expect(crudo).not.toContain("z_apoyo_mm");
  });
});
