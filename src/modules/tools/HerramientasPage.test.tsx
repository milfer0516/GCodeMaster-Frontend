// src/modules/tools/HerramientasPage.test.tsx
// La pantalla de INVENTARIO (diseño "GCodeMaster inventario.html"): dos
// secciones (Herramientas azul + Utillajes verde), lado a lado en ancho y
// apiladas en estrecho, todo a tokens del tema.
// Sin red ni backend: se mockean las dos capas de servicio y los modales
// pesados (formulario / preview 3D de herramientas).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("../../services/toolingService", () => ({
  getInstancias: vi.fn(),
  getLibreria: vi.fn(),
  actualizarInstancia: vi.fn(),
  eliminarInstancia: vi.fn(),
  familiaLabel: (f?: string | null) => f ?? "Sin familia",
  mensajeError: (_e: unknown, fallback: string) => fallback,
  ESTADOS_INSTANCIA: ["disponible", "en_mantenimiento", "retirada"],
  ESTADO_LABEL: {
    disponible: "Disponible",
    en_mantenimiento: "En mantenimiento",
    retirada: "Retirada",
  },
}));

vi.mock("../cam/services/utillajesService", () => ({
  getUtillajes: vi.fn(),
  getFamiliasUtillaje: vi.fn(),
  getFamiliaSchema: vi.fn(),
  getCatalogoGlobal: vi.fn(),
  crearUtillajeManual: vi.fn(),
  crearUtillajeDesdePlantilla: vi.fn(),
}));

// Modales pesados de herramientas: fuera del alcance del diseño (y three.js
// no vive en jsdom).
vi.mock("./components/AgregarHerramientaModal", () => ({
  AgregarHerramientaModal: () => null,
}));
vi.mock("./components/HerramientaForm", () => ({ HerramientaForm: () => null }));
vi.mock("./components/HerramientaPreview3D", () => ({
  HerramientaPreview3D: () => null,
}));

import { getInstancias, getLibreria } from "../../services/toolingService";
import {
  getUtillajes,
  getFamiliasUtillaje,
  getCatalogoGlobal,
} from "../cam/services/utillajesService";
import { HerramientasPage } from "./HerramientasPage";

const getInstanciasMock = vi.mocked(getInstancias);
const getLibreriaMock = vi.mocked(getLibreria);
const getUtillajesMock = vi.mocked(getUtillajes);
const getFamiliasUtillajeMock = vi.mocked(getFamiliasUtillaje);
const getCatalogoGlobalMock = vi.mocked(getCatalogoGlobal);

const INSTANCIAS = [
  {
    id_herramienta_instancia: 1,
    id_herramienta_libreria: 10,
    nombre: "Broca HSS-Co 5×D",
    familia: "broca",
    codigo_interno: "BR-085",
    diametro_mm: 8.5,
    longitud_util_real_mm: 42,
    posicion_carrusel: 3,
    portaherramienta_real: "BT40-ER32",
    material: "HSS-Co",
    estado: "disponible",
  },
  {
    id_herramienta_instancia: 2,
    id_herramienta_libreria: 11,
    nombre: "Fresa plana 4 filos",
    familia: "fresa_punta_plana",
    codigo_interno: "FR-100",
    diametro_mm: 10,
    longitud_util_real_mm: null,
    posicion_carrusel: null,
    portaherramienta_real: null,
    material: "Carburo",
    estado: "en_mantenimiento",
  },
];

const UTILLAJE = {
  id_utillaje: 9,
  id_utillaje_global: 42,
  nombre: "Prensa mecánica de precisión",
  familia: "prensa",
  parametros: { ancho_mordazas_mm: 125 },
  notas: null,
  fecha_registro: "2026-09-18T00:00:00",
  activo: true,
};

function mockServicios() {
  getInstanciasMock.mockResolvedValue(INSTANCIAS as never);
  getLibreriaMock.mockResolvedValue([] as never);
  getUtillajesMock.mockResolvedValue([UTILLAJE]);
  getFamiliasUtillajeMock.mockResolvedValue([
    { familia: "prensa", etiqueta: "Prensa / mordaza de maquina", descripcion: "" },
  ]);
  getCatalogoGlobalMock.mockResolvedValue({
    total: 7,
    catalogo: [],
    advertencia_general: "",
  });
}

describe("HerramientasPage — inventario de dos secciones (diseño)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServicios();
  });
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it("renderiza las DOS secciones con su cabecera, conteo y buscador propio", async () => {
    render(<HerramientasPage />);

    expect(await screen.findByText("Herramientas")).toBeTruthy();
    expect(screen.getByText("2 en el taller")).toBeTruthy();
    expect(screen.getByText("Utillajes de amarre")).toBeTruthy();
    expect(screen.getByText("1 en el parque")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Buscar por nombre o código"),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Buscar utillaje o referencia"),
    ).toBeTruthy();

    // Acordeones por familia en AMBAS secciones
    expect(screen.getByText("broca")).toBeTruthy();
    expect(screen.getByText("Prensa / mordaza de maquina")).toBeTruthy();
    expect(screen.getByText("Broca HSS-Co 5×D")).toBeTruthy();
    expect(screen.getByText("Prensa mecánica de precisión")).toBeTruthy();
  });

  it("RESPONSIVE: apilado en estrecho (base) y lado a lado desde 900px, con divisor solo en ancho", async () => {
    render(<HerramientasPage />);
    await screen.findByText("Herramientas");

    const wrap = screen.getByTestId("inventario-wrap");
    // Mobile-first: columna por defecto…
    expect(wrap.className).toContain("flex-col");
    // …y fila (lado a lado) a partir del breakpoint del diseño (900px)
    expect(wrap.className).toContain("min-[900px]:flex-row");
    // Scroll independiente por columna en ancho
    const seccionT = screen.getByTestId("seccion-herramientas");
    const seccionU = screen.getByTestId("seccion-utillajes");
    expect(seccionT.className).toContain("min-[900px]:overflow-y-auto");
    expect(seccionU.className).toContain("min-[900px]:overflow-y-auto");
    // Divisor central solo en ancho; en estrecho la segunda sección lleva border-t
    const divider = screen.getByTestId("inventario-divider");
    expect(divider.className).toContain("hidden");
    expect(divider.className).toContain("min-[900px]:block");
    expect(seccionU.className).toContain("border-t");
    expect(seccionU.className).toContain("min-[900px]:border-t-0");
  });

  it("la búsqueda de herramientas filtra en vivo (código, Ø, nombre)", async () => {
    render(<HerramientasPage />);
    await screen.findByText("Broca HSS-Co 5×D");

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o código"), {
      target: { value: "BR-085" },
    });
    expect(screen.queryByText("Broca HSS-Co 5×D")).toBeTruthy();
    expect(screen.queryByText("Fresa plana 4 filos")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o código"), {
      target: { value: "10" }, // Ø10 → encuentra la fresa (normaliza Ø)
    });
    expect(screen.queryByText("Fresa plana 4 filos")).toBeTruthy();
    expect(screen.queryByText("Broca HSS-Co 5×D")).toBeNull();
  });

  it("cada fila muestra insignia y TRES iconos directos (Ver / Editar / Eliminar), sin menú kebab", async () => {
    render(<HerramientasPage />);
    const fila = (await screen.findByText("Broca HSS-Co 5×D")).closest(
      ".border-t",
    ) as HTMLElement;

    expect(screen.getAllByText("Disponible").length).toBeGreaterThan(0);
    expect(screen.getByText("En mantenimiento")).toBeTruthy();

    // Los tres botones-icono están a la vista en la propia fila…
    const ver = within(fila).getByLabelText("Ver");
    const editar = within(fila).getByLabelText("Editar");
    const eliminar = within(fila).getByLabelText("Eliminar");
    // …y ya NO existe el botón kebab "Acciones de …"
    expect(
      screen.queryByLabelText("Acciones de Broca HSS-Co 5×D"),
    ).toBeNull();

    // Cada icono dispara el MISMO handler que antes llamaba el menú:
    // ver → ficha, editar → mismo formulario en modo edición, eliminar → retirar
    fireEvent.click(ver);
    expect(screen.getByText("Ficha de la herramienta")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Cerrar"));

    fireEvent.click(editar);
    expect(screen.getByText("Editar herramienta física")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Cerrar"));

    fireEvent.click(eliminar);
    expect(screen.getByText("¿Retirar esta herramienta?")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancelar"));
  });

  it("las filas de utillajes también muestran su acción como icono directo (Ver)", async () => {
    render(<HerramientasPage />);
    const fila = (
      await screen.findByText("Prensa mecánica de precisión")
    ).closest(".border-t") as HTMLElement;

    // Icono directo, sin kebab; al pulsarlo se despliega el detalle bajo la fila
    fireEvent.click(within(fila).getByLabelText("Ver"));
    expect(screen.getByText("ancho_mordazas_mm: 125")).toBeTruthy();
    expect(screen.queryByLabelText(/Acciones de /)).toBeNull();
  });

  it.each(["dark", "light"])(
    "renderiza correcto en modo %s (mismo markup, colores por token)",
    async (tema) => {
      if (tema === "light") document.documentElement.dataset.theme = "light";
      render(<HerramientasPage />);
      expect(await screen.findByText("Herramientas")).toBeTruthy();
      expect(screen.getByText("Utillajes de amarre")).toBeTruthy();
      // Los acentos salen de los tokens, no de hex del diseño
      const frame = screen.getByTestId("inventario-frame");
      expect(frame.className).toContain("bg-bg-primary");
      expect(frame.className).toContain("border-border");
    },
  );
});

// ── GARANTÍA DE TEMA: ningún color hardcodeado del diseño se cuela ──────────
// El diseño HTML traía ~27 hex DARK-ONLY. Estos componentes solo pueden usar
// clases de tokens (bg-bg-*, text-text-*, accent-*, border-border) — el toggle
// data-theme hace el resto.
describe("Inventario — colores solo por tokens del tema", () => {
  const ARCHIVOS = [
    "src/modules/tools/HerramientasPage.tsx",
    "src/modules/tools/components/inventario/SeccionInventario.tsx",
    "src/modules/tools/components/inventario/CajaBusqueda.tsx",
    "src/modules/tools/components/inventario/AcordeonFamilia.tsx",
    "src/modules/tools/components/inventario/FilaItem.tsx",
    "src/modules/utillajes/components/SeccionUtillajes.tsx",
  ];

  const raiz = process.cwd();

  for (const rel of ARCHIVOS) {
    it(`${rel} no contiene hex ni paleta Tailwind fija`, () => {
      // Se escanea solo el CÓDIGO: los comentarios de cabecera documentan la
      // correspondencia diseño→token y citan los hex originales a propósito.
      const src = readFileSync(join(raiz, rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)\/\/.*$/gm, "$1");
      // Sin hex tipo #4a86f5 / #fff
      expect(src.match(/#[0-9a-fA-F]{3,8}\b/)).toBeNull();
      // Sin paleta fija de Tailwind (gray-800, slate-900, emerald-500…):
      // rompería el toggle claro/oscuro igual que un hex.
      expect(
        src.match(
          /\b(bg|text|border|from|to|via|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d/,
        ),
      ).toBeNull();
      // Y sí usa los tokens del tema
      expect(src).toContain("text-text-");
    });
  }
});
