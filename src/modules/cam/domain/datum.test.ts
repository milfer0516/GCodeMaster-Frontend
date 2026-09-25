// src/modules/cam/domain/datum.test.ts
// Puntos de datum (nivel 1) y su viaje al store. Ejercita el código REAL:
// puntosDatumDeCaja / puntoDelDatum (domain/datum.ts) y useCamStore.
import { describe, it, expect, beforeEach } from "vitest";
import { puntosDatumDeCaja, puntoDelDatum } from "./datum";
import { useCamStore } from "../store/camStore";

// Caja en el marco del sólido del motor (step_reader: centro XY en 0, base en
// Z=0). 246×246 es el ejemplo que documenta el propio motor en
// _traslacion_marco_datum (cam_builder.py): "la esquina superior izquierda está
// en el modelo en (-123, +123)".
const CAJA_246 = { min: [-123, -123, 0], max: [123, 123, 40] };

describe("puntosDatumDeCaja", () => {
  it("coloca cada origen donde el motor pone el cero (convención de cam_builder)", () => {
    const porOrigen = Object.fromEntries(
      puntosDatumDeCaja(CAJA_246).map((p) => [p.datum.origen, p.posicion]),
    );
    expect(porOrigen).toEqual({
      esquina_sup_izq: [-123, 123, 40], // ejemplo literal del motor
      esquina_sup_der: [123, 123, 40],
      esquina_inf_izq: [-123, -123, 40],
      esquina_inf_der: [123, -123, 40],
      centro_top: [0, 0, 40],
    });
  });

  it("funciona con una caja NO centrada (el teselado puede venir desplazado)", () => {
    const puntos = puntosDatumDeCaja({ min: [10, 20, 5], max: [110, 70, 30] });
    const sup_izq = puntos.find((p) => p.datum.origen === "esquina_sup_izq");
    const centro = puntos.find((p) => p.datum.origen === "centro_top");
    expect(sup_izq?.posicion).toEqual([10, 70, 30]);
    expect(centro?.posicion).toEqual([60, 45, 30]);
  });

  it("solo ofrece opciones que el motor acepta (DATUM_OPCIONES_VALIDAS)", () => {
    const origenes = puntosDatumDeCaja(CAJA_246).map((p) => p.datum.origen).sort();
    expect(origenes).toEqual([
      "centro_top",
      "esquina_inf_der",
      "esquina_inf_izq",
      "esquina_sup_der",
      "esquina_sup_izq",
    ]);
  });

  it("sin caja válida no inventa puntos", () => {
    expect(puntosDatumDeCaja(null)).toEqual([]);
    expect(puntosDatumDeCaja({ min: [0, 0], max: [1, 1] })).toEqual([]);
    expect(puntosDatumDeCaja({ min: [NaN, 0, 0], max: [1, 1, 1] })).toEqual([]);
  });
});

describe("puntoDelDatum", () => {
  it("resuelve el punto elegido y devuelve null si no hay datum declarado", () => {
    const puntos = puntosDatumDeCaja(CAJA_246);
    expect(puntoDelDatum(puntos, { origen: "esquina_inf_der" })?.id).toBe(
      "esquina_inf_der",
    );
    expect(puntoDelDatum(puntos, {})).toBeNull();
  });
});

describe("camStore — datumConfig", () => {
  beforeEach(() => useCamStore.getState().reset());

  it("arranca como {} (no declarado), no como {x,y,z}", () => {
    expect(useCamStore.getState().datumConfig).toEqual({});
  });

  it("guarda EXACTAMENTE el datum del punto elegido", () => {
    const punto = puntosDatumDeCaja(CAJA_246).find(
      (p) => p.datum.origen === "esquina_sup_der",
    )!;
    useCamStore.getState().setDatumConfig(punto.datum);
    expect(useCamStore.getState().datumConfig).toEqual({ origen: "esquina_sup_der" });
  });

  it("una pieza nueva (setAnalisis) borra el datum elegido para la anterior", () => {
    useCamStore.getState().setDatumConfig({ origen: "esquina_inf_izq" });
    useCamStore.getState().setAnalisis(7, { operaciones: [] });
    expect(useCamStore.getState().datumConfig).toEqual({});
  });
});
