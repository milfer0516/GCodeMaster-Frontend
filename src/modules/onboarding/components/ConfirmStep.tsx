import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "../store/onboardingStore";
import { useAuthStore } from "../../auth/store/authStore";
import { completarSetup } from "../../../services/onboardingService";
import { familiaLabel } from "../../../services/toolingService";

export function ConfirmStep() {
  const navigate = useNavigate();
  const { maquina, herramientas, reset } = useOnboardingStore();
  const setOnboardingCompleto = useAuthStore((s) => s.setOnboardingCompleto);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinalizar = async () => {
    setLoading(true);
    setError("");
    try {
      await completarSetup();
      setOnboardingCompleto(true);
      reset();
      navigate("/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al finalizar el setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-2 text-3xl">🎉</div>
      <h2 className="text-xl font-bold text-text-primary">
        ¡Configuración lista!
      </h2>
      <p className="mt-2 text-sm text-text-muted leading-relaxed">
        Tu entorno de trabajo está configurado. El motor CAM usará estos datos
        para generar G-Code optimizado.
      </p>

      {/* Resumen máquina */}
      <div className="mt-6 rounded-xl border border-border bg-bg-primary p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-accent-blue">
          Máquina registrada
        </p>
        {maquina ? (
          <div>
            <p className="font-semibold text-text-primary">{maquina.nombre}</p>
            <p className="text-xs text-text-muted">
              {maquina.marca} · {maquina.modelo}
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-muted">Sin datos de máquina.</p>
        )}
      </div>

      {/* Resumen herramientas */}
      <div className="mt-4 rounded-xl border border-border bg-bg-primary p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-accent-blue">
          Herramientas registradas ({herramientas.length})
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {herramientas.map((h) => (
            <div
              key={h.id_herramienta_instancia}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-text-primary">{h.nombre}</p>
                <p className="text-[11px] text-text-muted">
                  {familiaLabel(h.familia)}
                  {h.diametro_mm != null ? ` · ⌀${h.diametro_mm} mm` : ""}
                  {h.longitud_util_real_mm != null
                    ? ` · útil ${h.longitud_util_real_mm} mm`
                    : ""}
                </p>
              </div>
              <span className="text-accent-green text-xs">✓</span>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-accent-red">{error}</p>}

      <button
        onClick={handleFinalizar}
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-accent-blue px-4 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
      >
        {loading ? "Finalizando..." : "Ir al Dashboard →"}
      </button>
    </div>
  );
}
