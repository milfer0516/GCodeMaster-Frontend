import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";

export function EstadoMaquina() {
  return (
    <div className="rounded-xl md:rounded-2xl border border-border bg-bg-surface p-4 md:p-6 w-full">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <Activity className="h-5 w-5 md:h-6 md:w-6 text-accent-blue" />
        <h2 className="text-base md:text-lg font-semibold text-text-primary">
          Estado Máquina
        </h2>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between p-3 md:p-4 rounded-lg md:rounded-xl bg-bg-primary border border-border">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-text-primary truncate">
                CNC Haas VF-2
              </p>
              <p className="text-[10px] md:text-xs text-text-muted">
                Operativa
              </p>
            </div>
          </div>
          <span className="px-2 md:px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] md:text-xs font-medium whitespace-nowrap ml-2">
            100%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 md:p-4 rounded-lg md:rounded-xl bg-bg-primary border border-border">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-yellow-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-text-primary truncate">
                Torno DMG CTX
              </p>
              <p className="text-[10px] md:text-xs text-text-muted">
                Mantenimiento
              </p>
            </div>
          </div>
          <span className="px-2 md:px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] md:text-xs font-medium whitespace-nowrap ml-2">
            0%
          </span>
        </div>
      </div>
    </div>
  );
}
