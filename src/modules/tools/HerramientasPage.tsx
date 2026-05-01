// src/modules/herramientas/pages/HerramientasPage.tsx
import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  PowerOff,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  getHerramientas,
  getTiposHerramienta,
  crearHerramienta,
  actualizarHerramienta,
  desactivarHerramienta,
  type Herramienta,
  type TipoHerramienta,
  type HerramientaCreatePayload,
} from "../../services/herramientasService";

// ── HELPERS ───────────────────────────────────────────────────────────────

const MATERIALES = ["HSS", "Carburo", "Inserto"];
const ESTADOS = ["nuevo", "bueno", "desgastado", "fuera_de_servicio"];

function estadoBadge(estado: string) {
  switch (estado) {
    case "nuevo":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "bueno":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "desgastado":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    default:
      return "bg-red-500/10 text-red-400 border-red-500/20";
  }
}

function materialColor(m: string) {
  switch (m.toLowerCase()) {
    case "carburo":
      return "text-accent-blue";
    case "hss":
      return "text-accent-amber";
    case "inserto":
      return "text-accent-green";
    default:
      return "text-text-muted";
  }
}

// ── FORM VACÍO ────────────────────────────────────────────────────────────

const FORM_VACIO: HerramientaCreatePayload = {
  nombre: "",
  tipo: "endmill",
  diametro_mm: 10,
  filos: 4,
  material_herramienta: "Carburo",
  largo_total: undefined,
  recubrimiento: "",
  vida_util_horas: undefined,
  costo_unitario: undefined,
};

// ── COMPONENTE ────────────────────────────────────────────────────────────

export function HerramientasPage() {
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [tipos, setTipos] = useState<TipoHerramienta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Modal
  const [modal, setModal] = useState<"crear" | "editar" | "desactivar" | null>(
    null,
  );
  const [seleccionada, setSeleccionada] = useState<Herramienta | null>(null);
  const [form, setForm] = useState<HerramientaCreatePayload>(FORM_VACIO);
  const [formEstado, setFormEstado] = useState("nuevo");
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const [h, t] = await Promise.all([
        getHerramientas(),
        getTiposHerramienta(),
      ]);
      setHerramientas(h);
      setTipos(t);
    } catch {
      setError("No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Filtrado local
  const filtradas = herramientas.filter((h) => {
    const coincideBusqueda =
      h.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      h.tipo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipo ? h.tipo === filtroTipo : true;
    return coincideBusqueda && coincideTipo;
  });

  // ── ACCIONES ──────────────────────────────────────────────────────────────

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setErrorModal("");
    setModal("crear");
  };

  const abrirEditar = (h: Herramienta) => {
    setSeleccionada(h);
    setForm({
      nombre: h.nombre,
      tipo: h.tipo,
      diametro_mm: h.diametro_mm,
      filos: h.filos,
      material_herramienta: h.material_herramienta,
      largo_total: h.largo_total ?? undefined,
      recubrimiento: h.recubrimiento ?? "",
    });
    setFormEstado(h.estado);
    setErrorModal("");
    setModal("editar");
  };

  const abrirDesactivar = (h: Herramienta) => {
    setSeleccionada(h);
    setModal("desactivar");
  };

  const guardarCrear = async () => {
    if (!form.nombre.trim()) {
      setErrorModal("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setErrorModal("");
    try {
      await crearHerramienta(form);
      await cargar();
      setModal(null);
    } catch (e: any) {
      setErrorModal(e?.response?.data?.detail ?? "Error al crear herramienta");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEditar = async () => {
    if (!seleccionada) return;
    setGuardando(true);
    setErrorModal("");
    try {
      await actualizarHerramienta(seleccionada.id_herramienta, {
        nombre: form.nombre,
        tipo: form.tipo,
        diametro_mm: form.diametro_mm,
        filos: form.filos,
        material_herramienta: form.material_herramienta,
        largo_total: form.largo_total,
        recubrimiento: form.recubrimiento || undefined,
        estado: formEstado,
      });
      await cargar();
      setModal(null);
    } catch (e: any) {
      setErrorModal(e?.response?.data?.detail ?? "Error al actualizar");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarDesactivar = async () => {
    if (!seleccionada) return;
    setGuardando(true);
    try {
      await desactivarHerramienta(seleccionada.id_herramienta);
      await cargar();
      setModal(null);
    } catch {
      setErrorModal("Error al desactivar");
    } finally {
      setGuardando(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Inventario de Herramientas
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {herramientas.length} herramienta
            {herramientas.length !== 1 ? "s" : ""} registrada
            {herramientas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Agregar herramienta
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre o tipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-surface py-2.5 pl-9 pr-4 text-sm text-text-primary outline-none focus:border-accent-blue"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-xl border border-border bg-bg-surface py-2.5 pl-9 pr-8 text-sm text-text-primary outline-none focus:border-accent-blue appearance-none"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
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
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-text-muted">
          <p className="text-sm">
            No hay herramientas
            {busqueda || filtroTipo ? " con esos filtros" : " registradas"}.
          </p>
          {!busqueda && !filtroTipo && (
            <button
              onClick={abrirCrear}
              className="text-sm text-accent-blue hover:underline"
            >
              Agregar primera herramienta
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-elevated">
              <tr>
                {[
                  "Nombre",
                  "Tipo",
                  "Ø mm",
                  "Filos",
                  "Largo",
                  "Material",
                  "Estado",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.map((h) => (
                <tr
                  key={h.id_herramienta}
                  className="hover:bg-bg-elevated/50 transition"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {h.nombre}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {tipos.find((t) => t.tipo === h.tipo)?.nombre ?? h.tipo}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    Ø{h.diametro_mm}
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">
                    {h.filos}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {h.largo_total ? `${h.largo_total} mm` : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${materialColor(h.material_herramienta)}`}
                  >
                    {h.material_herramienta}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${estadoBadge(h.estado)}`}
                    >
                      {h.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(h)}
                        className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-accent-blue"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => abrirDesactivar(h)}
                        className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-red-400"
                        title="Desactivar"
                      >
                        <PowerOff className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold text-text-primary">
                {modal === "crear"
                  ? "Agregar herramienta"
                  : "Editar herramienta"}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-text-muted hover:text-text-primary text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-6">
              {/* Nombre */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nombre: e.target.value }))
                  }
                  placeholder="Ej: Fresa Carburo Ø10 4F"
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Tipo *
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tipo: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                >
                  {tipos.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Material *
                </label>
                <select
                  value={form.material_herramienta}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      material_herramienta: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                >
                  {MATERIALES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Diámetro */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Diámetro (mm) *
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={form.diametro_mm}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      diametro_mm: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                />
              </div>

              {/* Filos */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Filos *
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.filos}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, filos: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                />
              </div>

              {/* Largo */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Largo total (mm)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.largo_total ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      largo_total: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                />
              </div>

              {/* Recubrimiento */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Recubrimiento
                </label>
                <input
                  type="text"
                  value={form.recubrimiento ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, recubrimiento: e.target.value }))
                  }
                  placeholder="TiAlN, TiN, AlTiN..."
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                />
              </div>

              {/* Costo */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Costo unitario (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.costo_unitario ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      costo_unitario: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                />
              </div>

              {/* Estado — solo en editar */}
              {modal === "editar" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Estado
                  </label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e} className="capitalize">
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {errorModal && (
              <div className="mx-6 mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {errorModal}
              </div>
            )}

            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={modal === "crear" ? guardarCrear : guardarEditar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-accent-blue py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : modal === "crear"
                    ? "Crear herramienta"
                    : "Guardar cambios"}
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

      {/* ── MODAL DESACTIVAR ── */}
      {modal === "desactivar" && seleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <PowerOff className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="font-semibold text-text-primary">
              ¿Desactivar herramienta?
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              <span className="font-medium text-text-primary">
                {seleccionada.nombre}
              </span>{" "}
              quedará inactiva. El historial de jobs se conserva. Puedes volver
              a activarla editando su estado.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={confirmarDesactivar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {guardando ? "Desactivando..." : "Sí, desactivar"}
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
