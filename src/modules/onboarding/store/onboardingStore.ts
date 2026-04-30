import { create } from "zustand";

export type OnboardingStep =
  | "bienvenida"
  | "maquina"
  | "herramientas"
  | "confirmacion";

interface MaquinaSeleccionada {
  id_maquina: number;
  nombre: string;
  marca: string;
  modelo: string;
}

interface HerramientaAgregada {
  id_herramienta: number;
  nombre: string;
  tipo: string;
  diametro_mm: number;
}

interface OnboardingState {
  step: OnboardingStep;
  maquina: MaquinaSeleccionada | null;
  herramientas: HerramientaAgregada[];

  setStep: (step: OnboardingStep) => void;
  setMaquina: (maquina: MaquinaSeleccionada) => void;
  agregarHerramienta: (herramienta: HerramientaAgregada) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: "bienvenida",
  maquina: null,
  herramientas: [],

  setStep: (step) => set({ step }),
  setMaquina: (maquina) => set({ maquina }),
  agregarHerramienta: (herramienta) =>
    set((state) => ({ herramientas: [...state.herramientas, herramienta] })),
  reset: () => set({ step: "bienvenida", maquina: null, herramientas: [] }),
}));
