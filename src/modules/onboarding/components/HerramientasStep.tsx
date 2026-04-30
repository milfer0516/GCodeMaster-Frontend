import { useEffect, useState } from "react";
import { useOnboardingStore } from "../store/onboardingStore";
import {
  getTiposHerramienta,
  registrarHerramienta,
} from "../../../services/onboardingService";

const MINIMO_HERRAMIENTAS = 5;

interface TipoHerramienta {
  tipo: string;
  nombre: string;
  operacion: string;
}

interface FormHerramienta {
  nombre: string;
  tipo: string;
  diametro_mm: string;
  filos: string;
  material_herramienta: string;
  largo_total: string;
  recubrimiento: string;
  vida_util_horas: string;
  costo_unitario: string;
}

const FORM_INICIAL: FormHerramienta = {
  nombre: "",
  tipo: "",
  diametro_mm: "",
  filos: "",
  material_herramienta: "",
  largo_total: "",
  recubrimiento: "",
  vida_util_horas: "",
  costo_unitario: "",
};

const MATERIALES_HERRAMIENTA = [
  "HSS",
  "HSS-Co",
  "Carburo",
  "Cermet",
  "Cerámica",
  "CBN",
  "PCD",
];

const RECUBRIMIENTOS = [
  {
    valor: "",
    label: "Sin recubrimiento",
    descripcion: "Herramienta sin capa protectora",
  },
  {
    valor: "TiN",
    label: "TiN",
    descripcion: "Nitruro de titanio — uso general, aluminio y aceros blandos",
  },
  {
    valor: "TiAlN",
    label: "TiAlN",
    descripcion: "Nitruro de titanio-aluminio — alta temperatura, aceros duros",
  },
  {
    valor: "TiCN",
    label: "TiCN",
    descripcion:
      "Nitruro de titanio-carbono — buena dureza y resistencia al desgaste",
  },
  {
    valor: "AlTiN",
    label: "AlTiN",
    descripcion: "Alta dureza — aceros inoxidables y materiales difíciles",
  },
  {
    valor: "DLC",
    label: "DLC",
    descripcion: "Diamond-Like Carbon — aluminio y materiales no ferrosos",
  },
  {
    valor: "ZrN",
    label: "ZrN",
    descripcion: "Nitruro de zirconio — cobre, latón y plásticos",
  },
];

export function HerramientasStep() {
  const { setStep, agregarHerramienta, herramientas } = useOnboardingStore();

  const [tipos, setTipos] = useState<TipoHerramienta[]>([]);
  const [form, setForm] = useState<FormHerramienta>(FORM_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    getTiposHerramienta()
      .then(setTipos)
      .catch(() => setError("No se pudieron cargar los tipos de herramienta."));
  }, []);

  const tipoSeleccionado = tipos.find((t) => t.tipo === form.tipo);
  const recubrimientoSeleccionado = RECUBRIMIENTOS.find(
    (r) => r.valor === form.recubrimiento,
  );
  const progreso = Math.min(
    (herramientas.length / MINIMO_HERRAMIENTAS) * 100,
    100,
  );
  const minimoAlcanzado = herramientas.length >= MINIMO_HERRAMIENTAS;

  const formatCOP = (raw: string) => {
    const num = parseInt(raw.replace(/\D/g, ""), 10);
    if (isNaN(num)) return "";
    return num.toLocaleString("es-CO");
  };

  const handleAgregar = async () => {
    if (
      !form.nombre ||
      !form.tipo ||
      !form.diametro_mm ||
      !form.filos ||
      !form.material_herramienta ||
      !form.largo_total
    ) {
      setError("Completa todos los campos obligatorios (*).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const costoLimpio = form.costo_unitario
        ? parseInt(form.costo_unitario.replace(/\D/g, ""), 10)
        : null;
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo,
        diametro_mm: Number(form.diametro_mm),
        filos: Number(form.filos),
        material_herramienta: form.material_herramienta,
        largo_total: Number(form.largo_total),
        recubrimiento: form.recubrimiento || null,
        vida_util_horas: form.vida_util_horas
          ? Number(form.vida_util_horas)
          : null,
        costo_unitario: costoLimpio,
      };
      const res = await registrarHerramienta(payload);
      agregarHerramienta({
        id_herramienta: res.id_herramienta,
        nombre: form.nombre,
        tipo: form.tipo,
        diametro_mm: Number(form.diametro_mm),
      });
      setForm(FORM_INICIAL);
      setExito(`✓ ${form.nombre} agregada correctamente.`);
      setTimeout(() => setExito(""), 3000);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ?? "Error al registrar la herramienta.",
      );
    } finally {
      setLoading(false);
    }
  };

  const field = (
    key: keyof FormHerramienta,
    label: string,
    tipo: string,
    ayuda?: string,
    requerido = false,
  ) => (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
        {label} {requerido && <span className="text-red-400">*</span>}
      </label>
      {ayuda && <p className="mb-1 text-[11px] text-text-muted">{ayuda}</p>}
      <input
        type={tipo}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-orange focus:outline-none"
      />
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary">
        Paso 2 — Registrar herramientas
      </h2>
      <p className="mt-2 text-sm text-text-muted leading-relaxed">
        El motor CAM seleccionará herramientas de este inventario para generar
        el G-Code.{" "}
        <strong className="text-text-primary">
          Solo registra herramientas que existen físicamente en tu taller.
        </strong>
      </p>

      {/* Barra de progreso */}
      <div className="mt-4 mb-6 rounded-xl border border-border bg-bg-primary p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted uppercase tracking-widest">
            Progreso
          </span>
          <span
            className={`text-sm font-bold ${minimoAlcanzado ? "text-green-400" : "text-accent-orange"}`}
          >
            {herramientas.length} / {MINIMO_HERRAMIENTAS} herramientas mínimas
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${progreso}%`,
              background: minimoAlcanzado ? "#22c55e" : "#f97316",
            }}
          />
        </div>
        {minimoAlcanzado && (
          <p className="mt-2 text-xs text-green-400">
            ✓ Mínimo alcanzado. Puedes agregar más herramientas o continuar.
          </p>
        )}
      </div>

      {/* Layout dos columnas */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* ── Formulario ── */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-accent-orange">
            Nueva herramienta
          </p>

          {/* Tipo */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
              Tipo de herramienta <span className="text-red-400">*</span>
            </label>
            <p className="mb-1 text-[11px] text-text-muted">
              El tipo determina qué operaciones puede realizar el motor CAM.
            </p>
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-orange focus:outline-none"
            >
              <option value="">Selecciona un tipo...</option>
              {tipos.map((t) => (
                <option key={t.tipo} value={t.tipo}>
                  {t.nombre} — {t.operacion}
                </option>
              ))}
            </select>
            {tipoSeleccionado && (
              <p className="mt-1 text-[11px] text-green-400">
                ✓ Operación CAM: {tipoSeleccionado.operacion}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "nombre",
              "Nombre",
              "text",
              "Ej: Fresa 10mm 4F Carburo",
              true,
            )}
            {field(
              "diametro_mm",
              "Diámetro (mm)",
              "number",
              "Diámetro de corte.",
              true,
            )}
            {field(
              "filos",
              "Número de filos",
              "number",
              "Filos o flautas.",
              true,
            )}
            {field(
              "largo_total",
              "Largo total (mm)",
              "number",
              "Longitud total.",
              true,
            )}
          </div>

          {/* Material */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
              Material <span className="text-red-400">*</span>
            </label>
            <p className="mb-1 text-[11px] text-text-muted">
              Define las velocidades de corte recomendadas por el motor CAM.
            </p>
            <select
              value={form.material_herramienta}
              onChange={(e) =>
                setForm((f) => ({ ...f, material_herramienta: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-orange focus:outline-none"
            >
              <option value="">Selecciona material...</option>
              {MATERIALES_HERRAMIENTA.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Recubrimiento */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
              Recubrimiento
            </label>
            <select
              value={form.recubrimiento}
              onChange={(e) =>
                setForm((f) => ({ ...f, recubrimiento: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-orange focus:outline-none"
            >
              {RECUBRIMIENTOS.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.label} — {r.descripcion}
                </option>
              ))}
            </select>
            {recubrimientoSeleccionado && (
              <p className="mt-1 text-[11px] text-text-muted">
                ℹ {recubrimientoSeleccionado.descripcion}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "vida_util_horas",
              "Vida útil (horas)",
              "number",
              "Opcional.",
            )}
            {/* Precio COP */}
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
                Costo unitario
              </label>
              <p className="mb-1 text-[11px] text-text-muted">
                Opcional. Para control de costos.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-primary px-3 py-2">
                <span className="text-xs font-semibold text-text-muted whitespace-nowrap">
                  COP $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    form.costo_unitario ? formatCOP(form.costo_unitario) : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setForm((f) => ({ ...f, costo_unitario: raw }));
                  }}
                  placeholder="28500"
                  className="flex-1 bg-transparent text-sm text-text-primary outline-none"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {exito && <p className="text-sm text-green-400">{exito}</p>}

          <button
            onClick={handleAgregar}
            disabled={loading}
            className="w-full rounded-lg border border-accent-orange px-4 py-2.5 text-sm font-semibold text-accent-orange hover:bg-accent-orange hover:text-white transition disabled:opacity-50"
          >
            {loading ? "Guardando..." : "+ Agregar herramienta"}
          </button>
        </div>

        {/* ── Lista herramientas ── */}
        <div>
          <p className="mb-3 text-xs uppercase tracking-widest text-text-muted">
            Herramientas registradas
          </p>
          {herramientas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-xs text-text-muted">
                Aún no hay herramientas registradas.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {herramientas.map((h, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg-primary px-3 py-2"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-text-primary leading-tight">
                      {h.nombre}
                    </p>
                    <span className="text-green-400 text-xs ml-2 shrink-0">
                      ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {h.tipo} · ⌀{h.diametro_mm} mm
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botón continuar */}
      <button
        onClick={() => setStep("confirmacion")}
        disabled={!minimoAlcanzado}
        className="mt-6 w-full rounded-lg bg-accent-orange px-4 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
      >
        Continuar → ({herramientas.length}/{MINIMO_HERRAMIENTAS} herramientas)
      </button>
    </div>
  );
}
