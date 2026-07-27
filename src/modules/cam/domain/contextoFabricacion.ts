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

export interface EstadoPiezaCard {
  id: EstadoPieza;
  titulo: string;
  descripcion: string;
  // Qué SIGNIFICA ese estado en la pieza. Explica lo que el operador está
  // ELIGIENDO — nunca lo que el MDE hará con ello: el motor explica sus propias
  // decisiones más adelante, en Operaciones. No duplicar aquí su razonamiento.
  ayuda: string;
  // Una imagen por forma de bruto. `desconocido` no tiene variantes: es la
  // ausencia de declaración, no una pieza concreta.
  imagen: { redondo: string; cuadrado: string } | { unica: string };
}

export const ESTADOS_PIEZA: EstadoPiezaCard[] = [
  {
    id: "bruto",
    titulo: "Material en bruto",
    descripcion: "Sin mecanizar, como llegó del proveedor",
    ayuda:
      "Ninguna superficie está mecanizada todavía: las medidas son las del " +
      "material de partida, con la tolerancia con que se vende.",
    imagen: { redondo: brutoRedondo, cuadrado: brutoCuadrado },
  },
  {
    id: "torneada",
    titulo: "Pieza torneada",
    descripcion: "El diámetro exterior ya está terminado",
    ayuda:
      "En una pieza torneada, los diámetros exteriores normalmente ya están " +
      "terminados; lo que queda en bruto son las zonas que no se pueden hacer " +
      "en el torno.",
    imagen: { redondo: torneadaRedondo, cuadrado: torneadaCuadrado },
  },
  {
    id: "parcial",
    titulo: "Pieza parcialmente mecanizada",
    descripcion: "Ya pasó por otra máquina",
    ayuda:
      "Parte de las superficies ya están mecanizadas y a medida, y otras " +
      "siguen en bruto. La pieza llega de una operación anterior.",
    imagen: { redondo: parcialRedondo, cuadrado: parcialCuadrado },
  },
  {
    id: "fundicion",
    titulo: "Fundición / Forja",
    descripcion: "Superficie irregular, sobrematerial desigual",
    ayuda:
      "La piel de fundición o forja sigue el contorno de la pieza: la " +
      "cantidad de material sobrante cambia de una zona a otra y la " +
      "superficie es irregular.",
    imagen: { redondo: fundicionRedondo, cuadrado: fundicionCuadrado },
  },
  {
    id: "reparacion",
    titulo: "Reparación",
    descripcion: "Pieza usada que se está recuperando",
    ayuda:
      "La pieza ya estuvo en servicio: sus medidas actuales pueden no " +
      "coincidir con el plano por desgaste o por un mecanizado anterior.",
    imagen: { redondo: reparacionRedondo, cuadrado: reparacionCuadrado },
  },
  {
    id: "desconocido",
    titulo: "No estoy seguro",
    descripcion: "No se declara el estado de la pieza",
    ayuda:
      "Es una respuesta válida: se continúa sin declarar el estado de la " +
      "pieza. Siempre se puede volver a este paso y precisarlo.",
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
