// Placeholder for the onboarding machine selection step. Implemented in session 2.
import { useEffect, useState } from "react";
import { useOnboardingStore } from "../store/onboardingStore";
import {
  getCatalogoGlobal,
  registrarMaquinaDesdeCatalogo,
  registrarMaquinaManual,
} from "../../../services/onboardingService";

type Modo = "seleccion" | "catalogo" | "manual";

interface MaquinaCatalogo {
  id_maquina_global: number;
  nombre: string;
  marca: string;
  modelo: string;
  controlador: string;
  controlador_modelo: string;
  rpm_min: number;
  rpm_max: number;
  potencia_kw: number;
  cono: string;
  avance_max: number;
  recorrido_x: number;
  recorrido_y: number;
  recorrido_z: number;
  atc_slots: number;
}

export function MachineStep() {
  const { setStep, setMaquina } = useOnboardingStore();

  const [modo, setModo] = useState<Modo>("seleccion");
  const [catalogo, setCatalogo] = useState<MaquinaCatalogo[]>([]);
  const [seleccionada, setSeleccionada] = useState<MaquinaCatalogo | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Formulario manual
  const [form, setForm] = useState({
    nombre: "",
    modelo: "",
    marca: "",
    tipo: "VMC",
    controlador: "FANUC",
    controlador_modelo: "",
    rpm_min_husillo: "",
    rpm_max_husillo: "",
    potencia_husillo_kw: "",
    cono_husillo: "BT40",
    avance_max_mmmin: "",
    rapido_x_mmmin: "",
    rapido_y_mmmin: "",
    rapido_z_mmmin: "",
    recorrido_x_mm: "",
    recorrido_y_mm: "",
    recorrido_z_mm: "",
    num_herramientas_atc: "",
    diametro_herramienta_max_mm: "",
    largo_herramienta_max_mm: "",
    peso_herramienta_max_kg: "",
    refrigeracion: "taladrinas",
    descripcion: "",
  });

  useEffect(() => {
    if (modo === "catalogo" && catalogo.length === 0) {
      getCatalogoGlobal()
        .then(setCatalogo)
        .catch(() => setError("No se pudo cargar el catálogo."));
    }
  }, [modo]);

  const handleCatalogoSubmit = async () => {
    if (!seleccionada) return;
    setLoading(true);
    setError("");
    try {
      const res = await registrarMaquinaDesdeCatalogo(
        seleccionada.id_maquina_global,
      );
      setMaquina({
        id_maquina: res.id_maquina,
        nombre: seleccionada.nombre,
        marca: seleccionada.marca,
        modelo: seleccionada.modelo,
      });
      setStep("herramientas");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al registrar la máquina.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        rpm_min_husillo: Number(form.rpm_min_husillo),
        rpm_max_husillo: Number(form.rpm_max_husillo),
        potencia_husillo_kw: Number(form.potencia_husillo_kw),
        avance_max_mmmin: Number(form.avance_max_mmmin),
        rapido_x_mmmin: Number(form.rapido_x_mmmin),
        rapido_y_mmmin: Number(form.rapido_y_mmmin),
        rapido_z_mmmin: Number(form.rapido_z_mmmin),
        recorrido_x_mm: Number(form.recorrido_x_mm),
        recorrido_y_mm: Number(form.recorrido_y_mm),
        recorrido_z_mm: Number(form.recorrido_z_mm),
        num_herramientas_atc: Number(form.num_herramientas_atc),
        diametro_herramienta_max_mm: Number(form.diametro_herramienta_max_mm),
        largo_herramienta_max_mm: Number(form.largo_herramienta_max_mm),
        peso_herramienta_max_kg: Number(form.peso_herramienta_max_kg),
      };
      const res = await registrarMaquinaManual(payload);
      setMaquina({
        id_maquina: res.id_maquina,
        nombre: form.nombre,
        marca: form.marca,
        modelo: form.modelo,
      });
      setStep("herramientas");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al registrar la máquina.");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    tipo: string = "text",
    ayuda?: string,
  ) => (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
        {label}
      </label>
      {ayuda && <p className="mb-1 text-[11px] text-text-muted">{ayuda}</p>}
      <input
        type={tipo}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
      />
    </div>
  );

  // ── SELECCIÓN DE MODO ──
  if (modo === "seleccion") {
    return (
      <div>
        <h2 className="text-xl font-bold text-text-primary">
          Paso 1 — Registrar máquina
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Tu máquina define los límites físicos del proceso: recorridos,
          velocidades y capacidad de herramientas. Esta configuración es{" "}
          <strong className="text-text-primary">permanente</strong> — no podrás
          modificarla después.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setModo("catalogo")}
            className="rounded-xl border border-border bg-bg-primary p-5 text-left transition hover:border-accent-blue"
          >
            <div className="text-2xl mb-2">📋</div>
            <p className="font-semibold text-text-primary">
              Seleccionar del catálogo
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Elige entre 10 máquinas VMC FANUC predefinidas. Recomendado si tu
              máquina está en la lista.
            </p>
          </button>

          <button
            onClick={() => setModo("manual")}
            className="rounded-xl border border-border bg-bg-primary p-5 text-left transition hover:border-accent-blue"
          >
            <div className="text-2xl mb-2">✏️</div>
            <p className="font-semibold text-text-primary">
              Registrar manualmente
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Ingresa los datos técnicos de tu máquina. Usa el manual del
              fabricante para mayor precisión.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ── CATÁLOGO ──
  if (modo === "catalogo") {
    return (
      <div>
        <button
          onClick={() => setModo("seleccion")}
          className="mb-4 text-xs text-accent-blue hover:underline"
        >
          ← Volver
        </button>
        <h2 className="text-xl font-bold text-text-primary">
          Selecciona tu máquina
        </h2>
        <p className="mt-1 mb-4 text-sm text-text-muted">
          Haz clic en la máquina que tienes en tu taller.
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {catalogo.map((m) => (
            <button
              key={m.id_maquina_global}
              onClick={() => setSeleccionada(m)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                seleccionada?.id_maquina_global === m.id_maquina_global
                  ? "border-accent-blue bg-bg-elevated"
                  : "border-border bg-bg-primary hover:border-accent-blue"
              }`}
            >
              <p className="font-semibold text-text-primary">{m.nombre}</p>
              <p className="text-xs text-text-muted">
                {m.marca} · {m.controlador} {m.controlador_modelo} · {m.rpm_max}{" "}
                RPM · ATC {m.atc_slots} slots
              </p>
            </button>
          ))}
        </div>

        {seleccionada && (
          <div className="mt-4 rounded-xl border border-accent-blue bg-bg-primary p-4 text-xs text-text-muted space-y-1">
            <p className="font-semibold text-text-primary mb-2">
              Especificaciones técnicas
            </p>
            <p>
              Recorrido X/Y/Z: {seleccionada.recorrido_x} /{" "}
              {seleccionada.recorrido_y} / {seleccionada.recorrido_z} mm
            </p>
            <p>Avance máximo: {seleccionada.avance_max} mm/min</p>
            <p>
              Potencia husillo: {seleccionada.potencia_kw} kW · Cono:{" "}
              {seleccionada.cono}
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}

        <button
          onClick={handleCatalogoSubmit}
          disabled={!seleccionada || loading}
          className="mt-6 w-full rounded-lg bg-accent-blue px-4 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
        >
          {loading ? "Registrando..." : "Confirmar máquina →"}
        </button>
      </div>
    );
  }

  // ── MANUAL ──
  return (
    <div>
      <button
        onClick={() => setModo("seleccion")}
        className="mb-4 text-xs text-accent-blue hover:underline"
      >
        ← Volver
      </button>
      <h2 className="text-xl font-bold text-text-primary">
        Registrar máquina manual
      </h2>
      <p className="mt-1 mb-4 text-sm text-text-muted">
        Ingresa los datos del manual del fabricante. Estos valores son críticos
        para el motor CAM.
      </p>

      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest text-accent-blue">
          Identificación
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("nombre", "Nombre", "text", "Ej: VMC Doosan 450")}
          {field("marca", "Marca", "text", "Ej: Doosan, Mazak, Haas")}
          {field("modelo", "Modelo", "text", "Ej: DNM 4500")}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
              Cono husillo
            </label>
            <select
              value={form.cono_husillo}
              onChange={(e) =>
                setForm((f) => ({ ...f, cono_husillo: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
            >
              <option>BT30</option>
              <option>BT40</option>
              <option>BT50</option>
              <option>CAT40</option>
              <option>CAT50</option>
              <option>HSK63</option>
            </select>
          </div>
        </div>

        <p className="text-xs uppercase tracking-widest text-accent-blue">
          Husillo
        </p>
        <p className="text-[11px] text-text-muted">
          Estos valores definen las velocidades de corte posibles.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("rpm_min_husillo", "RPM mínimo", "number")}
          {field("rpm_max_husillo", "RPM máximo", "number")}
          {field("potencia_husillo_kw", "Potencia (kW)", "number")}
        </div>

        <p className="text-xs uppercase tracking-widest text-accent-blue">
          Avances
        </p>
        <p className="text-[11px] text-text-muted">
          El motor CAM usa estos valores para calcular movimientos seguros.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("avance_max_mmmin", "Avance máximo (mm/min)", "number")}
          {field("rapido_x_mmmin", "Rápido X (mm/min)", "number")}
          {field("rapido_y_mmmin", "Rápido Y (mm/min)", "number")}
          {field("rapido_z_mmmin", "Rápido Z (mm/min)", "number")}
        </div>

        <p className="text-xs uppercase tracking-widest text-accent-blue">
          Recorridos
        </p>
        <p className="text-[11px] text-text-muted">
          Dimensiones máximas de la pieza que puede mecanizar.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("recorrido_x_mm", "Recorrido X (mm)", "number")}
          {field("recorrido_y_mm", "Recorrido Y (mm)", "number")}
          {field("recorrido_z_mm", "Recorrido Z (mm)", "number")}
        </div>

        <p className="text-xs uppercase tracking-widest text-accent-blue">
          Cambiador automático (ATC)
        </p>
        <p className="text-[11px] text-text-muted">
          Define cuántas herramientas puede gestionar el ATC.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("num_herramientas_atc", "Slots ATC", "number")}
          {field("diametro_herramienta_max_mm", "Diámetro máx. (mm)", "number")}
          {field("largo_herramienta_max_mm", "Largo máx. (mm)", "number")}
          {field("peso_herramienta_max_kg", "Peso máx. herr. (kg)", "number")}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
            Refrigeración
          </label>
          <select
            value={form.refrigeracion}
            onChange={(e) =>
              setForm((f) => ({ ...f, refrigeracion: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
          >
            <option value="taladrinas">Taladrinas</option>
            <option value="aire">Aire</option>
            <option value="minima_cantidad">Mínima cantidad</option>
            <option value="seco">Seco</option>
          </select>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}

      <button
        onClick={handleManualSubmit}
        disabled={loading || !form.nombre || !form.rpm_max_husillo}
        className="mt-6 w-full rounded-lg bg-accent-blue px-4 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
      >
        {loading ? "Registrando..." : "Confirmar máquina →"}
      </button>
    </div>
  );
}
