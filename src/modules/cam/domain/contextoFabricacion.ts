// src/modules/cam/domain/contextoFabricacion.ts
//
// DOMINIO del contexto de fabricación (declaración del operador).
//
// La pregunta que se le hace al operador es "¿cuál es el ESTADO de esta pieza
// antes de mecanizar?", no "¿de dónde viene?": tiene la pieza en la mano y sabe
// lo que ES, pero puede no conocer su historia de fabricación.
//
// DOS TABLAS SEPARADAS, a propósito:
//   1. ESTADOS_PIEZA — las seis tarjetas que ve el operador. Cada tarjeta es
//      DUEÑA de sus imágenes (redonda/cuadrada, según la forma de bruto que ya
//      declaró en el paso Stock).
//   2. ORIGEN_POR_ESTADO — la ÚNICA traducción tarjeta → ProcessOrigin del MDE.
//
// No se fusionan porque la relación NO es 1:1: seis tarjetas de UI contra diez
// ProcessOrigin del dominio, "Fundición / Forja" cubre dos orígenes y cada
// estado tiene además dos variantes de imagen. Por eso los PNG tampoco llevan
// el nombre de un ProcessOrigin: se llaman como el estado que ilustran.
//
// Este archivo es PURO: ni React, ni Zustand, ni fetch.

import brutoRedondo from "../../../assets/contexto/bruto-redondo.png";
import brutoCuadrado from "../../../assets/contexto/bruto-cuadrado.png";
import torneadaRedondo from "../../../assets/contexto/torneada-redondo.png";
import torneadaCuadrado from "../../../assets/contexto/torneada-cuadrado.png";
import parcialRedondo from "../../../assets/contexto/parcial-redondo.png";
import parcialCuadrado from "../../../assets/contexto/parcial-cuadrado.png";
import fundicionRedondo from "../../../assets/contexto/fundicion-redondo.png";
import fundicionCuadrado from "../../../assets/contexto/fundicion-cuadrado.png";
import reparacionRedondo from "../../../assets/contexto/reparacion-redondo.png";
import reparacionCuadrado from "../../../assets/contexto/reparacion-cuadrado.png";
import desconocido from "../../../assets/contexto/desconocido.png";

// ── Dominio del MDE (espejo de solo lectura) ────────────────────────────────
// Los diez valores de ProcessOrigin del motor. Se replican aquí para poder
// tipar el payload; NO se modifican ni se amplían desde el frontend.
export type ProcessOrigin =
  | "BRUTO"
  | "TORNO"
  | "VMC"
  | "RECTIFICADO"
  | "FUNDICION"
  | "FORJA"
  | "REPARACION"
  | "RETRABAJO"
  | "PROVEEDOR"
  | "DESCONOCIDO";

// ── Las seis tarjetas de la UI ──────────────────────────────────────────────
export type EstadoPieza =
  | "bruto"
  | "torneada"
  | "parcial"
  | "fundicion"
  | "reparacion"
  | "desconocido";

// Forma del bruto que el operador YA declaró en el paso Stock.
export type FormaStock = "rectangular" | "cilindrico";

// Cómo se nombra esa forma en las tarjetas (el operador ve la palabra de taller,
// no la clave interna del stock).
export const FORMA_LABEL: Record<FormaStock, string> = {
  cilindrico: "Cilíndrica",
  rectangular: "Prismática",
};

export interface EstadoPiezaCard {
  id: EstadoPieza;
  titulo: string;
  // Lo que se OBSERVA en la pieza, nada más. Ningún texto de este paso anticipa
  // el comportamiento del motor ("asumirá", "buscará", "no propondrá", reglas):
  // eso es exclusivo del MDE, que explica su razonamiento después, en
  // Operaciones. Si mañana cambia la lógica del motor, esta pantalla sigue
  // siendo correcta sin tocar una palabra.
  descripcion: string;
  // Ampliación del MISMO hecho observable, para el panel de ayuda. Misma regla.
  ayuda: string;
  // Una imagen por forma de bruto. `desconocido` no tiene variantes: es la
  // ausencia de declaración, no una pieza concreta.
  imagen: { redondo: string; cuadrado: string } | { unica: string };
}

export const ESTADOS_PIEZA: EstadoPiezaCard[] = [
  {
    id: "bruto",
    titulo: "Material en bruto",
    descripcion: "La pieza aún no presenta mecanizados.",
    ayuda:
      "Ninguna superficie está mecanizada todavía: las medidas son las del " +
      "material de partida, con la tolerancia con que se vende.",
    imagen: { redondo: brutoRedondo, cuadrado: brutoCuadrado },
  },
  {
    id: "torneada",
    titulo: "Pieza torneada",
    descripcion: "El diámetro exterior ya fue mecanizado en un torno.",
    ayuda:
      "Los diámetros exteriores muestran el acabado del torno; las zonas que " +
      "no se pueden tornear siguen tal como estaban.",
    imagen: { redondo: torneadaRedondo, cuadrado: torneadaCuadrado },
  },
  {
    id: "parcial",
    titulo: "Pieza parcialmente mecanizada",
    descripcion: "La pieza ya tiene algunas operaciones realizadas.",
    ayuda:
      "Unas superficies están mecanizadas y a medida, y otras siguen en " +
      "bruto: la pieza llega de una operación anterior.",
    imagen: { redondo: parcialRedondo, cuadrado: parcialCuadrado },
  },
  {
    id: "fundicion",
    titulo: "Fundición / Forja",
    descripcion:
      "La superficie es irregular y conserva la forma del proceso de fabricación.",
    ayuda:
      "La piel de fundición o forja sigue el contorno de la pieza: la " +
      "cantidad de material sobrante cambia de una zona a otra.",
    imagen: { redondo: fundicionRedondo, cuadrado: fundicionCuadrado },
  },
  {
    id: "reparacion",
    titulo: "Reparación",
    descripcion: "Es una pieza usada que será recuperada mediante mecanizado.",
    ayuda:
      "La pieza ya estuvo en servicio: sus medidas actuales pueden no " +
      "coincidir con el plano por desgaste o por un mecanizado anterior.",
    imagen: { redondo: reparacionRedondo, cuadrado: reparacionCuadrado },
  },
  {
    id: "desconocido",
    titulo: "No estoy seguro",
    descripcion: "Continúa sin seleccionar un contexto específico.",
    ayuda:
      "No se declara el estado de la pieza. Es una respuesta válida y " +
      "siempre se puede volver a este paso a precisarla.",
    imagen: { unica: desconocido },
  },
];

// ── Traducción tarjeta → dominio del MDE (ÚNICO lugar) ──────────────────────
// `origen` es el valor que VIAJA en el payload. `cubre` documenta los demás
// ProcessOrigin que la misma tarjeta engloba: el operador no distingue entre
// ellos con la pieza en la mano, así que la UI no los separa. Los diez valores
// del dominio siguen intactos — aquí solo se elige cuál declara cada tarjeta.
export const ORIGEN_POR_ESTADO: Record<
  EstadoPieza,
  { origen: ProcessOrigin; cubre: ProcessOrigin[] }
> = {
  bruto: { origen: "BRUTO", cubre: ["PROVEEDOR"] },
  torneada: { origen: "TORNO", cubre: [] },
  parcial: { origen: "VMC", cubre: ["RECTIFICADO"] },
  fundicion: { origen: "FUNDICION", cubre: ["FORJA"] },
  reparacion: { origen: "REPARACION", cubre: ["RETRABAJO"] },
  desconocido: { origen: "DESCONOCIDO", cubre: [] },
};

export function procesoOrigenDe(estado: EstadoPieza): ProcessOrigin {
  return ORIGEN_POR_ESTADO[estado].origen;
}

// Imagen de la tarjeta para la forma de bruto que el operador ya declaró:
// mostrarle SU caso (barra redonda o bloque cuadrado) refuerza que el sistema
// viene siguiendo lo que declaró en Stock.
export function imagenDeEstado(
  card: EstadoPiezaCard,
  forma: FormaStock,
): string {
  if ("unica" in card.imagen) return card.imagen.unica;
  return forma === "cilindrico" ? card.imagen.redondo : card.imagen.cuadrado;
}
