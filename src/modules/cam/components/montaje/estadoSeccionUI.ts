// src/modules/cam/components/montaje/estadoSeccionUI.ts
// Cómo se PINTA el estado de una sección (icono y color). La palabra de estado
// y el resumen son datos de las reglas (domain/montaje.ts); aquí solo forma.
// El icono cambia de FORMA con el estado: nunca se depende solo del color.
// Solo tokens del tema (globals.css): se adaptan al tema claro y al oscuro.
import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import type { EstadoSeccion } from "../../domain/montaje";

export const ICONO_ESTADO: Record<EstadoSeccion, typeof CircleCheck> = {
  completa: CircleCheck,
  pendiente: CircleAlert,
  opcional: CircleDashed,
};

/** Color del icono suelto sobre la superficie (bg-bg-surface). */
export const COLOR_ESTADO: Record<EstadoSeccion, string> = {
  completa: "text-accent-green",
  pendiente: "text-accent-amber",
  opcional: "text-text-muted",
};

/**
 * Relleno de un elemento que muestra el estado (pestaña, etiqueta): fondo,
 * color del borde y texto. Sobre el relleno verde/ámbar el texto es negro: es
 * el único que pasa 4.5:1 sobre ambos rellenos en los dos temas.
 */
export const RELLENO_ESTADO: Record<EstadoSeccion, string> = {
  completa: "border-accent-green bg-accent-green text-black",
  pendiente: "border-accent-amber bg-accent-amber text-black",
  opcional: "border-border bg-bg-primary text-text-muted",
};
