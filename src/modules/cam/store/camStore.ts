// src/modules/cam/store/camStore.ts
import { create } from "zustand";
import type { MeshData } from "../services/camService";

// DESPUÉS
export type CamStep =
  | "cargar"
  | "analisis"
  | "montaje"
  | "operaciones"
  | "material"
  | "maquina"
  | "resumen"
  | "resultado";

export interface Operacion {
  id: string;
  tipo: string;
  descripcion: string;
  setup: number;
  seleccionada: boolean;
  herramienta_sugerida?: string;
}

export interface MaterialSeleccionado {
  id_material: number;
  nombre: string;
  grupo_iso: string;
  categoria: string;
}

export interface StockConfig {
  tipo: string;
  z_superior_mm: number;
  z_inferior_mm: number;
}

export interface DatumConfig {
  x: number;
  y: number;
  z: number;
}

export interface MontajeConfig {
  tipo_sujecion: "prensa" | "mordaza" | "plato" | "bridas" | null;
  face_id_apoyo: number | null;
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

  // Paso 3 — Operaciones
  operaciones: Operacion[];

  // Paso 3 — Mesh OCC real (teselación)
  meshData: MeshData | null;
  meshLoading: boolean;
  meshError: string | null;

  // Paso 4 — Material
  material: MaterialSeleccionado | null;

  // Paso 5 — Máquina/Stock/Datum
  stockConfig: StockConfig;
  datumConfig: DatumConfig;
  ordenSetups: string;

  // Paso 7 — Resultado
  gcodeSetups: SetupResultado[];

  // Acciones
  setStep: (step: CamStep) => void;
  setArchivo: (archivo: File) => void;
  setAnalisis: (idJob: number, analisis: Record<string, any>) => void;
  setMontajeConfig: (config: Partial<MontajeConfig>) => void;
  setOperaciones: (ops: Operacion[]) => void;
  toggleOperacion: (id: string) => void;
  setMaterial: (material: MaterialSeleccionado) => void;
  setStockConfig: (config: StockConfig) => void;
  setDatumConfig: (config: DatumConfig) => void;
  setOrdenSetups: (orden: string) => void;
  setGcodeSetups: (setups: SetupResultado[]) => void;
  setMeshData: (data: MeshData) => void;
  setMeshLoading: (loading: boolean) => void;
  setMeshError: (error: string | null) => void;
  reset: () => void;
}

const STOCK_INICIAL: StockConfig = {
  tipo: "por_cara",
  z_superior_mm: 1.0,
  z_inferior_mm: 1.0,
};

const DATUM_INICIAL: DatumConfig = { x: 0, y: 0, z: 0 };

export const useCamStore = create<CamState>((set) => ({
  // DESPUÉS — agrega montajeConfig después de datumConfig
  step: "cargar",
  archivo: null,
  nombreArchivo: "",
  idJob: null,
  analisis: null,
  operaciones: [],
  meshData: null,
  meshLoading: false,
  meshError: null,
  material: null,
  stockConfig: STOCK_INICIAL,
  datumConfig: DATUM_INICIAL,
  montajeConfig: {
    tipo_sujecion: null,
    face_id_apoyo: null,
    wcs: "G54",
    notas: "",
  },
  ordenSetups: "superior_primero",
  gcodeSetups: [],

  setStep: (step) => set({ step }),
  setArchivo: (archivo) => set({ archivo, nombreArchivo: archivo.name }),
  setAnalisis: (idJob, analisis) => {
    const ops = convertirOperaciones(analisis);
    set({ idJob, analisis, operaciones: ops, meshData: null, meshError: null });
  },
  setOperaciones: (operaciones) => set({ operaciones }),
  toggleOperacion: (id) =>
    set((state) => ({
      operaciones: state.operaciones.map((op) =>
        op.id === id ? { ...op, seleccionada: !op.seleccionada } : op,
      ),
    })),
  setMontajeConfig: (config) =>
    set((state) => ({
      montajeConfig: { ...state.montajeConfig, ...config },
    })),
  setMaterial: (material) => set({ material }),
  setStockConfig: (stockConfig) => set({ stockConfig }),
  setDatumConfig: (datumConfig) => set({ datumConfig }),
  setOrdenSetups: (ordenSetups) => set({ ordenSetups }),
  setGcodeSetups: (gcodeSetups) => set({ gcodeSetups }),
  setMeshData: (meshData) =>
    set({ meshData, meshLoading: false, meshError: null }),
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
      meshData: null,
      meshLoading: false,
      meshError: null,
      material: null,
      stockConfig: STOCK_INICIAL,
      datumConfig: DATUM_INICIAL,
      montajeConfig: {
        tipo_sujecion: null,
        face_id_apoyo: null,
        wcs: "G54",
        notas: "",
      },
      ordenSetups: "superior_primero",
      gcodeSetups: [],
    }),
}));

const convertirOperaciones = (analisis: Record<string, any>): Operacion[] => {
  const opsBackend = analisis?.operaciones ?? [];
  return opsBackend.map((op: any, idx: number) => ({
    id: `setup${op.setup}_${op.tipo}_${idx}`,
    tipo: op.tipo,
    descripcion: op.descripcion,
    setup: op.setup ?? 1,
    seleccionada: true,
    herramienta_sugerida: op.fresa_max_mm
      ? `Máx Ø${op.fresa_max_mm}mm`
      : op.diametro_mm
        ? `Ø${op.diametro_mm}mm`
        : undefined,
  }));
};
