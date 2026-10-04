// src/modules/cam/components/montaje/useSeccionesFlotantes.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PRESENTADOR de las secciones de Montaje: barra arriba + panel flotante sobre
// el visor. Devuelve los dos nodos para los slots del shell (LayoutPasoVisor:
// barraSuperior y superposicionVisor) y guarda el ÚNICO estado de presentación:
// qué sección está abierta (una a la vez; nada se abre solo al entrar).
//
//   · Abrir mueve el foco al panel; cerrar (X, Escape, mismo botón) lo devuelve
//     al botón de la sección.
//   · Entrar en el modo datum cierra el panel; salir de él no lo reabre.
//
// Cambiar la presentación (acordeón, barra, …) es cambiar ESTE archivo y sus
// dos piezas: las reglas (domain/montaje.ts) y el registro no se tocan.
// ─────────────────────────────────────────────────────────────────────────────
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCamStore } from "../../store/camStore";
import { seccionVisible } from "../../domain/montaje";
import { SECCIONES_MONTAJE } from "./seccionesMontaje";
import { useEstadoMontaje } from "./hooksMontaje";
import { BarraSecciones } from "./BarraSecciones";
import { PanelFlotanteSeccion } from "./PanelFlotanteSeccion";

// Hay una capa modal a pantalla completa abierta (p. ej. el modal de sujeción,
// en un portal sobre el body): el Escape es suyo, no del panel.
function hayCapaModal(): boolean {
  return document.querySelector(".fixed.inset-0") !== null;
}

export function useSeccionesFlotantes({ modoDatum }: { modoDatum: boolean }): {
  barra: ReactNode;
  panel: ReactNode;
} {
  const estado = useEstadoMontaje();
  const sellando = useCamStore((s) => s.estadoOrientacion === "sellando");
  const [abierta, setAbierta] = useState<string | null>(null);
  const botones = useRef(new Map<string, HTMLButtonElement>());
  const panelRef = useRef<HTMLDivElement>(null);
  // A qué botón devolver el foco cuando el panel se cierre.
  const devolverFocoA = useRef<string | null>(null);

  const refBoton = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) botones.current.set(id, el);
    else botones.current.delete(id);
  }, []);

  const cerrar = useCallback(() => setAbierta(null), []);
  const alternar = useCallback(
    (id: string) => setAbierta((actual) => (actual === id ? null : id)),
    [],
  );

  // Foco: entra al panel al abrir; vuelve al botón al cerrar.
  useEffect(() => {
    if (abierta) {
      devolverFocoA.current = abierta;
      panelRef.current?.focus();
    } else if (devolverFocoA.current) {
      botones.current.get(devolverFocoA.current)?.focus();
      devolverFocoA.current = null;
    }
  }, [abierta]);

  // El modo datum necesita el visor despejado: cierra el panel (no lo reabre).
  useEffect(() => {
    if (modoDatum) setAbierta(null);
  }, [modoDatum]);

  // Escape cierra: con el foco en el panel, o sin foco en ningún control (tras
  // tocar el visor). Nunca mientras haya una capa modal encima.
  useEffect(() => {
    if (!abierta) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || hayCapaModal()) return;
      const destino = e.target as Node | null;
      const enPanel = !!destino && !!panelRef.current?.contains(destino);
      const sinFoco =
        destino === document.body || destino === document.documentElement;
      if (enPanel || sinFoco) setAbierta(null);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierta]);

  const seccion = SECCIONES_MONTAJE.find(
    (s) => s.id === abierta && seccionVisible(s, estado),
  );

  const barra = (
    // Mientras el motor orienta la pieza, la barra también queda deshabilitada.
    <fieldset disabled={sellando} className="m-0 min-w-0 border-0 p-0">
      <BarraSecciones
        estado={estado}
        abierta={seccion?.id ?? null}
        onAbrir={alternar}
        refBoton={refBoton}
      />
    </fieldset>
  );

  const panel = seccion ? (
    <PanelFlotanteSeccion
      ref={panelRef}
      seccion={seccion}
      estado={estado}
      deshabilitado={sellando}
      onCerrar={cerrar}
    />
  ) : null;

  return { barra, panel };
}
