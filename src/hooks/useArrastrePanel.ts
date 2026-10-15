// src/hooks/useArrastrePanel.ts
// ─────────────────────────────────────────────────────────────────────────────
// Arrastre genérico de un panel por un asa (Pointer Events). Solo calcula el
// desplazamiento: quien lo usa lo aplica como transform y reparte las props del
// asa. No sabe nada de secciones ni de minimizar.
//
//   · Un pointerdown que empieza en un control (botón, enlace, campo) no
//     arrastra: el control conserva su clic.
//   · El panel nunca sale de los límites (por defecto, la ventana visible):
//     se reacota al arrastrar, al cambiar el tamaño del panel o de los límites
//     y al hacer scroll o redimensionar la ventana.
// ─────────────────────────────────────────────────────────────────────────────
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export interface Desplazamiento {
  x: number;
  y: number;
}

export type PropsAsaArrastre = Pick<
  HTMLAttributes<HTMLElement>,
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "onLostPointerCapture"
  | "className"
>;

const ORIGEN: Desplazamiento = { x: 0, y: 0 };
const NO_ARRASTRA = "button, a, input, select, textarea";

interface Limites {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function limitesDe(limitesRef?: RefObject<HTMLElement>): Limites {
  const el = limitesRef?.current;
  if (el) return el.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  return { left: 0, top: 0, right: clientWidth, bottom: clientHeight };
}

// Si el panel no cabe, gana el borde inicial (arriba/izquierda): el asa queda
// a la vista.
function acotar(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(valor, max));
}

export function useArrastrePanel(
  panelRef: RefObject<HTMLElement>,
  limitesRef?: RefObject<HTMLElement>,
): {
  desplazamiento: Desplazamiento;
  propsAsa: PropsAsaArrastre;
  reiniciar: () => void;
} {
  const [desplazamiento, setDesplazamiento] = useState<Desplazamiento>(ORIGEN);
  // El desplazamiento ya pintado: el rect medido lo incluye.
  const aplicado = useRef<Desplazamiento>(ORIGEN);
  const arrastre = useRef<{
    pointerId: number;
    inicioX: number;
    inicioY: number;
    base: Desplazamiento;
  } | null>(null);

  useLayoutEffect(() => {
    aplicado.current = desplazamiento;
  }, [desplazamiento]);

  const mover = useCallback(
    (deseado: Desplazamiento) => {
      const panel = panelRef.current;
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      const a = aplicado.current;
      const l = limitesDe(limitesRef);
      const x = acotar(
        deseado.x,
        l.left - (r.left - a.x),
        l.right - (r.right - a.x),
      );
      const y = acotar(
        deseado.y,
        l.top - (r.top - a.y),
        l.bottom - (r.bottom - a.y),
      );
      setDesplazamiento((prev) =>
        prev.x === x && prev.y === y ? prev : { x, y },
      );
    },
    [panelRef, limitesRef],
  );

  // Reacotar cuando cambia el tamaño del panel (p. ej. al minimizarlo), el de
  // los límites, o la ventana se redimensiona o hace scroll. En un frame
  // aparte: los demás oyentes del mismo evento (quien reubica el panel) ya
  // corrieron.
  useEffect(() => {
    let frame = 0;
    const reacotar = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => mover(aplicado.current));
    };
    const observador = new ResizeObserver(reacotar);
    if (panelRef.current) observador.observe(panelRef.current);
    if (limitesRef?.current) observador.observe(limitesRef.current);
    window.addEventListener("resize", reacotar);
    window.addEventListener("scroll", reacotar, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observador.disconnect();
      window.removeEventListener("resize", reacotar);
      window.removeEventListener("scroll", reacotar, { capture: true });
    };
  }, [mover, panelRef, limitesRef]);

  const terminar = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (arrastre.current?.pointerId !== e.pointerId) return;
    arrastre.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
  }, []);

  const reiniciar = useCallback(() => {
    arrastre.current = null;
    setDesplazamiento(ORIGEN);
  }, []);

  const propsAsa: PropsAsaArrastre = {
    className: "touch-none select-none",
    onPointerDown: (e) => {
      if (e.button !== 0 || arrastre.current) return;
      if (e.target instanceof Element && e.target.closest(NO_ARRASTRA)) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      arrastre.current = {
        pointerId: e.pointerId,
        inicioX: e.clientX,
        inicioY: e.clientY,
        base: aplicado.current,
      };
    },
    onPointerMove: (e) => {
      const a = arrastre.current;
      if (!a || a.pointerId !== e.pointerId) return;
      mover({
        x: a.base.x + e.clientX - a.inicioX,
        y: a.base.y + e.clientY - a.inicioY,
      });
    },
    onPointerUp: terminar,
    onPointerCancel: terminar,
    onLostPointerCapture: terminar,
  };

  return { desplazamiento, propsAsa, reiniciar };
}
