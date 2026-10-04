// src/modules/cam/components/montaje/estadoSeccionUI.ts
// Cómo se PINTA el estado de una sección (icono y color). La palabra de estado
// y el resumen son datos de las reglas (domain/montaje.ts); aquí solo forma.
// El icono cambia de FORMA con el estado: nunca se depende solo del color.
import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import type { EstadoSeccion } from "../../domain/montaje";

export const ICONO_ESTADO: Record<EstadoSeccion, typeof CircleCheck> = {
  completa: CircleCheck,
  pendiente: CircleAlert,
  opcional: CircleDashed,
};

export const COLOR_ESTADO: Record<EstadoSeccion, string> = {
  completa: "text-green-400",
  pendiente: "text-amber-500",
  opcional: "text-text-muted",
};
