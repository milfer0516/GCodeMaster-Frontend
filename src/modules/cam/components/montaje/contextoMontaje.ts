// src/modules/cam/components/montaje/contextoMontaje.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lo que es estado LOCAL de la pantalla Montaje (no del store) y alguna sección
// necesita. Hoy solo el modo datum: lo comparten el visor (StepMontaje) y las
// secciones "Cara de apoyo" y "Cero y corrector". Al salir del paso se pierde.
//
// StepMontaje lo PROVEE; las secciones lo leen con useModoDatum() sin importar
// StepMontaje.
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface ContextoMontaje {
  modoDatum: boolean;
  setModoDatum: Dispatch<SetStateAction<boolean>>;
}

export const ContextoMontajeLocal = createContext<ContextoMontaje | null>(null);

export function useModoDatum(): ContextoMontaje {
  const ctx = useContext(ContextoMontajeLocal);
  if (!ctx)
    throw new Error("useModoDatum: falta ContextoMontajeLocal (StepMontaje).");
  return ctx;
}
