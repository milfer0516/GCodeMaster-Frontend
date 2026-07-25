// src/modules/tools/HerramientasPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Inventario de herramientas FÍSICAS de la empresa (Tier 3 — /tooling/instancias).
//
// Cada fila es una pieza real del taller. Dos fresas Ø12 idénticas son dos filas
// distintas, cada una con su longitud útil medida, su costo y su estado.
//
// La lista se agrupa POR FAMILIA y cada grupo se puede plegar, como un armario
// de herramientas de verdad: todas las fresas juntas, todas las brocas juntas.
// El buscador filtra EN VIVO sobre nombre, familia, diámetro y código.
//
// Ver / editar usan el MISMO componente de formulario que el alta
// (HerramientaForm), cambiando solo el modo.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Ruler,
  Eye,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { AgregarHerramientaModal } from "./components/AgregarHerramientaModal";
import { HerramientaForm } from "./components/HerramientaForm";
import { HerramientaPreview3D } from "./components/HerramientaPreview3D";
import { VisorConPanel } from "../../components/layout/VisorConPanel";
import {
  getInstancias,
  getLibreria,
  actualizarInstancia,
  eliminarInstancia,
  familiaLabel,
  mensajeError,
  ESTADOS_INSTANCIA,
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

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue";

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

// ── COMPONENTE ────────────────────────────────────────────────────────────

export function HerramientasPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [libreria, setLibreria] = useState<LibreriaEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());

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
    () =>
      instancias.filter(
        (i) =>
          coincide(i, busqueda) &&
          (filtroFamilia ? i.familia === filtroFamilia : true) &&
          (filtroEstado ? i.estado === filtroEstado : true),
      ),
    [instancias, busqueda, filtroFamilia, filtroEstado],
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

  const todosPlegados = grupos.length > 0 && plegadas.size >= grupos.length;

  // ── ACCIONES ────────────────────────────────────────────────────────────

  const abrirFicha = (i: Instancia, modo: "ver" | "editar") => {
    setSeleccionada(i);
    setValores(desdeInstancia(i, porLibreria.get(i.id_herramienta_libreria)));
    setCampoConError(null);
    setErrorModal("");
    setModal(modo);
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
      await actualizarInstancia(seleccionada.id_herramienta_instancia, {
        longitud_util_real_mm: aNumero(valores.longitud_util_real_mm),
        codigo_interno: valores.codigo_interno || undefined,
        posicion_carrusel: aNumero(valores.posicion_carrusel),
        portaherramienta_real: valores.portaherramienta_real || undefined,
        estado: valores.estado,
        costo_compra: aNumero(valores.costo_compra),
        notas: valores.notas || undefined,
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

  const hayFiltros = !!(busqueda || filtroFamilia || filtroEstado);

  // ── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Inventario de Herramientas
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {instancias.length} herramienta
            {instancias.length !== 1 ? "s" : ""} física
            {instancias.length !== 1 ? "s" : ""} en el taller
            {hayFiltros && ` · ${filtradas.length} coinciden`}
          </p>
        </div>
        <button
          onClick={() => setModalAgregar(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Agregar herramienta
        </button>
      </div>

      {/* Filtros — una sola fila compacta */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-surface p-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, familia, Ø o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`${inputCls} pl-9 pr-8`}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={filtroFamilia}
          onChange={(e) => setFiltroFamilia(e.target.value)}
          className={`${inputCls} w-auto`}
        >
          <option value="">Todas las familias</option>
          {familiasPresentes.map((f) => (
            <option key={f} value={f}>
              {familiaLabel(f)}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className={`${inputCls} w-auto`}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_INSTANCIA.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            setPlegadas(todosPlegados ? new Set() : new Set(grupos.map(([f]) => f)))
          }
          className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted transition hover:text-accent-blue"
        >
          {todosPlegados ? "Expandir todo" : "Plegar todo"}
        </button>

        <button
          onClick={cargar}
          className="rounded-lg border border-border p-2 text-text-muted transition hover:text-accent-blue"
          title="Recargar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Lista agrupada por familia */}
      {loading ? (
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
            No hay herramientas{hayFiltros ? " con esos filtros" : " registradas"}.
          </p>
          {!hayFiltros && (
            <button
              onClick={() => setModalAgregar(true)}
              className="text-sm text-accent-blue hover:underline"
            >
              Agregar la primera herramienta
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(([familia, lista]) => {
            const plegado = plegadas.has(familia);
            return (
              <section
                key={familia}
                className="overflow-hidden rounded-xl border border-border bg-bg-surface"
              >
                <button
                  onClick={() => alternarGrupo(familia)}
                  className="flex w-full items-center gap-2 bg-bg-elevated px-4 py-2.5 text-left transition hover:bg-bg-elevated/70"
                >
                  {plegado ? (
                    <ChevronRight className="h-4 w-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                  )}
                  <span className="text-sm font-semibold text-text-primary">
                    {familiaLabel(familia)}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">
                    {lista.length}
                  </span>
                </button>

                {!plegado && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          {[
                            "Herramienta",
                            "Ø mm",
                            "Long. útil",
                            "Carrusel",
                            "Portaherr.",
                            "Estado",
                            "",
                          ].map((h) => (
                            <th
                              key={h}
                              className="whitespace-nowrap px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lista.map((i) => (
                          <tr
                            key={i.id_herramienta_instancia}
                            className="transition hover:bg-bg-elevated/50"
                          >
                            <td className="px-4 py-2.5 font-medium text-text-primary">
                              {i.nombre ?? "—"}
                              {i.codigo_interno && (
                                <span className="ml-2 text-xs text-text-muted">
                                  {i.codigo_interno}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-text-primary">
                              {i.diametro_mm != null ? `Ø${i.diametro_mm}` : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5">
                              {i.longitud_util_real_mm != null ? (
                                <span className="inline-flex items-center gap-1 text-text-primary">
                                  <Ruler className="h-3 w-3 text-accent-blue" />
                                  {i.longitud_util_real_mm} mm
                                </span>
                              ) : (
                                <span className="text-accent-amber">sin medir</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center text-text-muted">
                              {i.posicion_carrusel ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-text-muted">
                              {i.portaherramienta_real ?? "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadge(i.estado)}`}
                              >
                                {ESTADO_LABEL[i.estado] ?? i.estado}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => abrirFicha(i, "ver")}
                                  className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-accent-blue"
                                  title="Ver ficha en 3D"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => abrirFicha(i, "editar")}
                                  className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-accent-blue"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSeleccionada(i);
                                    setErrorModal("");
                                    setModal("retirar");
                                  }}
                                  className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-accent-red"
                                  title="Retirar del inventario"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

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
