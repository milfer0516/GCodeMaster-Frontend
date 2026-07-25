// src/modules/onboarding/components/HerramientasStep.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Paso 2 del onboarding — declarar las herramientas que la empresa YA TIENE.
//
// Construido sobre el sistema de tres niveles (/tooling/*): el operador
// reconoce su herramienta en el catálogo global y solo mide la longitud útil
// de su pieza física. No escribe geometría, filos ni material.
//
// El backend cuenta instancias físicas (Tier 3) para el mínimo de 5, así que
// la fuente de verdad de esta pantalla es GET /tooling/instancias.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Plus, Trash2, Ruler } from "lucide-react";
import { useOnboardingStore } from "../store/onboardingStore";
import { AgregarHerramientaModal } from "../../tools/components/AgregarHerramientaModal";
import {
  getInstancias,
  eliminarInstancia,
  cuentaParaElMinimo,
  familiaLabel,
  type Instancia,
} from "../../../services/toolingService";

const MINIMO_HERRAMIENTAS = 5;

export function HerramientasStep() {
  const { setStep, herramientas, setHerramientas, agregarHerramienta, quitarHerramienta } =
    useOnboardingStore();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);

  // Sincronizar con el backend al entrar (el operador puede volver al paso).
  useEffect(() => {
    getInstancias()
      .then((instancias) => {
        setHerramientas(instancias.map(aHerramientaFisica));
        setError("");
      })
      .catch(() =>
        setError("No se pudieron cargar las herramientas registradas."),
      )
      .finally(() => setCargando(false));
  }, []);

  // Misma regla que el gate del backend: solo cuentan las que están en servicio.
  const total = herramientas.filter(cuentaParaElMinimo).length;
  const minimoAlcanzado = total >= MINIMO_HERRAMIENTAS;
  const progreso = Math.min((total / MINIMO_HERRAMIENTAS) * 100, 100);
  const faltan = Math.max(MINIMO_HERRAMIENTAS - total, 0);

  const handleEliminar = async (idInstancia: number) => {
    setEliminando(idInstancia);
    try {
      await eliminarInstancia(idInstancia);
      quitarHerramienta(idInstancia);
    } catch {
      setError("No se pudo quitar la herramienta.");
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary">
        Paso 2 — Tus herramientas
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        Busca en el catálogo las herramientas que{" "}
        <strong className="text-text-primary">
          tienes físicamente en el taller
        </strong>{" "}
        y selecciónalas. Los datos técnicos ya están en el catálogo: tú solo
        mides la longitud útil de cada pieza.
      </p>

      {/* Progreso hacia el mínimo */}
      <div className="mb-6 mt-4 rounded-xl border border-border bg-bg-primary p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-text-muted">
            Progreso
          </span>
          <span
            className={`text-sm font-bold ${
              minimoAlcanzado ? "text-accent-green" : "text-accent-blue"
            }`}
          >
            {total} de {MINIMO_HERRAMIENTAS} herramientas registradas
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              minimoAlcanzado ? "bg-accent-green" : "bg-accent-blue"
            }`}
            style={{ width: `${progreso}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {minimoAlcanzado
            ? "✓ Mínimo alcanzado. Puedes agregar más herramientas o continuar."
            : `Faltan ${faltan} para habilitar el sistema.`}
        </p>
      </div>

      <button
        onClick={() => setModalAbierto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent-blue bg-accent-blue/5 px-4 py-3 text-sm font-semibold text-accent-blue transition hover:bg-accent-blue/10"
      >
        <Plus className="h-4 w-4" /> Buscar en el catálogo y agregar
      </button>

      {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}

      {/* Lista de herramientas físicas */}
      <div className="mt-6">
        <p className="mb-3 text-xs uppercase tracking-widest text-text-muted">
          Herramientas registradas
        </p>

        {cargando ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          </div>
        ) : herramientas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-text-muted">
              Aún no has registrado herramientas.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Empieza por las que más usas: fresas planas y brocas.
            </p>
          </div>
        ) : (
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {herramientas.map((h) => (
              <div
                key={h.id_herramienta_instancia}
                className="flex items-start justify-between rounded-lg border border-border bg-bg-primary px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {h.nombre}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {familiaLabel(h.familia)}
                    {h.diametro_mm != null ? ` · Ø${h.diametro_mm} mm` : ""}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-accent-blue">
                    <Ruler className="h-3 w-3" />
                    Longitud útil medida:{" "}
                    {h.longitud_util_real_mm != null
                      ? `${h.longitud_util_real_mm} mm`
                      : "—"}
                  </p>
                </div>
                <button
                  onClick={() => handleEliminar(h.id_herramienta_instancia)}
                  disabled={eliminando === h.id_herramienta_instancia}
                  className="ml-2 shrink-0 rounded-lg p-1.5 text-text-muted transition hover:text-accent-red disabled:opacity-50"
                  title="Quitar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setStep("confirmacion")}
        disabled={!minimoAlcanzado}
        className="mt-6 w-full rounded-lg bg-accent-blue px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-accent-blue/90 disabled:opacity-50"
      >
        Continuar → ({total}/{MINIMO_HERRAMIENTAS} herramientas)
      </button>

      <AgregarHerramientaModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onRegistrada={(inst) => agregarHerramienta(aHerramientaFisica(inst))}
        permitirEncadenar
      />
    </div>
  );
}

function aHerramientaFisica(inst: Instancia) {
  return {
    id_herramienta_instancia: inst.id_herramienta_instancia,
    nombre: inst.nombre ?? "Herramienta",
    familia: inst.familia,
    diametro_mm: inst.diametro_mm,
    longitud_util_real_mm: inst.longitud_util_real_mm,
    estado: inst.estado,
  };
}
