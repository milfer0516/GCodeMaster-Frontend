// src/components/ui/Modal.test.tsx
// El modal NUNCA crece más allá del viewport: la caja está acotada y SOLO el
// cuerpo se desplaza. Es la base del arreglo del flujo "Usar plantilla": con
// las listas expandidas, el contenido hace scroll dentro del modal en vez de
// empujar los botones de acción fuera de la pantalla.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Modal } from "./Modal";

describe("Modal — contención y scroll", () => {
  it("la caja está acotada al viewport y el cuerpo tiene overflow-y-auto", () => {
    render(
      <Modal open onClose={vi.fn()} title="Registrar utillaje" size="lg">
        <div>Contenido alto</div>
      </Modal>,
    );

    const cuerpo = screen.getByText("Contenido alto");
    expect(cuerpo.parentElement!.className).toContain("overflow-y-auto");

    // La caja del modal: max-h ligado al viewport y flex columna (cabecera
    // fija, cuerpo con scroll).
    const caja = screen.getByText("Registrar utillaje").closest("div")!
      .parentElement!;
    expect(caja.className).toMatch(/max-h-\[calc\(100vh-2rem\)\]/);
    expect(caja.className).toContain("flex-col");
  });

  it("no renderiza nada cuando está cerrado", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Oculto">
        <div>No se ve</div>
      </Modal>,
    );
    expect(screen.queryByText("No se ve")).toBeNull();
  });
});
