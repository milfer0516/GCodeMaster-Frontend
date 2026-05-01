// src/modules/dashboard/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlanBanner } from "../../../components/ui/PlanBanner";
import {
  Cpu,
  Wrench,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "../../auth/store/authStore";
import {
  getMaquinas,
  getHerramientas,
  type MaquinaDashboard,
  type HerramientaDashboard,
} from "../../../services/dashboardService";

// ── HELPERS ───────────────────────────────────────────────────────────────

function estadoColor(estado: string) {
  switch (estado) {
    case "nuevo":
      return "text-green-400 bg-green-400/10";
    case "bueno":
      return "text-blue-400 bg-blue-400/10";
    case "desgastado":
      return "text-yellow-400 bg-yellow-400/10";
    default:
      return "text-red-400 bg-red-400/10";
  }
}

function materialColor(material: string) {
  switch (material.toLowerCase()) {
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

// ── COMPONENTE ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const empresa = useAuthStore((s) => s.empresa);
  const plan = useAuthStore((s) => s.plan_activo);

  const [maquinas, setMaquinas] = useState<MaquinaDashboard[]>([]);
  const [herramientas, setHerramientas] = useState<HerramientaDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    setLoading(true);
    setError("");
    try {
      const [m, h] = await Promise.all([getMaquinas(), getHerramientas()]);
      setMaquinas(m);
      setHerramientas(h);
    } catch {
      setError("No se pudieron cargar los datos. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const maquinaActiva = maquinas[0] ?? null;
  const herrsActivas = herramientas;
  const herrsDesgastadas = herramientas.filter(
    (h) => h.estado === "desgastado" || h.estado === "fuera_de_servicio",
  );
  const planEsPremium = plan === "premium";

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={cargarDatos}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── SALUDO ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Bienvenido,{" "}
            <span className="text-accent-blue">{empresa?.nombre_empresa}</span>
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Panel de control · Plan{" "}
            <span className="capitalize font-medium text-text-primary">
              {plan}
            </span>
          </p>
        </div>
        <button
          onClick={() => navigate("/cam")}
          className="flex items-center gap-2 rounded-xl bg-accent-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98]"
        >
          Generar G-Code <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <PlanBanner />
      {/* ── TARJETAS DE ESTADO ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Máquina */}
        <div className="rounded-xl border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Cpu className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Máquina
            </span>
          </div>
          <p className="mt-2 font-semibold text-text-primary truncate">
            {maquinaActiva?.nombre ?? "Sin registrar"}
          </p>
          <p className="text-xs text-text-muted">
            {maquinaActiva?.controlador ?? "—"}
            {maquinaActiva?.cono_husillo
              ? ` · ${maquinaActiva.cono_husillo}`
              : ""}
          </p>
        </div>

        {/* Herramientas */}
        <div className="rounded-xl border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Wrench className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Herramientas
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {herrsActivas.length}
          </p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-primary">
            <div
              className="h-full rounded-full bg-accent-green transition-all"
              style={{
                width: `${Math.min((herrsActivas.length / 20) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Alertas */}
        <div className="rounded-xl border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Alertas
            </span>
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${herrsDesgastadas.length > 0 ? "text-yellow-400" : "text-accent-green"}`}
          >
            {herrsDesgastadas.length}
          </p>
          <p className="text-xs text-text-muted">
            {herrsDesgastadas.length > 0
              ? "herramienta(s) a revisar"
              : "Todo en orden"}
          </p>
        </div>

        {/* Copiloto IA */}
        <div
          className={`rounded-xl border p-4 ${planEsPremium ? "border-accent-blue/30 bg-accent-blue/5" : "border-border bg-bg-surface opacity-60"}`}
        >
          <div className="flex items-center gap-2 text-text-muted">
            <span className="text-sm">🤖</span>
            <span className="text-xs font-medium uppercase tracking-wider">
              Copiloto IA
            </span>
          </div>
          <p
            className={`mt-2 font-semibold ${planEsPremium ? "text-accent-blue" : "text-text-muted"}`}
          >
            {planEsPremium ? "Activo" : "Plan Premium"}
          </p>
          <p className="text-xs text-text-muted">
            {planEsPremium ? "Gemini vigilando" : "Requiere upgrade"}
          </p>
        </div>
      </div>

      {/* ── FILA MEDIA ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Registro de máquina */}
        <div className="rounded-xl border border-border bg-bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent-blue" /> Registro de Máquina
            </h2>
            <button
              onClick={() => navigate("/cuenta")}
              className="text-xs text-text-muted hover:text-accent-blue transition"
            >
              Editar
            </button>
          </div>

          {maquinaActiva ? (
            <dl className="space-y-2.5">
              {[
                { label: "Modelo", value: maquinaActiva.modelo ?? "—" },
                { label: "Marca", value: maquinaActiva.marca ?? "—" },
                {
                  label: "Controlador",
                  value: `${maquinaActiva.controlador}${maquinaActiva.controlador_modelo ? ` ${maquinaActiva.controlador_modelo}` : ""}`,
                },
                {
                  label: "RPM Máx.",
                  value: maquinaActiva.rpm_max_husillo.toLocaleString(),
                },
                {
                  label: "Carrera XYZ",
                  value: `${maquinaActiva.recorrido_x_mm}×${maquinaActiva.recorrido_y_mm}×${maquinaActiva.recorrido_z_mm} mm`,
                },
                {
                  label: "ATC slots",
                  value: maquinaActiva.num_herramientas_atc?.toString() ?? "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="font-medium text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-text-muted">
              No hay máquina registrada.
            </p>
          )}
        </div>

        {/* Inventario herramientas */}
        <div className="rounded-xl border border-border bg-bg-surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Wrench className="h-4 w-4 text-accent-blue" /> Inventario de
              Herramientas
            </h2>
            <button
              onClick={() => navigate("/herramientas")}
              className="text-xs text-text-muted hover:text-accent-blue transition"
            >
              Ver todas
            </button>
          </div>

          {herrsActivas.length === 0 ? (
            <p className="text-sm text-text-muted">
              No hay herramientas registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th className="pb-2 text-left font-medium">Nombre</th>
                    <th className="pb-2 text-left font-medium">Tipo</th>
                    <th className="pb-2 text-center font-medium">Ø mm</th>
                    <th className="pb-2 text-center font-medium">Filos</th>
                    <th className="pb-2 text-center font-medium">Material</th>
                    <th className="pb-2 text-center font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {herrsActivas.slice(0, 8).map((h) => (
                    <tr
                      key={h.id_herramienta}
                      className="hover:bg-bg-elevated/40 transition"
                    >
                      <td className="py-2 pr-3 font-medium text-text-primary truncate max-w-[140px]">
                        {h.nombre}
                      </td>
                      <td className="py-2 pr-3 text-text-muted truncate max-w-[100px]">
                        {h.tipo}
                      </td>
                      <td className="py-2 text-center text-text-primary">
                        Ø{h.diametro_mm}
                      </td>
                      <td className="py-2 text-center text-text-muted">
                        {h.filos}
                      </td>
                      <td
                        className={`py-2 text-center font-medium ${materialColor(h.material_herramienta)}`}
                      >
                        {h.material_herramienta}
                      </td>
                      <td className="py-2 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${estadoColor(h.estado)}`}
                        >
                          {h.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {herrsActivas.length > 8 && (
                <p className="mt-2 text-center text-xs text-text-muted">
                  +{herrsActivas.length - 8} más en{" "}
                  <button
                    onClick={() => navigate("/herramientas")}
                    className="text-accent-blue hover:underline"
                  >
                    inventario completo
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── ZONA CAM ── */}
      <div className="rounded-xl border border-dashed border-accent-blue/30 bg-accent-blue/5 p-6">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-blue/10 text-2xl">
            ⚙️
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">
              Listo para mecanizar
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Sube un archivo STEP y genera tu G-Code en segundos.
            </p>
          </div>
          <button
            onClick={() => navigate("/cam")}
            className="mt-1 flex items-center gap-2 rounded-xl bg-accent-blue px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 active:scale-[0.98]"
          >
            Abrir CAM Wizard <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── ALERTAS HERRAMIENTAS ── */}
      {herrsDesgastadas.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-yellow-400">
              Herramientas que requieren atención
            </h3>
          </div>
          <div className="space-y-2">
            {herrsDesgastadas.map((h) => (
              <div
                key={h.id_herramienta}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-primary">{h.nombre}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${estadoColor(h.estado)}`}
                >
                  {h.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
