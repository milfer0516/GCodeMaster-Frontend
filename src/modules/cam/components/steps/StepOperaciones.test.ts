// src/modules/cam/components/steps/StepOperaciones.test.ts
// Ejercita el formatter REAL usado por el catch de solicitarAnalisis. El panel
// ya renderiza ese string; aquí se prueba que el detail objeto no se pierda.
import { describe, expect, it } from "vitest";
import { mensajeErrorSolicitudMDE } from "./StepOperaciones";

describe("StepOperaciones — errores visibles de la solicitud MDE", () => {
  it("conserva el mensaje y el motivo de operaciones_fuera_del_sellado", () => {
    const error = {
      response: {
        data: {
          detail: {
            mensaje:
              "1 operación(es) no provienen del análisis de la cara sellada.",
            operaciones_fuera_del_sellado: [
              {
                indice: 0,
                op_id: "op_1",
                clave: "orientacion.eje_herramienta_pieza[0]",
                motivo:
                  "'orientacion.eje_herramienta_pieza[0]' distinta de la sellada",
              },
            ],
          },
        },
      },
    };

    expect(mensajeErrorSolicitudMDE(error)).toBe(
      "1 operación(es) no provienen del análisis de la cara sellada. " +
        "op_1: 'orientacion.eje_herramienta_pieza[0]' distinta de la sellada",
    );
  });

  it("mantiene un error claro cuando falla la conexión", () => {
    expect(mensajeErrorSolicitudMDE(new Error("Network Error"))).toBe(
      "No se pudo obtener el análisis del MDE.",
    );
  });

  it("mantiene literal el detail string del backend", () => {
    const error = {
      response: { data: { detail: "No se pudo contactar con el motor." } },
    };
    expect(mensajeErrorSolicitudMDE(error)).toBe(
      "No se pudo contactar con el motor.",
    );
  });
});
