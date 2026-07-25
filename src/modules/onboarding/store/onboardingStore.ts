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

/**
 * Herramienta FÍSICA registrada (Tier 3 — /tooling/instancias).
 * La definición (familia, Ø, filos, material) viene del catálogo global;
 * `longitud_util_real_mm` es lo único que midió el operador.
 */
interface HerramientaFisica {
  id_herramienta_instancia: number;
  nombre: string;
  familia: string | null;
  diametro_mm: number | null;
  longitud_util_real_mm: number | null;
  estado: string;
}

interface OnboardingState {
  step: OnboardingStep;
  maquina: MaquinaSeleccionada | null;
  herramientas: HerramientaFisica[];

  setStep: (step: OnboardingStep) => void;
  setMaquina: (maquina: MaquinaSeleccionada) => void;
  /** Reemplaza la lista completa (sincronización con el backend). */
  setHerramientas: (herramientas: HerramientaFisica[]) => void;
  agregarHerramienta: (herramienta: HerramientaFisica) => void;
  quitarHerramienta: (idInstancia: number) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: "bienvenida",
  maquina: null,
  herramientas: [],

  setStep: (step) => set({ step }),
  setMaquina: (maquina) => set({ maquina }),
  setHerramientas: (herramientas) => set({ herramientas }),
  agregarHerramienta: (herramienta) =>
    set((state) => ({ herramientas: [...state.herramientas, herramienta] })),
  quitarHerramienta: (idInstancia) =>
    set((state) => ({
      herramientas: state.herramientas.filter(
        (h) => h.id_herramienta_instancia !== idInstancia,
      ),
    })),
  reset: () => set({ step: "bienvenida", maquina: null, herramientas: [] }),
}));
