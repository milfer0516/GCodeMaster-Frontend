// src/modules/tools/HerramientasPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Inventario de herramientas FÍSICAS de la empresa (Tier 3 — /tooling/instancias).
//
// Cada fila es una pieza real del taller. Dos fresas Ø12 idénticas son dos filas
// distintas, cada una con su longitud útil medida y su estado.
//
// Editable aquí: longitud útil (se re-mide con el desgaste), estado, posición de
// carrusel, portaherramientas y notas. La definición (familia, Ø, filos,
// material) NO se edita: pertenece al catálogo / a la librería.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, RefreshCw, Ruler } from "lucide-react";
import { AgregarHerramientaModal } from "./components/AgregarHerramientaModal";
import {
  getInstancias,
  actualizarInstancia,
  eliminarInstancia,
  familiaLabel,
  mensajeError,
  ESTADOS_INSTANCIA,
  ESTADO_LABEL,
  type Instancia,
} from "../../services/toolingService";

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

const labelCls = "mb-1 block text-xs font-medium text-text-muted";

const FORM_EDICION = {
  longitud_util_real_mm: "",
  posicion_carrusel: "",
  portaherramienta_real: "",
  estado: "disponible",
  notas: "",
};

// ── COMPONENTE ────────────────────────────────────────────────────────────

export function HerramientasPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Modales
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modal, setModal] = useState<"editar" | "retirar" | null>(null);
  const [seleccionada, setSeleccionada] = useState<Instancia | null>(null);
  const [form, setForm] = useState(FORM_EDICION);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      setInstancias(await getInstancias());
    } catch {
      setError("No se pudo cargar el inventario de herramientas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Familias presentes en el inventario (para el filtro)
  const familiasPresentes = useMemo(
    () =>
      [...new Set(instancias.map((i) => i.familia).filter(Boolean))] as string[],
    [instancias],
  );

  const filtradas = instancias.filter((i) => {
    const texto = busqueda.toLowerCase();
    const coincideBusqueda =
      !texto ||
      (i.nombre ?? "").toLowerCase().includes(texto) ||
      familiaLabel(i.familia).toLowerCase().includes(texto) ||
      (i.codigo_interno ?? "").toLowerCase().includes(texto);
    const coincideFamilia = filtroFamilia ? i.familia === filtroFamilia : true;
    const coincideEstado = filtroEstado ? i.estado === filtroEstado : true;
    return coincideBusqueda && coincideFamilia && coincideEstado;
  });

  // ── ACCIONES ────────────────────────────────────────────────────────────

  const abrirEditar = (i: Instancia) => {
    setSeleccionada(i);
    setForm({
      longitud_util_real_mm:
        i.longitud_util_real_mm != null ? String(i.longitud_util_real_mm) : "",
      posicion_carrusel:
        i.posicion_carrusel != null ? String(i.posicion_carrusel) : "",
      portaherramienta_real: i.portaherramienta_real ?? "",
      estado: i.estado,
      notas: i.notas ?? "",
    });
    setErrorModal("");
    setModal("editar");
  };

  const guardarEditar = async () => {
    if (!seleccionada) return;
    const longitud = Number(form.longitud_util_real_mm);
    if (form.longitud_util_real_mm && !(longitud > 0)) {
      setErrorModal("La longitud útil debe ser mayor que 0.");
      return;
    }
    setGuardando(true);
    setErrorModal("");
    try {
      await actualizarInstancia(seleccionada.id_herramienta_instancia, {
        longitud_util_real_mm: form.longitud_util_real_mm
          ? longitud
          : undefined,
        posicion_carrusel: form.posicion_carrusel
          ? Number(form.posicion_carrusel)
          : undefined,
        portaherramienta_real: form.portaherramienta_real || undefined,
        estado: form.estado,
        notas: form.notas || undefined,
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
          </p>
        </div>
        <button
          onClick={() => setModalAgregar(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Agregar herramienta
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, familia o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`${inputCls} py-2.5 pl-9`}
          />
        </div>
        <select
          value={filtroFamilia}
          onChange={(e) => setFiltroFamilia(e.target.value)}
          className={`${inputCls} w-auto py-2.5`}
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
          className={`${inputCls} w-auto py-2.5`}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_INSTANCIA.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>
        <button
          onClick={cargar}
          className="rounded-xl border border-border p-2.5 text-text-muted transition hover:text-accent-blue"
          title="Recargar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-accent-red/20 bg-accent-red/5 p-4 text-sm text-accent-red">
          {error}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-text-muted">
          <p className="text-sm">
            No hay herramientas
            {busqueda || filtroFamilia || filtroEstado
              ? " con esos filtros"
              : " registradas"}
            .
          </p>
          {!busqueda && !filtroFamilia && !filtroEstado && (
            <button
              onClick={() => setModalAgregar(true)}
              className="text-sm text-accent-blue hover:underline"
            >
              Agregar la primera herramienta
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-elevated">
              <tr>
                {[
                  "Herramienta",
                  "Familia",
                  "Ø mm",
                  "Long. útil",
                  "Carrusel",
                  "Portaherr.",
                  "Estado",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.map((i) => (
                <tr
                  key={i.id_herramienta_instancia}
                  className="transition hover:bg-bg-elevated/50"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {i.nombre ?? "—"}
                    {i.codigo_interno && (
                      <span className="ml-2 text-xs text-text-muted">
                        {i.codigo_interno}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                    {familiaLabel(i.familia)}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {i.diametro_mm != null ? `Ø${i.diametro_mm}` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {i.longitud_util_real_mm != null ? (
                      <span className="inline-flex items-center gap-1 text-text-primary">
                        <Ruler className="h-3 w-3 text-accent-blue" />
                        {i.longitud_util_real_mm} mm
                      </span>
                    ) : (
                      <span className="text-accent-amber">sin medir</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">
                    {i.posicion_carrusel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {i.portaherramienta_real ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadge(i.estado)}`}
                    >
                      {ESTADO_LABEL[i.estado] ?? i.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(i)}
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

      {/* ── MODAL AGREGAR (componente reutilizable) ── */}
      <AgregarHerramientaModal
        abierto={modalAgregar}
        onCerrar={() => setModalAgregar(false)}
        onRegistrada={() => cargar()}
        permitirEncadenar
      />

      {/* ── MODAL EDITAR ── */}
      {modal === "editar" && seleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-semibold text-text-primary">
                  Editar herramienta física
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {seleccionada.nombre} ·{" "}
                  {familiaLabel(seleccionada.familia)}
                  {seleccionada.diametro_mm != null
                    ? ` · Ø${seleccionada.diametro_mm} mm`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="text-xl leading-none text-text-muted hover:text-text-primary"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  <Ruler className="h-4 w-4 text-accent-blue" />
                  Longitud útil medida (mm)
                </label>
                <p className="mb-2 text-xs text-text-muted">
                  Actualízala cuando vuelvas a montar o reafilar la herramienta.
                </p>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={form.longitud_util_real_mm}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      longitud_util_real_mm: e.target.value,
                    }))
                  }
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, estado: e.target.value }))
                    }
                    className={inputCls}
                  >
                    {ESTADOS_INSTANCIA.map((e) => (
                      <option key={e} value={e}>
                        {ESTADO_LABEL[e]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Posición en carrusel</label>
                  <input
                    type="number"
                    min={0}
                    value={form.posicion_carrusel}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        posicion_carrusel: e.target.value,
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Portaherramientas</label>
                  <input
                    type="text"
                    value={form.portaherramienta_real}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        portaherramienta_real: e.target.value,
                      }))
                    }
                    placeholder="Ej: BT40 ER32"
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Notas</label>
                  <input
                    type="text"
                    value={form.notas}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, notas: e.target.value }))
                    }
                    placeholder="Opcional"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {errorModal && (
              <div className="mx-6 mb-4 rounded-lg border border-accent-red/20 bg-accent-red/10 px-4 py-2 text-sm text-accent-red">
                {errorModal}
              </div>
            )}

            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={guardarEditar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-accent-blue py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="rounded-xl border border-border px-5 py-2.5 text-sm text-text-muted transition hover:text-text-primary"
              >
                Cancelar
              </button>
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
