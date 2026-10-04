// src/modules/cam/domain/pasos.ts
// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO DE PASOS DEL WIZARD CAM — la ÚNICA lista de pasos.
//
// De aquí salen el tipo CamStep, el orden (y con él "Atrás"/"Siguiente"), las
// etiquetas del stepper, el paso inicial, los pasos que se cierran al salir de
// Montaje, la condición para avanzar de cada paso y lo que se hace al avanzar.
// Mover, unir o renombrar un paso es editar ESTA lista.
//
// · puedeAvanzar(estado): función PURA sobre una foto del store. Solo lee.
// · alSalir(get): se ejecuta al pulsar "Siguiente", ANTES de cambiar de paso.
//   Si lanza, el operario se queda en el paso y ve el mensaje del error. No se
//   ejecuta al ir hacia atrás ni al saltar con el stepper.
// ─────────────────────────────────────────────────────────────────────────────
import type { CamState } from "../store/camStore";
import { asignarMaterialJob } from "../services/camService";
import { estadoMontajeDe } from "../store/selectoresMontaje";
import { faltantesDeMontaje } from "./montaje";

/**
 * Lo que falta para salir de Montaje, en palabras del operario. Vacío = se
 * puede avanzar. Es LA condición del paso: puedeAvanzar, la nota de la
 * pantalla y el estado de cada sección del panel leen las mismas reglas
 * (domain/montaje.ts); aquí no se escribe otra lista.
 */
export function pendientesDeMontaje(e: CamState): string[] {
  return faltantesDeMontaje(estadoMontajeDe(e));
}

interface PasoDef {
  id: string;
  /** Etiqueta del stepper. */
  label: string;
  /** Tras avanzar desde Montaje con la orientación sellada, ya no se visita. */
  cerradoTrasMontaje?: boolean;
  puedeAvanzar: (estado: CamState) => boolean;
  alSalir?: (get: () => CamState) => Promise<void>;
}

export const PASOS = [
  {
    id: "cargar",
    label: "Archivo y Análisis",
    cerradoTrasMontaje: true,
    // La navegación solo aparece con el análisis a la vista (archivo + análisis).
    puedeAvanzar: (e) => Boolean(e.analisis && e.archivo),
  },
  {
    id: "montaje",
    label: "Montaje",
    cerradoTrasMontaje: true,
    puedeAvanzar: (e) => pendientesDeMontaje(e).length === 0,
    alSalir: async (get) => {
      // Confirmación explícita del montaje: aquí se construye el Setup
      // persistente (fuente de verdad en frame OCC/máquina) que consumirán
      // el visor y, en fases siguientes, Stock/operaciones/G-code.
      get().confirmMontaje();
      // A partir de aquí la orientación sellada queda fija: Montaje (y
      // Cargar) dejan de ser alcanzables desde el stepper y "Atrás".
      get().cerrarMontaje();
      // El veredicto de mecanizabilidad NO se pide aquí: el paso
      // Operaciones es el único disparador (useEffect con guarda de los
      // tres valores idJob/face/idMaquina). Pedirlo también en este punto
      // —sin esa guarda— lanzaba una evaluación con id_maquina posiblemente
      // nulo que pisaba el veredicto bueno con 'desconocido'.
      console.log(
        "montajeConfig al confirmar:",
        JSON.stringify(get().montajeConfig, null, 2),
      );
    },
  },
  {
    id: "material",
    label: "Material",
    puedeAvanzar: (e) => e.material !== null,
    // El material elegido se persiste en el trabajo (PUT /cam/job/{id}/material).
    // Sin trabajo o con el guardado fallido NO se avanza: /cam/generate lee el
    // material del trabajo y un avance silencioso dejaría el trabajo sin él.
    alSalir: async (get) => {
      const { idJob, material } = get();
      if (!material) throw new Error("Elija un material para continuar.");
      if (!idJob)
        throw new Error(
          "No hay un trabajo activo: vuelva a cargar la pieza para poder asignarle el material.",
        );
      try {
        await asignarMaterialJob(idJob, material.id_material);
      } catch (err) {
        console.error("Error asignando material:", err);
        throw new Error("No se pudo asignar el material al trabajo");
      }
    },
  },
  {
    id: "stock",
    label: "Stock",
    puedeAvanzar: () => true,
  },
  {
    id: "operaciones",
    label: "Operaciones",
    puedeAvanzar: (e) => e.operaciones.some((op) => op.seleccionada),
  },
  {
    id: "resumen",
    label: "Resumen",
    // Con el error de validación del motor (material insuficiente) no se sigue.
    puedeAvanzar: (e) => !e.engineResponse?.error,
  },
  {
    id: "simulacion",
    label: "Simulación",
    puedeAvanzar: () => true,
  },
  {
    id: "resultado",
    label: "G-Code",
    // Último paso: no hay siguiente.
    puedeAvanzar: () => false,
  },
] as const satisfies readonly PasoDef[];

export type CamStep = (typeof PASOS)[number]["id"];
export type Paso = (typeof PASOS)[number];

export const PASO_INICIAL: CamStep = PASOS[0].id;

export const MOTIVO_PASO_CERRADO =
  "La orientación de la pieza quedó fija al pasar de Montaje. Para cambiarla, cancele y empiece un trabajo nuevo.";

export function indiceDePaso(id: CamStep): number {
  return PASOS.findIndex((p) => p.id === id);
}

export function pasoPorId(id: CamStep): Paso {
  return PASOS[indiceDePaso(id)];
}

export function pasoSiguiente(id: CamStep): Paso | null {
  return PASOS[indiceDePaso(id) + 1] ?? null;
}

export function pasoAnterior(id: CamStep): Paso | null {
  const i = indiceDePaso(id);
  return i > 0 ? PASOS[i - 1] : null;
}

export function pasoCerrado(id: CamStep, montajeCerrado: boolean): boolean {
  const paso: PasoDef = pasoPorId(id);
  return montajeCerrado && paso.cerradoTrasMontaje === true;
}
