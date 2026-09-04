// src/modules/cam/domain/tiposOperacion.ts
// ─────────────────────────────────────────────────────────────────────────────
// DOMINIO PURO — la tabla ÚNICA de tipos de operación de la UI.
//
// Existe para que la leyenda, el punto de color de cada fila y el resaltado en
// el visor 3D no puedan discrepar: los tres leen de aquí. Antes cada pantalla
// repetía su propio `switch (tipo)` y ya se habían separado (la vista de
// análisis usaba azul para planeado; StepOperaciones tenía otro juego de clases).
//
// El HEX es el mismo que CamViewer3D pinta sobre la malla — misma operación,
// mismo color en la lista y en la pieza. Si cambia uno debe cambiar el otro:
// por eso están anotados con el nombre de la constante del visor.
//
// Sin React, sin store, sin fetch.
// ─────────────────────────────────────────────────────────────────────────────

export interface TipoOperacion {
  /** `tipo` tal como lo reporta el motor en la operación detectada. */
  tipo: string;
  /** Nombre para el operador. */
  label: string;
  /** Color del punto en la lista y en la leyenda (clase Tailwind). */
  punto: string;
  /** Mismo color en hexadecimal — el que usa el visor sobre la malla. */
  hex: number;
}

// El orden es el de la leyenda del paso: Planeado · Taladrado · Cajera ·
// Contorneado.
export const TIPOS_OPERACION: readonly TipoOperacion[] = [
  { tipo: "planeado", label: "Planeado", punto: "bg-blue-400", hex: 0x3b82f6 }, // COLOR_PLANEADO
  { tipo: "taladrado", label: "Taladrado", punto: "bg-green-400", hex: 0x22c55e }, // COLOR_TALADRADO
  { tipo: "cajera", label: "Cajera", punto: "bg-purple-400", hex: 0xa855f7 }, // COLOR_CAJERA
  {
    tipo: "contorneado_exterior",
    label: "Contorneado",
    punto: "bg-orange-400",
    hex: 0xf97316,
  }, // COLOR_CONTORNO
] as const;

// Variantes que el motor puede reportar y que comparten color/etiqueta con su
// tipo base (una cajera circular sigue siendo una cajera para el operador).
const ALIAS: Record<string, string> = {
  cajera_circular: "cajera",
  contorneado: "contorneado_exterior",
};

export function tipoOperacion(tipo: string): TipoOperacion | null {
  const clave = ALIAS[tipo] ?? tipo;
  return TIPOS_OPERACION.find((t) => t.tipo === clave) ?? null;
}

/** Etiqueta legible; si el tipo es desconocido se muestra tal cual llegó. */
export function tipoOperacionLabel(tipo: string): string {
  return tipoOperacion(tipo)?.label ?? tipo;
}

/** Clase del punto de color; gris neutro si el tipo no está en la tabla. */
export function tipoOperacionPunto(tipo: string): string {
  return tipoOperacion(tipo)?.punto ?? "bg-slate-500";
}
