// src/lib/geometry/herramientas/comunes.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Piezas compartidas entre familias — FUNCIONES PURAS.
//
// Mango, cuerpo acanalado, dientes frontales y portaherramientas. Cada una
// devuelve un THREE.Object3D nuevo a partir de números; ninguna lee estado.
//
// MODELO DEL ACANALADO (usado por casi todas las familias): una herramienta de
// corte no es un cilindro liso. Es un NÚCLEO de radio menor (el alma) del que
// sobresalen N FILOS helicoidales que definen el diámetro nominal. Se construye
// así en vez de con booleanas: es exacto en el Ø exterior, barato y se lee como
// una herramienta real, no como un lápiz.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { CurvaHelicoidal, vueltasPorAnguloHelice } from "../curvas";
import { cilindro, prisma, revolucion, angulosUniformes } from "../primitivas";
import type { MaterialesHerramienta } from "../materiales";

export function malla(
  geometria: THREE.BufferGeometry,
  material: THREE.Material,
): THREE.Mesh {
  return new THREE.Mesh(geometria, material);
}

export interface OpcionesAcanalado {
  /** Radio exterior = radio de corte. */
  radio: number;
  /** Radio exterior al final del tramo (conos: fresa de chaflán). */
  radioFinal?: number;
  yInicio: number;
  yFin: number;
  filos: number;
  /** Ángulo de hélice en grados respecto al eje. 0 = filos rectos. */
  anguloHelice?: number;
  /** Ancho del filo relativo al radio (0.30 ≈ fresa; 0.34 ≈ broca). */
  anchoRel?: number;
  fase?: number;
  /** +1 hélice a derechas, -1 a izquierdas. */
  sentido?: 1 | -1;
}

/**
 * Tramo acanalado: núcleo oscuro + N filos helicoidales que llegan justo al
 * radio nominal. El hueco entre filos ES la ranura de evacuación de viruta.
 */
export function cuerpoAcanalado(
  materiales: MaterialesHerramienta,
  o: OpcionesAcanalado,
): THREE.Group {
  const grupo = new THREE.Group();
  const radioFinal = o.radioFinal ?? o.radio;
  const anchoRel = o.anchoRel ?? 0.3;
  const altura = Math.max(o.yFin - o.yInicio, 1e-3);

  // "Grosor" del filo (radio del tubo). Se toma del radio MEDIO para que los
  // tramos cónicos (fresa de chaflán) no queden con el filo desproporcionado.
  const radioFilo = ((o.radio + radioFinal) / 2) * anchoRel;
  const nucleoIni = Math.max(o.radio - radioFilo, o.radio * 0.25);
  const nucleoFin = Math.max(radioFinal - radioFilo, radioFinal * 0.25);

  // Núcleo (alma). Cónico si el tramo lo es.
  grupo.add(
    malla(
      cilindro(nucleoFin, nucleoIni, altura, o.yInicio, 40),
      materiales.ranura,
    ),
  );

  const vueltas =
    o.anguloHelice && o.anguloHelice > 0
      ? vueltasPorAnguloHelice(o.radio * 2, altura, o.anguloHelice)
      : 0;
  const segmentos = Math.max(20, Math.round(vueltas * 40) + 12);

  for (const fase of angulosUniformes(o.filos, o.fase ?? 0)) {
    const curva = new CurvaHelicoidal(
      nucleoIni,
      nucleoFin,
      o.yInicio,
      o.yFin,
      vueltas,
      fase,
      o.sentido ?? 1,
    );
    const geo = new THREE.TubeGeometry(
      curva,
      segmentos,
      radioFilo,
      10,
      false,
    );
    grupo.add(malla(geo, materiales.corte));
  }

  return grupo;
}

/**
 * Gashes frontales de una fresa de corte al centro: las ranuras que se ven
 * mirando la herramienta por la punta. `yBase` es la cota INFERIOR de la
 * ranura, para que nunca sobresalga por debajo del plano de corte.
 */
export function dientesFrontales(
  materiales: MaterialesHerramienta,
  radio: number,
  yBase: number,
  filos: number,
  fase = 0,
): THREE.Group {
  const grupo = new THREE.Group();
  const alto = radio * 0.1;
  const ancho = radio * 0.16;
  for (const a of angulosUniformes(filos, fase)) {
    grupo.add(
      malla(
        prisma(
          radio * 1.02,
          alto,
          ancho,
          [(radio / 2) * Math.cos(a), yBase + alto / 2, (radio / 2) * -Math.sin(a)],
          a,
        ),
        materiales.ranura,
      ),
    );
  }
  return grupo;
}

/**
 * Cota mínima a la que pueden arrancar los filos helicoidales sin que su
 * extremo (un disco perpendicular a la hélice, por tanto inclinado) asome por
 * debajo del plano de corte. Es geometría, no gusto: el disco se inclina el
 * ángulo de hélice, así que baja radioFilo·sen(α).
 */
export function alturaArranqueFilos(
  radio: number,
  anchoRel = 0.3,
  anguloHeliceGrados = 30,
): number {
  const radioFilo = radio * anchoRel;
  return radioFilo * Math.sin((anguloHeliceGrados * Math.PI) / 180) * 1.15;
}

/** Mango cilíndrico liso, del final del filo hasta la longitud total. */
export function mangoCilindrico(
  materiales: MaterialesHerramienta,
  radioMango: number,
  yInicio: number,
  yFin: number,
): THREE.Group {
  const grupo = new THREE.Group();
  const altura = Math.max(yFin - yInicio, 1e-3);

  // Pequeño cuello de transición filo → mango (rebaje de alivio).
  const cuello = Math.min(altura * 0.12, radioMango * 0.8);
  if (cuello > 0.05) {
    grupo.add(
      malla(
        revolucion(
          [
            [radioMango * 0.86, yInicio],
            [radioMango * 0.9, yInicio + cuello * 0.5],
            [radioMango, yInicio + cuello],
          ],
          40,
        ),
        materiales.mango,
      ),
    );
  }

  grupo.add(
    malla(
      cilindro(radioMango, radioMango, altura - cuello, yInicio + cuello, 40),
      materiales.mango,
    ),
  );
  return grupo;
}

/**
 * Portaherramientas (pinza tipo ER). Se dibuja SOLO cuando el operador
 * declaró la longitud útil real: sirve para que vea de un vistazo cuánta
 * herramienta queda fuera del cono — el error clásico de una Ø12 con 8 mm
 * útiles salta a la vista.
 */
export function portaherramientas(
  materiales: MaterialesHerramienta,
  yBase: number,
  radioMango: number,
): THREE.Group {
  const grupo = new THREE.Group();
  const rTuerca = Math.max(radioMango * 2.1, radioMango + 4);
  const hTuerca = Math.max(radioMango * 3.2, 10);
  const hCuerpo = hTuerca * 1.6;

  // Tuerca / pinza: cono que abraza el mango. El perfil se cierra en el eje
  // (r = 0) para que la revolución quede tapada y no se vea hueca.
  grupo.add(
    malla(
      revolucion(
        [
          [0, yBase],
          [radioMango * 1.02, yBase],
          [rTuerca * 0.62, yBase + hTuerca * 0.28],
          [rTuerca, yBase + hTuerca * 0.75],
          [rTuerca, yBase + hTuerca],
        ],
        40,
      ),
      materiales.detalle,
    ),
  );

  // Cuerpo del cono portaherramientas.
  grupo.add(
    malla(
      revolucion(
        [
          [rTuerca, yBase + hTuerca],
          [rTuerca * 1.12, yBase + hTuerca + hCuerpo * 0.55],
          [rTuerca * 1.12, yBase + hTuerca + hCuerpo],
          [0, yBase + hTuerca + hCuerpo],
        ],
        40,
      ),
      materiales.mango,
    ),
  );

  return grupo;
}
