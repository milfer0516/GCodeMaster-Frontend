// src/modules/cam/components/cero/contextoModoDatum.ts
// ─────────────────────────────────────────────────────────────────────────────
// Modo datum: estado LOCAL de la pantalla que aloja el cero de pieza (no del
// store). Lo comparten el visor y la sección "Cero de pieza". Al salir del paso
// se pierde.
//
// El paso anfitrión lo PROVEE; la sección lo lee con useModoDatum() sin
// importar el paso.
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface ModoDatum {
  modoDatum: boolean;
  setModoDatum: Dispatch<SetStateAction<boolean>>;
}

export const ContextoModoDatum = createContext<ModoDatum | null>(null);

export function useModoDatum(): ModoDatum {
  const ctx = useContext(ContextoModoDatum);
  if (!ctx)
    throw new Error(
      "useModoDatum: falta ContextoModoDatum en el paso anfitrión.",
    );
  return ctx;
}
