// src/modules/tools/HerramientasPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// INVENTARIO — una sola pantalla con DOS secciones (diseño "GCodeMaster
// inventario.html"): Herramientas (acento azul) y Utillajes de amarre (acento
// verde). En pantalla ancha (≥900px, el breakpoint del diseño) van LADO A LADO
// con divisor central y scroll independiente por columna; en estrecha se
// APILAN a todo lo ancho y cada sección se puede plegar. Mobile-first: las
// clases base son el apilado; `min-[900px]:` aplica el lado a lado.
//
// HERRAMIENTAS: misma lógica de siempre (instancias físicas, búsqueda en vivo
// con `coincide`, agrupado por familia plegable, ficha ver/editar, retirar) —
// solo cambia la disposición: filas nombre+código+Ø con insignia y menú de
// acciones, como manda el diseño.
//
// UTILLAJES: vive en SeccionUtillajes (modules/utillajes), que reusa el
// RegistroUtillaje compartido con el wizard.
//
// COLORES — todo a tokens del tema (globals.css), NADA hardcodeado; la pantalla
// sigue el toggle oscuro/claro sola:
//   marco #0d0f12          → bg-bg-primary      divisor/bordes → border-border
//   tarjetas #14161a       → bg-bg-surface      texto          → text-text-*
//   acento herramientas    → accent-blue        acento amarre  → accent-green
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { Wrench, X, Trash2 } from "lucide-react";
import { AgregarHerramientaModal } from "./components/AgregarHerramientaModal";
import { HerramientaForm } from "./components/HerramientaForm";
import { HerramientaPreview3D } from "./components/HerramientaPreview3D";
import { VisorConPanel } from "../../components/layout/VisorConPanel";
import { SeccionInventario } from "./components/inventario/SeccionInventario";
import { CajaBusqueda } from "./components/inventario/CajaBusqueda";
import { AcordeonFamilia } from "./components/inventario/AcordeonFamilia";
import { FilaItem } from "./components/inventario/FilaItem";
import { SeccionUtillajes } from "../utillajes/components/SeccionUtillajes";
import {
  getInstancias,
  getLibreria,
  actualizarInstancia,
  eliminarInstancia,
  familiaLabel,
  mensajeError,
  ESTADO_LABEL,
  type Instancia,
  type LibreriaEntrada,
} from "../../services/toolingService";
import {
  desdeInstancia,
  aNumero,
  validarInstancia,
  valoresVacios,
  type ValoresHerramienta,
} from "./domain/valoresHerramienta";

// ── HELPERS ───────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  switch (estado) {
    case "disponible":
      return "bg-accent-green/10 text-accent-green border-accent-green/20";
    case "en_mantenimiento":
      return "bg-accent-amber/10 text-accent-amber border-accent-amber/20";
    default: // retirada
      return "bg-accent-red/10 text-accent-red border-accent-red/20";
  }
}

/**
 * Normaliza para buscar: minúsculas, sin tildes y sin el símbolo Ø. Así
 * "esferica", "esférica", "Ø12" y "12" encuentran lo mismo — nadie en el
 * taller escribe con tildes ni con Ø.
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tildes ya separadas por NFD
    .replace(/ø/g, "")
    .trim();
}

/**
 * ¿La instancia coincide con el texto buscado? Nombre, familia (clave y
 * etiqueta), diámetro, código interno, material y portaherramientas.
 * Función pura: se puede probar suelta.
 */
function coincide(i: Instancia, texto: string): boolean {
  const t = normalizar(texto);
  if (!t) return true;
  const campos = [
    i.nombre ?? "",
    i.familia ?? "",
    familiaLabel(i.familia),
    i.codigo_interno ?? "",
    i.material ?? "",
    i.diametro_mm != null ? String(i.diametro_mm) : "",
    i.portaherramienta_real ?? "",
  ];
  return campos.some((c) => normalizar(c).includes(t));
}

/** Línea de medida en mono de la fila: Ø y, si ya se midió, longitud útil. */
function detalleHerramienta(i: Instancia): string {
  const partes: string[] = [];
  if (i.diametro_mm != null) partes.push(`Ø ${i.diametro_mm} mm`);
  if (i.longitud_util_real_mm != null)
    partes.push(`útil ${i.longitud_util_real_mm} mm`);
  return partes.join(" · ");
}

// ── COMPONENTE ────────────────────────────────────────────────────────────

export function HerramientasPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [libreria, setLibreria] = useState<LibreriaEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Búsqueda en vivo de la sección (la única de la cabecera, como el diseño)
  const [busqueda, setBusqueda] = useState("");
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());
  const [seccionAbierta, setSeccionAbierta] = useState(true);

  // Modales
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modal, setModal] = useState<"ver" | "editar" | "retirar" | null>(null);
  const [seleccionada, setSeleccionada] = useState<Instancia | null>(null);
  const [valores, setValores] = useState<ValoresHerramienta>(valoresVacios());
  const [campoConError, setCampoConError] = useState<
    keyof ValoresHerramienta | null
  >(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      // La instancia solo trae familia/nombre/Ø; la geometría completa (filos,
      // longitudes, ángulos) vive en la definición efectiva de la librería, y
      // hace falta para el render 3D de la ficha.
      const [ins, lib] = await Promise.all([getInstancias(), getLibreria()]);
      setInstancias(ins);
      setLibreria(lib);
    } catch {
      setError("No se pudo cargar el inventario de herramientas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const porLibreria = useMemo(
    () => new Map(libreria.map((l) => [l.id_herramienta_libreria, l])),
    [libreria],
  );

  const familiasPresentes = useMemo(
    () =>
      [...new Set(instancias.map((i) => i.familia).filter(Boolean))] as string[],
    [instancias],
  );

  // Filtrado EN VIVO — se recalcula en cada tecla, sin botón "buscar".
  const filtradas = useMemo(
    () => instancias.filter((i) => coincide(i, busqueda)),
    [instancias, busqueda],
  );

  // Agrupado por familia — el armario de herramientas.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Instancia[]>();
    for (const i of filtradas) {
      const clave = i.familia ?? "sin_familia";
      const lista = mapa.get(clave) ?? [];
      lista.push(i);
      mapa.set(clave, lista);
    }
    return [...mapa.entries()].sort((a, b) =>
      familiaLabel(a[0]).localeCompare(familiaLabel(b[0])),
    );
  }, [filtradas]);

  const alternarGrupo = (familia: string) =>
    setPlegadas((prev) => {
      const s = new Set(prev);
      if (s.has(familia)) s.delete(familia);
      else s.add(familia);
      return s;
    });

  // ── ACCIONES ────────────────────────────────────────────────────────────

  const abrirFicha = (i: Instancia, modo: "ver" | "editar") => {
    setSeleccionada(i);
    setValores(desdeInstancia(i, porLibreria.get(i.id_herramienta_libreria)));
    setCampoConError(null);
    setErrorModal("");
    setModal(modo);
  };

  const abrirRetirar = (i: Instancia) => {
    setSeleccionada(i);
    setErrorModal("");
    setModal("retirar");
  };

  const guardarEditar = async () => {
    if (!seleccionada) return;
    const fallo = validarInstancia(valores);
    if (fallo) {
      setErrorModal(fallo.mensaje);
      setCampoConError(fallo.campo);
      return;
    }
    setGuardando(true);
    setErrorModal("");
    try {
      // Solo propiedades permanentes: los datos de montaje (voladizo,
      // carrusel, portaherramientas) los escribe Operaciones, no el inventario.
      await actualizarInstancia(seleccionada.id_herramienta_instancia, {
        codigo_interno: valores.codigo_interno || undefined,
        estado: valores.estado,
        costo_compra: aNumero(valores.costo_compra),
        marca: valores.marca || undefined,
        referencia_fabricante: valores.referencia_fabricante || undefined,
      });
      await cargar();
      setModal(null);
    } catch (e: any) {
      setErrorModal(mensajeError(e, "Error al actualizar."));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarRetirar = async () => {
    if (!seleccionada) return;
    setGuardando(true);
    setErrorModal("");
    try {
      await eliminarInstancia(seleccionada.id_herramienta_instancia);
      await cargar();
      setModal(null);
    } catch {
      setErrorModal("Error al retirar la herramienta.");
    } finally {
      setGuardando(false);
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────

  const contenidoHerramientas = loading ? (
    <div className="flex h-48 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
    </div>
  ) : error ? (
    <div className="rounded-xl border border-accent-red/20 bg-accent-red/5 p-4 text-sm text-accent-red">
      {error}
    </div>
  ) : grupos.length === 0 ? (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-text-muted">
      <p className="text-sm">
        No hay herramientas{busqueda ? " con esa búsqueda" : " registradas"}.
      </p>
      {!busqueda && (
        <button
          onClick={() => setModalAgregar(true)}
          className="text-sm text-accent-blue hover:underline"
        >
          Agregar la primera herramienta
        </button>
      )}
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {grupos.map(([familia, lista]) => (
        <AcordeonFamilia
          key={familia}
          nombre={familiaLabel(familia)}
          cantidad={lista.length}
          abierto={!plegadas.has(familia)}
          onAlternar={() => alternarGrupo(familia)}
        >
          {lista.map((i) => (
            <FilaItem
              key={i.id_herramienta_instancia}
              nombre={i.nombre ?? "—"}
              codigo={i.codigo_interno ?? ""}
              detalle={detalleHerramienta(i)}
              badge={{
                texto: ESTADO_LABEL[i.estado] ?? i.estado,
                clases: estadoBadge(i.estado),
              }}
              acciones={[
                { etiqueta: "Ver detalle", onClick: () => abrirFicha(i, "ver") },
                { etiqueta: "Editar", onClick: () => abrirFicha(i, "editar") },
                {
                  etiqueta: "Eliminar",
                  peligrosa: true,
                  onClick: () => abrirRetirar(i),
                },
              ]}
            />
          ))}
        </AcordeonFamilia>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* Marco del diseño: tarjeta redondeada que contiene las dos secciones */}
      <div
        data-testid="inventario-frame"
        className="overflow-hidden rounded-2xl border border-border bg-bg-primary"
      >
        <div
          data-testid="inventario-wrap"
          className="flex flex-col min-[900px]:flex-row min-[900px]:items-stretch min-[900px]:h-[min(760px,calc(100vh_-_110px))]"
        >
          {/* ── SECCIÓN HERRAMIENTAS (acento azul) ── */}
          <section
            data-testid="seccion-herramientas"
            className="min-w-0 flex-1 p-4 min-[900px]:overflow-y-auto min-[900px]:px-5 min-[900px]:py-[18px]"
          >
            <SeccionInventario
              icono={Wrench}
              titulo="Herramientas"
              subtitulo="Herramientas de corte"
              conteo={`${instancias.length} en el taller`}
              etiquetaAccion="Agregar"
              onAccion={() => setModalAgregar(true)}
              acento="blue"
              abierto={seccionAbierta}
              onAlternar={() => setSeccionAbierta((v) => !v)}
            >
              <CajaBusqueda
                placeholder="Buscar por nombre o código"
                value={busqueda}
                onChange={setBusqueda}
              />
              {contenidoHerramientas}
            </SeccionInventario>
          </section>

          {/* Divisor central: solo en ancho (en estrecho hay border-t) */}
          <div
            data-testid="inventario-divider"
            aria-hidden
            className="hidden w-px bg-border min-[900px]:block"
          />

          {/* ── SECCIÓN UTILLAJES DE AMARRE (acento verde) ── */}
          <section
            data-testid="seccion-utillajes"
            className="min-w-0 flex-1 border-t border-border p-4 min-[900px]:border-t-0 min-[900px]:overflow-y-auto min-[900px]:px-5 min-[900px]:py-[18px]"
          >
            <SeccionUtillajes />
          </section>
        </div>
      </div>

      {/* ── MODAL AGREGAR (componente reutilizable) ── */}
      <AgregarHerramientaModal
        abierto={modalAgregar}
        onCerrar={() => setModalAgregar(false)}
        onRegistrada={() => cargar()}
        permitirEncadenar
      />

      {/* ── FICHA · ver / editar — MISMO formulario, distinto modo ── */}
      {(modal === "ver" || modal === "editar") && seleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-semibold text-text-primary">
                  {modal === "ver"
                    ? "Ficha de la herramienta"
                    : "Editar herramienta física"}
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {seleccionada.nombre} · {familiaLabel(seleccionada.familia)}
                  {seleccionada.diametro_mm != null
                    ? ` · Ø${seleccionada.diametro_mm} mm`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-1 text-text-muted transition hover:text-text-primary"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
              <VisorConPanel
                className="h-full"
                panel={
                  <HerramientaForm
                    modo={modal}
                    valores={valores}
                    onCambiar={(parcial) => {
                      setValores((v) => ({ ...v, ...parcial }));
                      setCampoConError(null);
                      setErrorModal("");
                    }}
                    familias={familiasPresentes}
                    campoConError={campoConError}
                  />
                }
                visor={<HerramientaPreview3D valores={valores} />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
              {errorModal && (
                <p className="flex-1 text-sm text-accent-red">{errorModal}</p>
              )}
              {modal === "editar" ? (
                <>
                  <button
                    onClick={guardarEditar}
                    disabled={guardando}
                    className="ml-auto rounded-xl bg-accent-blue px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50"
                  >
                    {guardando ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm text-text-muted transition hover:text-text-primary"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModal("editar")}
                    className="ml-auto rounded-xl border border-accent-blue px-5 py-2.5 text-sm font-semibold text-accent-blue transition hover:bg-accent-blue/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm text-text-muted transition hover:text-text-primary"
                  >
                    Cerrar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RETIRAR ── */}
      {modal === "retirar" && seleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/10">
              <Trash2 className="h-5 w-5 text-accent-red" />
            </div>
            <h2 className="font-semibold text-text-primary">
              ¿Retirar esta herramienta?
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              <span className="font-medium text-text-primary">
                {seleccionada.nombre}
              </span>{" "}
              saldrá del inventario y dejará de contar para el mínimo de
              herramientas. La definición se conserva en tu librería, así que
              puedes volver a registrar una pieza igual cuando la compres.
            </p>
            {errorModal && (
              <p className="mt-3 text-sm text-accent-red">{errorModal}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={confirmarRetirar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-accent-red py-2.5 text-sm font-semibold text-white transition hover:bg-accent-red/90 disabled:opacity-50"
              >
                {guardando ? "Retirando..." : "Sí, retirar"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm text-text-muted transition hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
