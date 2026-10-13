// src/modules/cam/components/montaje/BarraSecciones.test.tsx
// La pestaña de cada sección comunica su estado con relleno + icono + texto
// sr-only (nunca solo color), y la sección abierta lleva el anillo con
// separación. Renderiza la barra REAL con las reglas REALES (domain/montaje.ts):
// el estado de cada pestaña sale de estadoDeSeccion, no de un mock.
//
// jsdom no calcula estilos ni layout: este test NO verifica el contraste (ni en
// tema claro ni en oscuro) ni que el anillo no quede recortado. Solo verifica
// qué clases y textos recibe cada pestaña.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { EstadoMontaje } from "../../domain/montaje";
import { BarraSecciones } from "./BarraSecciones";

// Una sección por estado con las reglas reales:
//   "¿Cómo llega la pieza?" → pendiente (sin responder)
//   "Cara de apoyo"         → completa (cara sellada)
//   "Notas de montaje"      → opcional
// (sin máquina, "Colocación en la mesa" no se muestra).
const ESTADO: EstadoMontaje = {
  estadoPieza: null,
  forma: null,
  faceIdApoyo: 3,
  caraSellada: true,
  nombreUtillaje: null,
  alturaInferiorMm: null,
  alturaSuperiorMm: null,
  alturaAmarreMm: null,
  hayMaquina: false,
  elementosColocados: null,
  notas: "",
};

const ANILLO_ACTIVA = [
  "ring-2",
  "ring-accent-blue",
  "ring-offset-2",
  "ring-offset-bg-surface",
];

function renderBarra(abierta: string | null) {
  return render(
    <BarraSecciones
      estado={ESTADO}
      abierta={abierta}
      onAbrir={vi.fn()}
      refBoton={vi.fn()}
    />,
  );
}

const pestana = (titulo: RegExp) => screen.getByRole("button", { name: titulo });

describe("BarraSecciones — estado de cada pestaña", () => {
  it("pendiente: relleno ámbar, texto negro, icono de alerta y texto sr-only", () => {
    renderBarra(null);
    const boton = pestana(/¿Cómo llega la pieza\?/);
    expect(boton.querySelector(".sr-only")?.textContent).toBe("Pendiente:");
    expect(boton.className).toContain("bg-accent-amber");
    expect(boton.className).toContain("border-accent-amber");
    expect(boton.className).toContain("text-black");
    expect(boton.className).not.toContain("bg-accent-green");
    expect(boton.querySelector("svg.lucide-circle-alert")).not.toBeNull();
  });

  it("completa: relleno verde, texto negro, icono de check y texto sr-only", () => {
    renderBarra(null);
    const boton = pestana(/Cara de apoyo/);
    expect(boton.querySelector(".sr-only")?.textContent).toBe("Completa:");
    expect(boton.className).toContain("bg-accent-green");
    expect(boton.className).toContain("border-accent-green");
    expect(boton.className).toContain("text-black");
    expect(boton.className).not.toContain("bg-accent-amber");
    expect(boton.querySelector("svg.lucide-circle-check")).not.toBeNull();
  });

  it("opcional: neutra, sin relleno verde ni ámbar", () => {
    renderBarra(null);
    const boton = pestana(/Notas de montaje/);
    expect(boton.querySelector(".sr-only")?.textContent).toBe("Opcional:");
    expect(boton.className).toContain("bg-bg-primary");
    expect(boton.className).toContain("text-text-muted");
    expect(boton.className).not.toContain("bg-accent-green");
    expect(boton.className).not.toContain("bg-accent-amber");
    expect(boton.className).not.toContain("text-black");
  });

  it("solo la pestaña abierta lleva el anillo con separación, en cualquier estado", () => {
    for (const [id, titulo] of [
      ["llegada", /¿Cómo llega la pieza\?/],
      ["cara-apoyo", /Cara de apoyo/],
      ["notas", /Notas de montaje/],
    ] as const) {
      const { unmount } = renderBarra(id);
      const activa = pestana(titulo);
      for (const clase of ANILLO_ACTIVA) expect(activa.className).toContain(clase);
      expect(activa.getAttribute("aria-expanded")).toBe("true");
      const otras = screen
        .getAllByRole("button")
        .filter((b) => b !== activa);
      for (const b of otras) expect(b.className).not.toContain("ring-2");
      unmount();
    }
  });

  it("todas las pestañas tienen contorno de foco propio, distinto del anillo", () => {
    renderBarra(null);
    for (const b of screen.getAllByRole("button")) {
      expect(b.className).toContain("focus-visible:outline-2");
      expect(b.className).toContain("focus-visible:outline-offset-2");
      expect(b.className).toContain("focus-visible:outline-text-primary");
    }
  });

  it("la barra conserva el arreglo del desborde y el hueco para el anillo", () => {
    renderBarra(null);
    const nav = screen.getByRole("navigation", { name: "Secciones de montaje" });
    expect(nav.className).toContain("relative");
    expect(nav.className).toContain("overflow-x-auto");
    expect(nav.className).toContain("overscroll-x-contain");
    const interior = nav.firstElementChild as HTMLElement;
    expect(interior.className).toContain("w-max");
    expect(interior.className).toContain("p-1");
  });
});
