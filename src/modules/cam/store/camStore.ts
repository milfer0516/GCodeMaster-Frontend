// src/modules/cam/store/camStore.ts
import { create } from "zustand";

export type CamStep =
  | "cargar"
  | "analisis"
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

  // Paso 3 — Operaciones
  operaciones: Operacion[];

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
  setOperaciones: (ops: Operacion[]) => void;
  toggleOperacion: (id: string) => void;
  setMaterial: (material: MaterialSeleccionado) => void;
  setStockConfig: (config: StockConfig) => void;
  setDatumConfig: (config: DatumConfig) => void;
  setOrdenSetups: (orden: string) => void;
  setGcodeSetups: (setups: SetupResultado[]) => void;
  reset: () => void;
}

const STOCK_INICIAL: StockConfig = {
  tipo: "por_cara",
  z_superior_mm: 1.0,
  z_inferior_mm: 1.0,
};

const DATUM_INICIAL: DatumConfig = { x: 0, y: 0, z: 0 };

export const useCamStore = create<CamState>((set) => ({
  step: "cargar",
  archivo: null,
  nombreArchivo: "",
  idJob: null,
  analisis: null,
  operaciones: [],
  material: null,
  stockConfig: STOCK_INICIAL,
  datumConfig: DATUM_INICIAL,
  ordenSetups: "superior_primero",
  gcodeSetups: [],

  setStep: (step) => set({ step }),
  setArchivo: (archivo) => set({ archivo, nombreArchivo: archivo.name }),
  setAnalisis: (idJob, analisis) => set({ idJob, analisis }),
  setOperaciones: (operaciones) => set({ operaciones }),
  toggleOperacion: (id) =>
    set((state) => ({
      operaciones: state.operaciones.map((op) =>
        op.id === id ? { ...op, seleccionada: !op.seleccionada } : op,
      ),
    })),
  setMaterial: (material) => set({ material }),
  setStockConfig: (stockConfig) => set({ stockConfig }),
  setDatumConfig: (datumConfig) => set({ datumConfig }),
  setOrdenSetups: (ordenSetups) => set({ ordenSetups }),
  setGcodeSetups: (gcodeSetups) => set({ gcodeSetups }),
  reset: () =>
    set({
      step: "cargar",
      archivo: null,
      nombreArchivo: "",
      idJob: null,
      analisis: null,
      operaciones: [],
      material: null,
      stockConfig: STOCK_INICIAL,
      datumConfig: DATUM_INICIAL,
      ordenSetups: "superior_primero",
      gcodeSetups: [],
    }),
}));
