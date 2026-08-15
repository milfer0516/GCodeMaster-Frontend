// src/modules/cam/store/camStore.ts
import { create } from "zustand";
import type { MeshData } from "../services/camService";
import type { Maquina } from "../../../services/maquinasService";
import { computeSetup, type Setup } from "../utils/computeSetup";
import {
  deriveStockFaces,
  CYL_STOCK_INICIAL,
  type StockFace,
  type CylStock,
} from "../utils/stockFaces";
import {
  procesoOrigenDe,
  type EstadoPieza,
  type ProcessOrigin,
} from "../domain/contextoFabricacion";
import {
  indexarRecomendaciones,
  recomendacionDe,
  type RespuestaMDESetup,
} from "../domain/mdeRecomendaciones";
import type { RespuestaMecanizabilidad } from "../domain/mecanizabilidad";

export type { Setup };
export type { StockFace, CylStock };
export type { EstadoPieza, ProcessOrigin };

// DESPUÉS
export type CamStep =
  | "cargar"
  | "analisis"
  | "montaje"
  | "material"
  | "stock"
  | "contexto"
  | "operaciones"
  | "resumen"
  | "simulacion"
  | "resultado";

export interface Operacion {
  id: string;
  tipo: string;
  descripcion: string;
  setup: number;
  seleccionada: boolean;
  herramienta_sugerida?: string;
  face_indices?: number[];
}

/**
 * Estado de una consulta al motor, tal como la vive la pantalla.
 * `sin_analisis` NO es un error: es "todavía no se ha pedido". Se distingue de
 * `error` a propósito, porque decir "no hay herramienta ideal" —o "no es
 * alcanzable"— cuando en realidad no se ha consultado sería mentirle al
 * operador.
 */
export type EstadoConsulta = "sin_analisis" | "analizando" | "listo" | "error";

/** Nombre histórico de la consulta al MDE. Mismo estado, mismos valores. */
export type EstadoAnalisisMDE = EstadoConsulta;

export interface MaterialSeleccionado {
  id_material: number;
  nombre: string;
  grupo_iso: string;
  categoria: string;
}

export interface StockConfig {
  tipo: "rectangular" | "cilindrico";

  // SINGLE SOURCE OF TRUTH. Stock is defined ONLY by per-region offsets over the
  // part's bounding box — never by a competing "total dimensions" form (that was
  // the root cause of every desync). The resulting size is DERIVED and read-only.
  //
  // RECTANGULAR: 6 per-face offsets (X±, Y±, Z±). Each StockFace.allowance is how
  // much raw material sticks out on that face, measured with a caliper by the
  // operator. The support face is locked at 0.
  stockFaces: StockFace[];

  // CYLINDRICAL: 3-region offsets (radial uniform around the OD, axial machining
  // end, axial support end locked at 0). Same principle, 3 regions instead of 6.
  cyl: CylStock;

  // "Uniform" toggle per axis (rectangular, like SolidWorks' blue box): when on,
  // editing the + offset copies its value to the − offset of that axis. Off by
  // default — raw stock is rarely centered.
  uniform: { x: boolean; y: boolean; z: boolean };
}

// Declaración del operador sobre el estado de la pieza ANTES de mecanizar.
// Se guardan las dos caras del mismo dato: `estado` es la tarjeta que eligió (lo
// que la UI vuelve a pintar como seleccionada) y `proceso_origen` es su
// traducción al dominio del MDE (lo que viaja en el payload). La traducción vive
// en domain/contextoFabricacion.ts — aquí nunca se reconstruye a mano.
export interface ContextoFabricacion {
  estado: EstadoPieza;
  proceso_origen: ProcessOrigin;
}

export interface DatumConfig {
  x: number;
  y: number;
  z: number;
}

export type TipoSujecion =
  | "prensa"
  | "bridas"
  | "mesa_magnetica"
  | "copa_torno"
  | null;

export interface SujecionConfig {
  tipo: TipoSujecion;
  // Prensa
  ancho_mordaza_mm?: number;
  apertura_mm?: number;
  altura_mordaza_mm?: number;
  // Común (elevar pieza con paralelas)
  altura_paralelas_mm: number;
  // Bridas
  cantidad_bridas?: number;
  posicion_automatica?: boolean;
  posiciones_bridas?: Array<{ x: number; y: number }>;
  // Copa de torno
  diametro_copa_mm?: number;
  tipo_garras?: 3 | 4;
  profundidad_agarre_mm?: number;
  // Mesa magnética
  es_material_ferromagnetico?: boolean;
  // Altura total del montaje: sujeción + paralelas + pieza (validación Z)
  altura_total_montaje_mm: number | null;
  // Geometría física del montaje que el operador MIDE en la máquina (alturas de
  // los elementos de sujeción), nunca una holgura calculada. El motor la lee en
  // `sujecion_config.parametros_fisicos.*`.
  parametros_fisicos?: {
    altura_mordaza_mm?: number | null;
    altura_paralelas_mm?: number | null;
  };
  // Obstáculos declarados por el operador. Todavía SIN editor en el wizard: se
  // envía siempre `[]` (nunca se inventan posiciones). El motor lo lee en
  // `sujecion_config.obstaculos`.
  obstaculos?: Array<Record<string, number>>;
  // Envoltura 3D en coords de pieza (para colisiones y CAM)
  envolvente: {
    x_min: number; x_max: number;
    y_min: number; y_max: number;
    z_min: number; z_max: number;
    z_apoyo_mm: number;
    // Z del plano sobre el que apoya la base de la pieza (base del montaje +
    // paralelas). DERIVADO de la geometría física medida, NO un campo manual que
    // el operador rellene. `null` cuando el tipo de sujeción no define una base
    // en Z (copa de torno): no se inventa un valor. El motor lo lee en
    // `sujecion_config.envolvente.z_base_montaje_mm`.
    z_base_montaje_mm: number | null;
  } | null;
}

export interface MontajeConfig {
  tipo_sujecion: TipoSujecion;
  sujecion_config: SujecionConfig | null;
  id_maquina: number | null;
  face_id_apoyo: number | null;
  face_normal_apoyo: number[] | null;
  wcs: "G54" | "G55" | "G56" | "G57";
  notas: string;
}

export interface SetupResultado {
  nombre: string;
  gcode: string;
  ops: string[];
}

interface CamState {
  // Navegación
  step: CamStep;

  // Paso 1 — Archivo
  archivo: File | null;
  nombreArchivo: string;

  // Paso 2 — Análisis
  idJob: number | null;
  analisis: Record<string, any> | null;

  montajeConfig: MontajeConfig;

  // Setup persistente (montaje confirmado) — fuente de verdad en frame OCC/máquina.
  // Se crea en confirmMontaje() y se invalida al cambiar cara/sujeción/mesh.
  setup: Setup | null;

  // Paso 3 — Operaciones
  operaciones: Operacion[];

  // ── Asesoría del MDE (paso Operaciones) ────────────────────────────────
  // `mdeRecomendaciones` es la respuesta del motor GUARDADA TAL CUAL. El
  // frontend no la resume ni la recompone: la renderiza.
  mdeRecomendaciones: RespuestaMDESetup[] | null;
  mdeEstado: EstadoAnalisisMDE;
  mdeError: string | null;

  // ── Mecanizabilidad del montaje confirmado ─────────────────────────────
  // La respuesta del motor GUARDADA TAL CUAL (`POST /cam/machinability`), con
  // sus veredictos, sus motivos y su `resumen`. Es el ÚNICO sitio del que la
  // pantalla de Operaciones lee la mecanizabilidad: nadie la recalcula, nadie
  // la recuenta y nadie la deduce de la geometría, de la normal de la cara ni
  // del número de setup. Si no hay respuesta, es null — que NO es `desconocido`
  // (ese veredicto solo lo emite el motor).
  //
  // Se invalida en cuanto cambia una de las tres entradas del veredicto: la
  // geometría analizada, la cara de apoyo o la máquina declarada. Un veredicto
  // que sobreviviera a un cambio de cara diría "alcanzable" de un montaje que
  // ya no existe, sin error ni aviso — el fallo silencioso que este proyecto no
  // se puede permitir.
  mecanizabilidad: RespuestaMecanizabilidad | null;
  mecanizabilidadEstado: EstadoConsulta;
  mecanizabilidadError: string | null;

  // Herramienta que el operador ELIGIÓ para una operación, cuando decidió no
  // usar la que el MDE puso primero. Solo guarda ANULACIONES: la asignación por
  // defecto se deriva de la recomendación, así que no hay dos copias del mismo
  // dato que se puedan desincronizar. Clave = id de operación.
  herramientaPorOperacion: Record<string, number>;

  // Paso 3 — Mesh OCC real (teselación)
  meshData: MeshData | null;
  meshLoading: boolean;
  meshError: string | null;

  // Paso 4 — Material
  material: MaterialSeleccionado | null;

  // Paso 5 — Máquina/Stock/Datum
  maquina: Maquina | null;
  stockConfig: StockConfig;
  datumConfig: DatumConfig;
  ordenSetups: string;

  // Paso 6 — Contexto de fabricación (nunca bloquea: por defecto DESCONOCIDO)
  contextoFabricacion: ContextoFabricacion;

  // Paso 7 — Resultado
  gcodeSetups: SetupResultado[];

  // Engine response (plan de mecanizado, parametros de corte, errores de validacion)
  engineResponse: {
    plan_mecanizado?: any;
    parametros_corte?: any;
    stock?: any;
    error?: string;
  } | null;

  // Acciones
  setStep: (step: CamStep) => void;
  setArchivo: (archivo: File | null) => void;
  setAnalisis: (idJob: number, analisis: Record<string, any>) => void;
  setMontajeConfig: (config: Partial<MontajeConfig>) => void;
  confirmMontaje: () => void;
  invalidateSetup: () => void;
  setOperaciones: (ops: Operacion[]) => void;
  toggleOperacion: (id: string) => void;
  setMdeEstado: (estado: EstadoAnalisisMDE, error?: string | null) => void;
  setMdeRecomendaciones: (respuesta: RespuestaMDESetup[] | null) => void;
  setMecanizabilidadEstado: (estado: EstadoConsulta, error?: string | null) => void;
  setMecanizabilidad: (respuesta: RespuestaMecanizabilidad | null) => void;
  asignarHerramienta: (idOperacion: string, idInstancia: number) => void;
  setMaterial: (material: MaterialSeleccionado) => void;
  setMaquina: (maquina: Maquina) => void;
  setStockConfig: (config: StockConfig) => void;
  setContextoFabricacion: (estado: EstadoPieza) => void;
  setDatumConfig: (config: DatumConfig) => void;
  setOrdenSetups: (orden: string) => void;
  setGcodeSetups: (setups: SetupResultado[]) => void;
  setEngineResponse: (response: any) => void;
  setMeshData: (data: MeshData) => void;
  setMeshLoading: (loading: boolean) => void;
  setMeshError: (error: string | null) => void;
  reset: () => void;
}

const STOCK_INICIAL: StockConfig = {
  tipo: "rectangular",
  // Offsets START EMPTY — the operator measures with a caliper. The system NEVER
  // prefills or guesses a measurement nobody took (it would end up in the G-code).
  stockFaces: [], // regenerated (all offsets 0) on confirmMontaje
  cyl: { ...CYL_STOCK_INICIAL },
  uniform: { x: false, y: false, z: false },
};

// When the Setup frame changes, the operator's measured offsets no longer apply
// (they referred to an orientation that no longer exists). Reset all stock
// measurements but PRESERVE the operator's declared raw SHAPE (tipo).
const resetStockMeasurements = (s: StockConfig): StockConfig => ({
  ...STOCK_INICIAL,
  tipo: s.tipo,
});

const MONTAJE_INICIAL: MontajeConfig = {
  tipo_sujecion: null,
  sujecion_config: null,
  id_maquina: null,
  face_id_apoyo: null,
  face_normal_apoyo: null,
  wcs: "G54",
  notas: "",
};

const DATUM_INICIAL: DatumConfig = { x: 0, y: 0, z: 0 };

// Por defecto "No estoy seguro" → DESCONOCIDO: el paso nunca bloquea y no
// declarar es una respuesta válida (el MDE degrada igual que hoy).
const CONTEXTO_INICIAL: ContextoFabricacion = {
  estado: "desconocido",
  proceso_origen: procesoOrigenDe("desconocido"),
};

export const useCamStore = create<CamState>((set) => ({
  // DESPUÉS — agrega montajeConfig después de datumConfig
  step: "cargar",
  archivo: null,
  nombreArchivo: "",
  idJob: null,
  analisis: null,
  operaciones: [],
  mdeRecomendaciones: null,
  mdeEstado: "sin_analisis",
  mdeError: null,
  mecanizabilidad: null,
  mecanizabilidadEstado: "sin_analisis",
  mecanizabilidadError: null,
  herramientaPorOperacion: {},
  meshData: null,
  meshLoading: false,
  meshError: null,
  material: null,
  maquina: null,
  stockConfig: STOCK_INICIAL,
  datumConfig: DATUM_INICIAL,
  contextoFabricacion: CONTEXTO_INICIAL,
  montajeConfig: MONTAJE_INICIAL,
  setup: null,
  ordenSetups: "superior_primero",
  gcodeSetups: [],
  engineResponse: null,

  setStep: (step) => set({ step }),
  setArchivo: (archivo) => set({ archivo, nombreArchivo: archivo?.name ?? "" }),
  setAnalisis: (idJob, analisis) => {
    const ops = convertirOperaciones(analisis);
    set((state) => ({
      idJob,
      analisis,
      operaciones: ops,
      // Cascade: otra geometría son otras operaciones. La asesoría del MDE y las
      // herramientas asignadas se referían a las anteriores; arrastrarlas
      // mostraría una recomendación de una pieza que ya no está en la máquina.
      mdeRecomendaciones: null,
      mdeEstado: "sin_analisis" as EstadoAnalisisMDE,
      mdeError: null,
      // Otra geometría son otras operaciones: los veredictos anteriores se
      // emitieron sobre op_id que ya no existen.
      mecanizabilidad: null,
      mecanizabilidadEstado: "sin_analisis" as EstadoConsulta,
      mecanizabilidadError: null,
      herramientaPorOperacion: {},
      meshData: null,
      meshError: null,
      setup: null,
      // Cascade: sin Setup no hay offsets de stock válidos.
      stockConfig: resetStockMeasurements(state.stockConfig),
    }));
  },
  setOperaciones: (operaciones) => set({ operaciones }),
  toggleOperacion: (id) =>
    set((state) => ({
      operaciones: state.operaciones.map((op) =>
        op.id === id ? { ...op, seleccionada: !op.seleccionada } : op,
      ),
    })),
  setMdeEstado: (mdeEstado, mdeError = null) => set({ mdeEstado, mdeError }),

  // Guarda la respuesta del MDE y REFLEJA en las casillas lo que el motor
  // decidió — ni un paso más allá. `default_checked` es del contrato
  // (mde/recommendation.py: solo REQUIRED viene marcada; todo lo demás se
  // propone pero la decisión queda en el operador), así que aplicarlo no es
  // decidir por él: es no ocultarle lo que el MDE dijo.
  //
  // LIKELY_ALREADY_DONE llega DESMARCADA pero sigue en la lista y se puede
  // volver a marcar. Una operación no se esconde nunca: la recomendación del
  // motor es por TIPO de feature, no por operación, así que ocultar por
  // `presented` borraría de la pantalla todos los taladrados de un setup por un
  // veredicto que no se emitió operación a operación.
  //
  // Un tipo sin recomendación conserva la casilla que tuviera: no hay
  // información nueva sobre él, y ausencia de dato no es una orden de desmarcar.
  setMdeRecomendaciones: (mdeRecomendaciones) =>
    set((state) => {
      const indice = indexarRecomendaciones(mdeRecomendaciones, state.ordenSetups);
      return {
        mdeRecomendaciones,
        mdeEstado: mdeRecomendaciones ? "listo" : "sin_analisis",
        mdeError: null,
        operaciones: state.operaciones.map((op) => {
          const rec = recomendacionDe(indice, op);
          return rec ? { ...op, seleccionada: rec.default_checked } : op;
        }),
      };
    }),

  setMecanizabilidadEstado: (mecanizabilidadEstado, mecanizabilidadError = null) =>
    set({ mecanizabilidadEstado, mecanizabilidadError }),

  // Guarda el veredicto del motor y NADA MÁS. A diferencia de
  // setMdeRecomendaciones, aquí NO se tocan las casillas de las operaciones: el
  // MDE recomienda qué mecanizar (y su `default_checked` es contrato), mientras
  // que la mecanizabilidad informa qué ALCANZA la máquina en este montaje.
  // Desmarcar solo una operación `no_alcanzable` sería el frontend decidiendo
  // por el operario — y justo del lado peligroso, porque una operación que
  // `requiere_montaje_opuesto` no sobra: falta darle la vuelta a la pieza.
  setMecanizabilidad: (mecanizabilidad) =>
    set({
      mecanizabilidad,
      mecanizabilidadEstado: mecanizabilidad ? "listo" : "sin_analisis",
      mecanizabilidadError: null,
    }),

  asignarHerramienta: (idOperacion, idInstancia) =>
    set((state) => ({
      herramientaPorOperacion: {
        ...state.herramientaPorOperacion,
        [idOperacion]: idInstancia,
      },
    })),

  setMontajeConfig: (config) =>
    set((state) => {
      // Cambiar la cara de apoyo o la sujeción invalida el Setup confirmado:
      // no debe quedar un Setup obsoleto (con orientación vieja) filtrándose
      // hacia Stock/operaciones. face_id_apoyo/sujecion_config son las entradas
      // de las que depende computeSetup.
      const cambiaCara =
        "face_id_apoyo" in config &&
        config.face_id_apoyo !== state.montajeConfig.face_id_apoyo;
      const cambiaSujecion =
        "sujecion_config" in config &&
        config.sujecion_config !== state.montajeConfig.sujecion_config;
      const invalidar = state.setup !== null && (cambiaCara || cambiaSujecion);

      return {
        montajeConfig: { ...state.montajeConfig, ...config },
        // Cascade Setup → StockFaces: invalidar el Setup limpia las StockFaces
        // para que no queden sobre-materiales huérfanos en un frame que ya no
        // existe (se regeneran en el próximo confirmMontaje).
        ...(invalidar
          ? {
              setup: null,
              stockConfig: resetStockMeasurements(state.stockConfig),
            }
          : {}),
        // Cascade cara de apoyo → mecanizabilidad. Va con `cambiaCara`, NO con
        // `invalidar`: el veredicto depende de la cara de apoyo, no de que
        // hubiera un Setup confirmado. Si se colgara de `invalidar`, cambiar la
        // cara antes de confirmar el montaje dejaría en pantalla veredictos de
        // la cara anterior sin que fallara nada.
        ...(cambiaCara
          ? {
              mecanizabilidad: null,
              mecanizabilidadEstado: "sin_analisis" as EstadoConsulta,
              mecanizabilidadError: null,
            }
          : {}),
      };
    }),
  confirmMontaje: () =>
    set((state) => {
      const faceId = state.montajeConfig.face_id_apoyo;
      if (!state.meshData || faceId === null) {
        console.warn(
          "[camStore] confirmMontaje: falta meshData o cara de apoyo; no se crea Setup.",
        );
        return { setup: null };
      }
      const setup = computeSetup(
        state.meshData,
        faceId,
        state.analisis,
        state.montajeConfig.sujecion_config,
      );
      if (!setup) {
        return {
          setup: null,
          stockConfig: resetStockMeasurements(state.stockConfig),
        };
      }
      // Cascade Setup → offsets: regenerar las 6 caras desde el nuevo Setup,
      // reasignando roles y RESETEANDO todos los offsets a 0 (los antiguos
      // referían un frame que ya no existe — no se arrastran). También se limpian
      // los offsets cilíndricos y los toggles uniform.
      const stockFaces = deriveStockFaces(setup);
      return {
        setup,
        stockConfig: { ...resetStockMeasurements(state.stockConfig), stockFaces },
      };
    }),
  invalidateSetup: () =>
    set((state) => ({
      setup: null,
      stockConfig: resetStockMeasurements(state.stockConfig),
    })),
  setMaterial: (material) => set({ material }),
  // Cascade máquina → mecanizabilidad: la cinemática declarada es una de las
  // tres entradas del veredicto. Solo se invalida si la máquina CAMBIA de
  // verdad; recargar la misma no borra un veredicto vigente.
  setMaquina: (maquina) =>
    set((state) =>
      state.maquina?.id_maquina === maquina.id_maquina
        ? { maquina }
        : {
            maquina,
            mecanizabilidad: null,
            mecanizabilidadEstado: "sin_analisis" as EstadoConsulta,
            mecanizabilidadError: null,
          },
    ),
  setStockConfig: (stockConfig) => set({ stockConfig }),
  // La UI elige una TARJETA; el ProcessOrigin se deriva aquí con la tabla del
  // dominio, así que en el store no puede quedar un par estado/origen incoherente.
  setContextoFabricacion: (estado) =>
    set({
      contextoFabricacion: { estado, proceso_origen: procesoOrigenDe(estado) },
    }),
  setDatumConfig: (datumConfig) => set({ datumConfig }),
  setOrdenSetups: (ordenSetups) => set({ ordenSetups }),
  setGcodeSetups: (gcodeSetups) => set({ gcodeSetups }),
  setEngineResponse: (engineResponse) => set({ engineResponse }),
  setMeshData: (meshData) =>
    // Cargar una geometría nueva invalida cualquier Setup previo (y sus StockFaces).
    set((state) => ({
      meshData,
      meshLoading: false,
      meshError: null,
      setup: null,
      stockConfig: resetStockMeasurements(state.stockConfig),
      // Otra geometría son otros face_id: el veredicto anterior hablaba de una
      // cara de apoyo que ya no es la misma.
      mecanizabilidad: null,
      mecanizabilidadEstado: "sin_analisis" as EstadoConsulta,
      mecanizabilidadError: null,
    })),
  setMeshLoading: (meshLoading) => set({ meshLoading }),
  setMeshError: (meshError) => set({ meshError, meshLoading: false }),
  reset: () =>
    set({
      step: "cargar",
      archivo: null,
      nombreArchivo: "",
      idJob: null,
      analisis: null,
      operaciones: [],
      mdeRecomendaciones: null,
      mdeEstado: "sin_analisis",
      mdeError: null,
      mecanizabilidad: null,
      mecanizabilidadEstado: "sin_analisis",
      mecanizabilidadError: null,
      herramientaPorOperacion: {},
      meshData: null,
      meshLoading: false,
      meshError: null,
      material: null,
      maquina: null,
      stockConfig: STOCK_INICIAL,
      datumConfig: DATUM_INICIAL,
      contextoFabricacion: CONTEXTO_INICIAL,
      montajeConfig: MONTAJE_INICIAL,
      setup: null,
      ordenSetups: "superior_primero",
      gcodeSetups: [],
      engineResponse: null,
    }),
}));

const convertirOperaciones = (analisis: Record<string, any>): Operacion[] => {
  const opsBackend = analisis?.operaciones ?? [];

  const ops = opsBackend.map((op: any, idx: number) => ({
    id: op.op_id ?? `setup${op.setup}_${op.tipo}_${idx}`,
    tipo: op.tipo,
    descripcion: op.descripcion,
    setup: op.setup ?? 1,
    seleccionada: false,
    herramienta_sugerida: op.fresa_max_mm
      ? `Máx Ø${op.fresa_max_mm}mm`
      : op.diametro_mm
        ? `Ø${op.diametro_mm}mm`
        : undefined,
    face_indices: op.face_indices,
  }));

  console.log(
    "OP IDs generados:",
    ops.map((o: Operacion) => o.id),
  );
  console.log("Operaciones backend RAW:", opsBackend);

  return ops;
};
