import { useCamStore } from "../../store/camStore";
import { WizardNavButtons } from "./WizardNavButtons";
import { AlertCircle, CheckCircle, Wrench, Gauge, Layers } from "lucide-react";
import { formatMm } from "../../../../utils/format";
import { totalOnAxis, cylTotals } from "../../utils/stockFaces";

export const StepResumen = () => {
  const engineResponse = useCamStore((s) => s.engineResponse);
  const stockConfig = useCamStore((s) => s.stockConfig);
  const setup = useCamStore((s) => s.setup);
  const material = useCamStore((s) => s.material);

  // Read-only RESULTING stock size, DERIVED from part dims + per-region offsets
  // (never a stored/typed value).
  const stockResultante = ((): string => {
    if (!setup) return "—";
    if (stockConfig.tipo === "rectangular") {
      const tx = totalOnAxis(stockConfig.stockFaces, setup, "x");
      const ty = totalOnAxis(stockConfig.stockFaces, setup, "y");
      const tz = totalOnAxis(stockConfig.stockFaces, setup, "z");
      return `${formatMm(tx)} × ${formatMm(ty)} × ${formatMm(tz)} mm`;
    }
    const { diameter, length } = cylTotals(
      setup.rotatedBBox,
      stockConfig.cyl,
      setup.partCylinderOD,
      setup.partCylinderLen,
    );
    return `Ø${formatMm(diameter)} × ${formatMm(length)} mm`;
  })();

  // Display engine's Spanish validation error if stock is too small
  if (engineResponse?.error) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-text-primary">
            Validación de Material
          </h2>
          <p className="mt-1 text-xs md:text-sm text-text-muted">
            El motor CAM detectó un problema con el material bruto
          </p>
        </div>

        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 md:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm md:text-base font-semibold text-red-300">
                Material insuficiente
              </p>
              <p className="mt-2 text-xs md:text-sm text-red-200">
                {engineResponse.error}
              </p>
              <button
                onClick={() => useCamStore.getState().setStep("stock")}
                className="mt-4 rounded-xl border border-red-500/60 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-500/30 transition"
              >
                ← Volver a configurar material bruto
              </button>
            </div>
          </div>
        </div>

        <WizardNavButtons
          prevStep="operaciones"
          nextStep="simulacion"
          canAdvance={false}
        />
      </div>
    );
  }

  // Display engine's manufacturing plan when available
  const plan = engineResponse?.plan_mecanizado;
  const params = engineResponse?.parametros_corte;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Plan de Mecanizado
        </h2>
        <p className="mt-1 text-xs md:text-sm text-text-muted">
          Revisión del plan calculado por el motor CAM
        </p>
      </div>

      {/* Material bruto ingresado */}
      <div className="rounded-xl border border-border bg-bg-elevated p-4 md:p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Material Bruto
        </h3>
        <div className="space-y-2 text-xs md:text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Forma:</span>
            <span className="font-medium text-text-primary">
              {stockConfig.tipo === "rectangular" ? "Rectangular" : "Cilíndrico"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Material bruto resultante:</span>
            <span className="font-mono text-text-primary">{stockResultante}</span>
          </div>
          {material && (
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-text-muted">Material:</span>
              <span className="font-medium text-text-primary">
                {material.nombre}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Engine's manufacturing plan */}
      {plan && (
        <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-accent-blue" />
            <h3 className="text-sm font-semibold text-text-primary">
              Material a Remover
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
            {plan.por_eje && (
              <>
                {plan.por_eje.x && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Eje X:</span>
                    <span className="font-mono text-text-primary">{plan.por_eje.x} mm</span>
                  </div>
                )}
                {plan.por_eje.y && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Eje Y:</span>
                    <span className="font-mono text-text-primary">{plan.por_eje.y} mm</span>
                  </div>
                )}
                {plan.por_eje.z && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Eje Z:</span>
                    <span className="font-mono text-text-primary">{plan.por_eje.z} mm</span>
                  </div>
                )}
              </>
            )}
            {plan.radial_por_lado && (
              <div className="flex justify-between">
                <span className="text-text-muted">Radial (por lado):</span>
                <span className="font-mono text-text-primary">{plan.radial_por_lado} mm</span>
              </div>
            )}
            {plan.axial && (
              <div className="flex justify-between">
                <span className="text-text-muted">Axial:</span>
                <span className="font-mono text-text-primary">{plan.axial} mm</span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-accent-blue/20 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
            {plan.pasadas_desbaste != null && (
              <div className="flex justify-between">
                <span className="text-text-muted">Pasadas desbaste:</span>
                <span className="font-mono text-accent-blue">{plan.pasadas_desbaste}</span>
              </div>
            )}
            {plan.pasadas_acabado != null && (
              <div className="flex justify-between">
                <span className="text-text-muted">Pasadas acabado:</span>
                <span className="font-mono text-accent-blue">{plan.pasadas_acabado}</span>
              </div>
            )}
            {plan.profundidad_corte_mm != null && (
              <div className="flex justify-between">
                <span className="text-text-muted">Prof. de corte:</span>
                <span className="font-mono text-text-primary">{plan.profundidad_corte_mm} mm</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Engine's cutting parameters */}
      {params && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="h-5 w-5 text-green-400" />
            <h3 className="text-sm font-semibold text-text-primary">
              Parámetros de Corte
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
            {params.rpm != null && (
              <div className="flex justify-between">
                <span className="text-text-muted">Velocidad husillo:</span>
                <span className="font-mono text-green-300">{params.rpm} RPM</span>
              </div>
            )}
            {params.feed_mm_min != null && (
              <div className="flex justify-between">
                <span className="text-text-muted">Avance:</span>
                <span className="font-mono text-green-300">{params.feed_mm_min} mm/min</span>
              </div>
            )}
            {params.vc_m_min != null && (
              <div className="flex justify-between">
                <span className="text-text-muted">Velocidad corte:</span>
                <span className="font-mono text-text-primary">{params.vc_m_min} m/min</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Placeholder when engine hasn't been called yet */}
      {!plan && !params && !engineResponse?.error && (
        <div className="rounded-xl border border-border bg-bg-elevated/50 p-6 text-center">
          <Wrench className="h-8 w-8 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            El plan de mecanizado se calculará al generar el G-Code
          </p>
        </div>
      )}

      <WizardNavButtons
        prevStep="operaciones"
        nextStep="simulacion"
        canAdvance={true}
      />
    </div>
  );
};
