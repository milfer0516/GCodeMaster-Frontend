// src/modules/maquinas/pages/MaquinasPage.tsx
import { useEffect, useState } from "react";
import { Plus, Cpu, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { PlanBanner } from "../../components/ui/PlanBanner";
import {
  getMaquinas,
  getLimiteMaquinas,
  registrarDesdeCatalogo,
  registrarManual,
  type Maquina,
  type LimiteMaquinas,
} from "../../services/maquinasService";
import {
  getCatalogoMaquinas,
  type MaquinaGlobalCatalogo,
} from "../../services/maquinasService";

// ── COMPONENTE ────────────────────────────────────────────────────────────

export function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [limite, setLimite] = useState<LimiteMaquinas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandida, setExpandida] = useState<number | null>(null);

  // Modal agregar
  const [modal, setModal] = useState<"catalogo" | "manual" | null>(null);
  const [catalogo, setCatalogo] = useState<MaquinaGlobalCatalogo[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  // Form manual
  const [formManual, setFormManual] = useState({
    nombre: "",
    marca: "",
    modelo: "",
    tipo: "VMC",
    controlador: "FANUC",
    controlador_modelo: "",
    rpm_min_husillo: 100,
    rpm_max_husillo: 8000,
    potencia_husillo_kw: 7.5,
    cono_husillo: "BT40",
    avance_max_mmmin: 12000,
    rapido_x_mmmin: 36000,
    rapido_y_mmmin: 36000,
    rapido_z_mmmin: 24000,
    recorrido_x_mm: 800,
    recorrido_y_mm: 550,
    recorrido_z_mm: 550,
    num_herramientas_atc: 20,
    descripcion: "",
  });

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const [m, l] = await Promise.all([getMaquinas(), getLimiteMaquinas()]);
      setMaquinas(m);
      setLimite(l);
    } catch {
      setError("No se pudo cargar las máquinas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirCatalogo = async () => {
    setErrorModal("");
    setModal("catalogo");
    setLoadingCatalogo(true);
    try {
      const data = await getCatalogoMaquinas();
      setCatalogo(data);
    } catch {
      setErrorModal("No se pudo cargar el catálogo.");
    } finally {
      setLoadingCatalogo(false);
    }
  };

  const seleccionarDelCatalogo = async (m: MaquinaGlobalCatalogo) => {
    setGuardando(true);
    setErrorModal("");
    try {
      await registrarDesdeCatalogo(m.id_maquina_global);
      await cargar();
      setModal(null);
    } catch (e: any) {
      setErrorModal(e?.response?.data?.detail ?? "Error al registrar");
    } finally {
      setGuardando(false);
    }
  };

  const guardarManual = async () => {
    if (!formManual.nombre.trim()) {
      setErrorModal("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setErrorModal("");
    try {
      await registrarManual(formManual);
      await cargar();
      setModal(null);
    } catch (e: any) {
      setErrorModal(e?.response?.data?.detail ?? "Error al guardar");
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
            Mis Máquinas CNC
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {maquinas.length} máquina{maquinas.length !== 1 ? "s" : ""}{" "}
            registrada{maquinas.length !== 1 ? "s" : ""}
            {limite &&
              ` · ${limite.maquinas_permitidas} permitida${limite.maquinas_permitidas !== 1 ? "s" : ""}`}
          </p>
        </div>
        {limite?.puede_agregar ? (
          <div className="flex gap-2">
            <button
              onClick={abrirCatalogo}
              className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90"
            >
              <Plus className="h-4 w-4" /> Del catálogo
            </button>
            <button
              onClick={() => {
                setErrorModal("");
                setModal("manual");
              }}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-muted transition hover:border-accent-blue hover:text-accent-blue"
            >
              Manual
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 text-right">
            <p className="text-xs font-semibold text-yellow-400">
              Límite alcanzado
            </p>
            <p className="text-xs text-text-muted">
              Excedente: BASIC $300.000 · PREMIUM $800.000/mes
            </p>
          </div>
        )}
      </div>

      {/* Lista máquinas */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 flex items-center justify-between">
          {error}
          <button
            onClick={cargar}
            className="flex items-center gap-1 text-xs hover:text-red-300"
          >
            <RefreshCw className="h-3 w-3" /> Reintentar
          </button>
        </div>
      ) : maquinas.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Cpu className="h-10 w-10 text-text-muted opacity-30" />
          <p className="text-sm text-text-muted">
            No tienes máquinas registradas.
          </p>
          <button
            onClick={abrirCatalogo}
            className="text-sm text-accent-blue hover:underline"
          >
            Agregar desde catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {maquinas.map((m) => (
            <div
              key={m.id_maquina}
              className="rounded-xl border border-border bg-bg-surface overflow-hidden"
            >
              {/* Cabecera de la tarjeta */}
              <button
                onClick={() =>
                  setExpandida(expandida === m.id_maquina ? null : m.id_maquina)
                }
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-bg-elevated/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/10">
                    <Cpu className="h-5 w-5 text-accent-blue" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">
                      {m.nombre}
                    </p>
                    <p className="text-xs text-text-muted">
                      {m.controlador}
                      {m.controlador_modelo ? ` ${m.controlador_modelo}` : ""}
                      {m.cono_husillo ? ` · ${m.cono_husillo}` : ""}
                      {` · ${m.rpm_max_husillo.toLocaleString()} RPM`}
                    </p>
                  </div>
                </div>
                {expandida === m.id_maquina ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {/* Detalle expandible */}
              {expandida === m.id_maquina && (
                <div className="border-t border-border px-5 py-4">
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 sm:grid-cols-3">
                    {[
                      { label: "Marca", value: m.marca ?? "—" },
                      { label: "Modelo", value: m.modelo ?? "—" },
                      { label: "Tipo", value: m.tipo },
                      {
                        label: "Controlador",
                        value: `${m.controlador}${m.controlador_modelo ? ` ${m.controlador_modelo}` : ""}`,
                      },
                      {
                        label: "RPM mín.",
                        value: m.rpm_min_husillo.toLocaleString(),
                      },
                      {
                        label: "RPM máx.",
                        value: m.rpm_max_husillo.toLocaleString(),
                      },
                      {
                        label: "Potencia",
                        value: m.potencia_husillo_kw
                          ? `${m.potencia_husillo_kw} kW`
                          : "—",
                      },
                      { label: "Cono", value: m.cono_husillo ?? "—" },
                      {
                        label: "Avance máx.",
                        value: `${m.avance_max_mmmin.toLocaleString()} mm/min`,
                      },
                      { label: "Recorrido X", value: `${m.recorrido_x_mm} mm` },
                      { label: "Recorrido Y", value: `${m.recorrido_y_mm} mm` },
                      { label: "Recorrido Z", value: `${m.recorrido_z_mm} mm` },
                      {
                        label: "ATC slots",
                        value: m.num_herramientas_atc?.toString() ?? "—",
                      },
                      { label: "Refrigeración", value: m.refrigeracion ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <dt className="text-xs text-text-muted">{label}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-text-primary">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {m.descripcion && (
                    <p className="mt-3 text-xs text-text-muted border-t border-border pt-3">
                      {m.descripcion}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL CATÁLOGO ── */}
      {modal === "catalogo" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold text-text-primary">
                Seleccionar del catálogo
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-text-muted hover:text-text-primary text-xl"
              >
                ×
              </button>
            </div>
            <div className="max-h-[480px] overflow-y-auto p-4 space-y-2">
              {loadingCatalogo ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
                </div>
              ) : (
                catalogo.map((m) => (
                  <button
                    key={m.id_maquina_global}
                    onClick={() => !guardando && seleccionarDelCatalogo(m)}
                    disabled={guardando}
                    className="w-full rounded-xl border border-border bg-bg-primary p-4 text-left transition hover:border-accent-blue hover:bg-accent-blue/5 disabled:opacity-50"
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-text-primary">
                          {m.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {m.marca} · {m.controlador} {m.controlador_modelo} ·{" "}
                          {m.cono}
                        </p>
                      </div>
                      <div className="text-right text-xs text-text-muted">
                        <p>{m.rpm_max.toLocaleString()} RPM</p>
                        <p>
                          {m.recorrido_x}×{m.recorrido_y}×{m.recorrido_z} mm
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            {errorModal && (
              <div className="mx-4 mb-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {errorModal}
              </div>
            )}
            <div className="border-t border-border px-6 py-4">
              <button
                onClick={() => setModal(null)}
                className="w-full rounded-xl border border-border py-2.5 text-sm text-text-muted hover:text-text-primary transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MANUAL ── */}
      {modal === "manual" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold text-text-primary">
                Registrar máquina manualmente
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-text-muted hover:text-text-primary text-xl"
              >
                ×
              </button>
            </div>
            <div className="max-h-[480px] overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nombre *", key: "nombre", type: "text", col: 2 },
                  { label: "Marca", key: "marca", type: "text", col: 1 },
                  { label: "Modelo", key: "modelo", type: "text", col: 1 },
                  {
                    label: "Controlador",
                    key: "controlador",
                    type: "text",
                    col: 1,
                  },
                  {
                    label: "Modelo controlador",
                    key: "controlador_modelo",
                    type: "text",
                    col: 1,
                  },
                  {
                    label: "RPM mín.",
                    key: "rpm_min_husillo",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "RPM máx. *",
                    key: "rpm_max_husillo",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "Potencia (kW)",
                    key: "potencia_husillo_kw",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "Cono husillo",
                    key: "cono_husillo",
                    type: "text",
                    col: 1,
                  },
                  {
                    label: "Avance máx. (mm/min) *",
                    key: "avance_max_mmmin",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "Recorrido X (mm) *",
                    key: "recorrido_x_mm",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "Recorrido Y (mm) *",
                    key: "recorrido_y_mm",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "Recorrido Z (mm) *",
                    key: "recorrido_z_mm",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "ATC slots",
                    key: "num_herramientas_atc",
                    type: "number",
                    col: 1,
                  },
                  {
                    label: "Descripción",
                    key: "descripcion",
                    type: "text",
                    col: 2,
                  },
                ].map((field) => (
                  <div
                    key={field.key}
                    className={field.col === 2 ? "col-span-2" : ""}
                  >
                    <label className="mb-1 block text-xs font-medium text-text-muted">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={(formManual as any)[field.key]}
                      onChange={(e) =>
                        setFormManual((p) => ({
                          ...p,
                          [field.key]:
                            field.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
                    />
                  </div>
                ))}
              </div>
            </div>
            {errorModal && (
              <div className="mx-6 mb-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {errorModal}
              </div>
            )}
            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={guardarManual}
                disabled={guardando}
                className="flex-1 rounded-xl bg-accent-blue py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Registrar máquina"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="rounded-xl border border-border px-5 py-2.5 text-sm text-text-muted hover:text-text-primary transition"
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
