// src/routes/inventarioRutas.test.tsx
// La pantalla de inventario SUSTITUYE a la antigua página separada de
// utillajes: la ruta /utillajes y su entrada de menú ya no existen; herramientas
// y utillajes viven juntos bajo la entrada "Herramientas" de siempre.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Sidebar } from "../components/layout/Sidebar";

const raiz = process.cwd();

describe("Integración del inventario — rutas y menú", () => {
  it("la ruta /utillajes ya no existe en el router", () => {
    const src = readFileSync(`${raiz}/src/routes/index.tsx`, "utf8");
    expect(src).not.toContain('"/utillajes"');
    expect(src).not.toContain("UtillajesPage");
    // Herramientas sigue siendo la entrada del inventario
    expect(src).toContain('path="/herramientas"');
  });

  it("la página separada de utillajes ya no existe", () => {
    const dir = readdirSync(`${raiz}/src/modules/utillajes`);
    expect(dir).not.toContain("UtillajesPage.tsx");
  });

  it("el sidebar no tiene una entrada separada de Utillajes", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Utillajes")).toBeNull();
    expect(screen.queryByText("Utillajes de amarre")).toBeNull();
    // La entrada del inventario es la de herramientas (existe el enlace)
    const src = readFileSync(`${raiz}/src/components/layout/Sidebar.tsx`, "utf8");
    expect(src).toContain('/herramientas');
    expect(src).not.toContain('/utillajes');
  });
});
