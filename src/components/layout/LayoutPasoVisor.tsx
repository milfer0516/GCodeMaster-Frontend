// src/components/layout/LayoutPasoVisor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT reutilizable "visor dominante + paneles plegables" — extraído de
// StepMontaje SIN cambiar su aspecto. El paso solo aporta el CONTENIDO (el visor,
// los controles de cada panel y la navegación); este componente aporta el MARCO:
//
//   ┌───────────────────────────────────────────────┐
//   │ encabezado …                    [☰ panel](móvil)│
//   ├──────────────────────────────┬────────────────┤
//   │                              │  ▾ Panel (☰)    │
//   │        visorContent          │   contenido…    │  ← aside(s) a la DERECHA
//   │     (se expande al plegar)   │                 │
//   ├──────────────────────────────┴────────────────┤
//   │ navegación (Atrás / Siguiente)                 │  ← barra inferior sticky
//   └───────────────────────────────────────────────┘
//
// Soporta N paneles (todos a la derecha), cada uno con su propio pestillo ☰:
//   · Escritorio: plegar un panel lo oculta (lg:hidden) y el visor se ENSANCHA a
//     la anchura liberada; un botón flotante ☰ lo restaura.
//   · Estrecho: cada panel es un cajón `fixed` que se desliza desde la derecha
//     SOBRE el visor (no redimensiona el canvas ⇒ el picking no se desincroniza).
//
// Con UN panel abierto reproduce EXACTAMENTE el layout previo de Montaje
// (visor lg:w-[72%] + panel lg:w-[28%]); plegado ⇒ visor lg:w-full.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, type ReactNode } from "react";
import { Menu, SlidersHorizontal, X } from "lucide-react";

export interface PanelPaso {
  id: string;
  /** Título del panel (cabecera de escritorio + disparador móvil). */
  titulo: string;
  /** Controles del panel (para Montaje: los Collapsibles ya existentes). */
  contenido: ReactNode;
  /** Escritorio: el panel arranca desplegado (no plegado). Por defecto true. */
  abiertoInicial?: boolean;
  /** Cabecera del cajón móvil; por defecto = titulo. Permite reproducir textos
   *  literales previos (Montaje: "Controles de montaje") sin cambiar el resto. */
  tituloMovil?: string;
}

interface Props {
  /** Lo que se renderiza dentro del área del visor (p.ej. <CamViewer3D … />). */
  visorContent: ReactNode;
  /** Paneles de la derecha. Uno para Montaje hoy; la forma ya admite varios. */
  paneles: PanelPaso[];
  /** Slot de navegación inferior (p.ej. <WizardNavButtons … />). Se envuelve en
   *  la barra sticky; se pasa como nodo para conservar su markup/behaviour EXACTO. */
  navegacion?: ReactNode;
  /** Bloque de título/descripción del paso, a la izquierda de los disparadores. */
  encabezado?: ReactNode;
}

// Anchura de escritorio del visor según cuántos paneles quedan ABIERTOS (cada
// panel abierto ocupa lg:w-[28%]). Clases LITERALES para que las detecte Tailwind.
// 1 abierto ⇒ 72% (idéntico a Montaje); 0 ⇒ full.
const ANCHO_VISOR_LG: Record<number, string> = {
  0: "lg:w-full",
  1: "lg:w-[72%]",
  2: "lg:w-[44%]",
  3: "lg:w-[16%]",
};

export function LayoutPasoVisor({
  visorContent,
  paneles,
  navegacion,
  encabezado,
}: Props) {
  // Estado de LAYOUT por panel (no toca ningún dato del paso):
  //   colapsado  → plegado en escritorio.
  //   drawer     → cajón abierto en pantallas estrechas.
  const [colapsado, setColapsado] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(paneles.map((p) => [p.id, !(p.abiertoInicial ?? true)])),
  );
  const [drawer, setDrawer] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(paneles.map((p) => [p.id, false])),
  );

  const colapsar = (id: string) =>
    setColapsado((s) => ({ ...s, [id]: true }));
  const expandir = (id: string) =>
    setColapsado((s) => ({ ...s, [id]: false }));
  const abrirDrawer = (id: string) =>
    setDrawer((s) => ({ ...s, [id]: true }));
  const cerrarDrawer = (id: string) =>
    setDrawer((s) => ({ ...s, [id]: false }));
  const cerrarTodosDrawers = () =>
    setDrawer(Object.fromEntries(paneles.map((p) => [p.id, false])));

  const abiertos = paneles.filter((p) => !colapsado[p.id]).length;
  const panelesColapsados = paneles.filter((p) => colapsado[p.id]);
  const algunDrawerAbierto = paneles.some((p) => drawer[p.id]);
  const anchoVisor = ANCHO_VISOR_LG[abiertos] ?? "lg:w-[16%]";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Cabecera: encabezado del paso + disparadores de cajón (móvil) ── */}
      {(encabezado || paneles.length > 0) && (
        <div className="flex items-start justify-between gap-3">
          {encabezado}
          {paneles.length > 0 && (
            <div className="flex shrink-0 gap-2 lg:hidden">
              {paneles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => abrirDrawer(p.id)}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {p.titulo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Fila principal: visor dominante + panel(es) lateral(es) ── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-16rem)] lg:min-h-[520px]">
        {/* Visor — el contenedor solo le da tamaño; el contenido reacciona a su
            tamaño (ResizeObserver). Ancho: se ensancha según se plieguen paneles. */}
        <div
          className={`relative w-full h-[55vh] min-h-[360px] lg:h-full rounded-xl overflow-hidden border border-border ${anchoVisor}`}
        >
          {visorContent}

          {/* Reabrir paneles plegados (solo escritorio) */}
          {panelesColapsados.length > 0 && (
            <div className="hidden lg:flex absolute top-3 right-3 z-20 flex-col gap-2">
              {panelesColapsados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => expandir(p.id)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-bg-surface/90 px-3.5 py-2.5 text-sm text-text-muted shadow-soft backdrop-blur transition hover:border-accent-blue/50 hover:text-text-primary"
                  aria-label={`Mostrar ${p.titulo}`}
                  title={`Mostrar ${p.titulo}`}
                >
                  <Menu className="h-6 w-6" />
                  {p.titulo}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Backdrop del cajón (solo pantallas estrechas) */}
        {algunDrawerAbierto && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={cerrarTodosDrawers}
          />
        )}

        {/* Panel(es). En escritorio, columna fija en el flujo; en pantallas
            estrechas, cajón fixed que se desliza desde la derecha SOBRE el visor. */}
        {paneles.map((p) => (
          <aside
            key={p.id}
            className={`fixed inset-y-0 right-0 z-40 flex w-[86%] max-w-sm transform flex-col bg-bg-surface shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[28%] lg:max-w-none lg:transform-none lg:translate-x-0 lg:bg-transparent lg:shadow-none ${
              drawer[p.id] ? "translate-x-0" : "translate-x-full"
            } ${colapsado[p.id] ? "lg:hidden" : ""}`}
          >
            {/* Encabezado del cajón (solo pantallas estrechas) */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
              <span className="text-sm font-semibold text-text-primary">
                {p.tituloMovil ?? p.titulo}
              </span>
              <button
                type="button"
                onClick={() => cerrarDrawer(p.id)}
                className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
                aria-label={`Cerrar ${p.titulo}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cabecera del panel (solo escritorio): plegar y expandir el visor */}
            <div className="hidden lg:flex items-center justify-between px-1 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                {p.titulo}
              </span>
              <button
                type="button"
                onClick={() => colapsar(p.id)}
                className="rounded-lg p-2.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
                aria-label={`Colapsar ${p.titulo}`}
                title="Colapsar panel"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>

            {/* Contenido con scroll (el paso aporta los controles) */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 lg:p-0 lg:pr-1">
              {p.contenido}
            </div>
          </aside>
        ))}
      </div>

      {/* ── Navegación fija abajo ── */}
      {navegacion && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg-surface/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
          {navegacion}
        </div>
      )}
    </div>
  );
}
