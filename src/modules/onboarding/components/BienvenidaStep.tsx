import { useOnboardingStore } from "../store/onboardingStore";

export function BienvenidaStep() {
  const setStep = useOnboardingStore((s) => s.setStep);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 text-5xl">⚙️</div>
      <h1 className="text-2xl font-bold text-text-primary">
        Bienvenido a GCodeMaster CNC
      </h1>
      <p className="mt-3 text-sm text-text-muted max-w-md leading-relaxed">
        Antes de comenzar necesitamos configurar tu entorno de trabajo. Este
        proceso se realiza{" "}
        <strong className="text-text-primary">una sola vez</strong>.
      </p>

      <div className="mt-6 w-full rounded-xl border border-border bg-bg-primary p-4 text-left space-y-3">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          Lo que haremos:
        </p>
        <div className="flex items-start gap-3">
          <span className="text-accent-orange font-bold">1.</span>
          <p className="text-sm text-text-primary">
            Registrar tu máquina CNC — define los límites físicos del proceso.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-accent-orange font-bold">2.</span>
          <p className="text-sm text-text-primary">
            Registrar tus herramientas reales — el motor CAM las usará para
            calcular avances, velocidades y profundidades.
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-text-muted">
        ⚠ Las herramientas que registres deben existir físicamente en tu taller.
        El motor CAM solo trabaja con herramientas disponibles en tu inventario.
      </p>

      <button
        onClick={() => setStep("maquina")}
        className="mt-8 w-full rounded-lg bg-accent-orange px-4 py-3 text-sm font-bold uppercase tracking-widest text-white"
      >
        Comenzar configuración
      </button>
    </div>
  );
}
