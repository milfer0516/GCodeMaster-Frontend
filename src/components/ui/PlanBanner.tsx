// src/components/ui/PlanBanner.tsx
import { useState } from "react";
import { usePlanInfo } from "../../hooks/usePlanInfo";
import { AlertTriangle, Zap, Clock, CalendarDays } from "lucide-react";
import { PlanesModal } from "./PlanesModal";

export function PlanBanner() {
  const [modalOpen, setModalOpen] = useState(false);

  const {
    plan,
    diasRestantes,
    diasTranscurridos,
    vencido,
    labelPlan,
    colorBadge,
    mensajeUpgrade,
    mostrarUpgrade,
  } = usePlanInfo();

  if (!mostrarUpgrade) return null;

  const esUrgente = vencido || (diasRestantes !== null && diasRestantes <= 3);

  const bannerColor = esUrgente
    ? "border-red-500/20 bg-red-500/5"
    : plan === "demo"
      ? "border-yellow-500/20 bg-yellow-500/5"
      : "border-blue-500/20 bg-blue-500/5";

  const iconColor = esUrgente
    ? "text-red-400"
    : plan === "demo"
      ? "text-yellow-400"
      : "text-blue-400";

  const btnColor = esUrgente
    ? "bg-red-500 hover:bg-red-600"
    : plan === "demo"
      ? "bg-yellow-500 hover:bg-yellow-600"
      : "bg-accent-blue hover:bg-accent-blue/90";

  const textoDias = () => {
    if (vencido) return "Plan vencido";
    if (
      plan === "demo" &&
      diasTranscurridos !== null &&
      diasRestantes !== null
    ) {
      return `Día ${diasTranscurridos + 1} de 7 — ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`;
    }
    if (diasRestantes !== null) {
      const meses = Math.floor(diasRestantes / 30);
      const dias = diasRestantes % 30;
      if (meses > 0)
        return `${meses} mes${meses !== 1 ? "es" : ""} y ${dias} día${dias !== 1 ? "s" : ""} restantes`;
      return `${diasRestantes} día${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`;
    }
    return null;
  };

  return (
    <>
      <div className={`rounded-xl border p-3 ${bannerColor}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Lado izquierdo */}
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 ${iconColor}`}>
              {esUrgente ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Badge plan */}
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${colorBadge}`}
              >
                {labelPlan}
              </span>

              {/* Días restantes */}
              {textoDias() && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${esUrgente ? "text-red-400" : "text-text-muted"}`}
                >
                  <Clock className="h-3 w-3" />
                  {textoDias()}
                </span>
              )}

              {/* Días transcurridos */}
              {diasTranscurridos !== null && plan === "demo" && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <CalendarDays className="h-3 w-3" />
                  Activado hace {diasTranscurridos} día
                  {diasTranscurridos !== 1 ? "s" : ""}
                </span>
              )}

              {/* Mensaje */}
              <span className="text-xs text-text-muted hidden sm:inline">
                — {mensajeUpgrade}
              </span>
            </div>
          </div>

          {/* Botón */}
          <button
            onClick={() => setModalOpen(true)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition active:scale-[0.98] ${btnColor}`}
          >
            {plan === "demo" ? "Ver planes →" : "Mejorar a Premium →"}
          </button>
        </div>
      </div>

      <PlanesModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
