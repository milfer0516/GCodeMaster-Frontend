// src/lib/viewer3d/Viewer3D.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 1 · Envoltura React MÍNIMA del visor genérico (createViewer.ts).
//
// Su única responsabilidad es ciclo de vida: montar el visor en un <div>,
// entregarle el objeto que recibe por props y destruirlo al desmontar. Ninguna
// lógica de dominio vive aquí: el objeto llega ya construido desde la CAPA 2.
//
// `claveEncuadre` existe para que la cámara NO salte mientras el operador
// teclea: el contenido se reemplaza en cada cambio de parámetro, pero solo se
// reencuadra cuando cambia esa clave (p. ej. la familia de la herramienta).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { createViewer, type OpcionesVisor, type VisorHandle } from "./createViewer";

interface Props {
  /** Objeto a mostrar. El visor pasa a ser su dueño (lo libera al cambiar). */
  objeto: THREE.Object3D | null;
  opciones?: OpcionesVisor;
  /** Al cambiar de valor se reencuadra la cámara. */
  claveEncuadre?: string | number;
  className?: string;
  /** Capa HTML sobre el canvas (etiquetas, ayudas). */
  children?: React.ReactNode;
}

export function Viewer3D({
  objeto,
  opciones,
  claveEncuadre,
  className = "",
  children,
}: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const visorRef = useRef<VisorHandle | null>(null);
  const claveEncuadradaRef = useRef<string | number | undefined>(undefined);

  // Las opciones se congelan en el primer render: reconstruir el visor en cada
  // render por un objeto literal nuevo tiraría el canvas y la cámara.
  const opcionesRef = useRef(opciones);

  useEffect(() => {
    if (!contenedorRef.current) return;
    const visor = createViewer(contenedorRef.current, opcionesRef.current);
    visorRef.current = visor;
    return () => {
      visor.destruir();
      visorRef.current = null;
      claveEncuadradaRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;

    visor.setContenido(objeto);

    // Primer contenido o cambio de clave → reencuadrar (cámara, distancia y
    // target). En los demás cambios se respeta la órbita que el operador haya
    // puesto: solo se RECENTRA, porque al editar cotas el centro de la caja
    // envolvente se mueve y sin esto la pieza se descuadra del canvas.
    const debeEncuadrar =
      objeto !== null && claveEncuadradaRef.current !== claveEncuadre;
    if (debeEncuadrar) {
      visor.encuadrar();
      claveEncuadradaRef.current = claveEncuadre;
    } else {
      visor.recentrar();
    }
  }, [objeto, claveEncuadre]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div
        ref={contenedorRef}
        className="h-full w-full overflow-hidden"
        style={{ cursor: "grab" }}
      />
      {children}
    </div>
  );
}
