// src/modules/cam/components/montaje/seccionesMontaje.ts
// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO de las secciones del panel de Montaje: une cada fila de reglas
// (domain/montaje.ts, puro) con el componente que la pinta.
//
// Agregar una sección = un archivo Seccion*.tsx + su fila de reglas en
// domain/montaje.ts + su línea aquí. El Record exige una línea por cada id de
// las reglas: si falta, no compila. El panel no se toca.
// ─────────────────────────────────────────────────────────────────────────────
import type { ComponentType } from "react";
import {
  REGLAS_MONTAJE,
  type IdSeccionMontaje,
  type SeccionMontaje,
} from "../../domain/montaje";
import { SeccionLlegadaPieza } from "./SeccionLlegadaPieza";
import { SeccionCaraApoyo } from "./SeccionCaraApoyo";
import { SeccionSujecion } from "./SeccionSujecion";
import { SeccionColocacion } from "./SeccionColocacion";
import { SeccionNotas } from "./SeccionNotas";

const CONTENIDO: Record<IdSeccionMontaje, ComponentType> = {
  llegada: SeccionLlegadaPieza,
  "cara-apoyo": SeccionCaraApoyo,
  sujecion: SeccionSujecion,
  colocacion: SeccionColocacion,
  notas: SeccionNotas,
};

export type SeccionMontajeUI = SeccionMontaje<ComponentType> & {
  id: IdSeccionMontaje;
};

export const SECCIONES_MONTAJE: readonly SeccionMontajeUI[] = REGLAS_MONTAJE.map(
  (reglas) => ({ ...reglas, Contenido: CONTENIDO[reglas.id] }),
);
