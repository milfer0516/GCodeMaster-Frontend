import { Calendar, Clock, TrendingUp } from "lucide-react";

export function ResumenPlan() {
  return (
    <div className="rounded-xl md:rounded-2xl border border-border bg-bg-surface p-4 md:p-6 w-full">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <Calendar className="h-5 w-5 md:h-6 md:w-6 text-accent-blue" />
        <h2 className="text-base md:text-lg font-semibold text-text-primary">
          Plan de Producción
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full">
        <div className="p-3 md:p-4 rounded-lg md:rounded-xl bg-bg-primary border border-border w-full">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-accent-blue" />
            <p className="text-[10px] md:text-xs font-medium text-text-muted uppercase tracking-wider">
              En Proceso
            </p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-text-primary">3</p>
          <p className="text-[10px] md:text-xs text-text-muted mt-1">
            Jobs activos
          </p>
        </div>

        <div className="p-3 md:p-4 rounded-lg md:rounded-xl bg-bg-primary border border-border w-full">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
            <p className="text-[10px] md:text-xs font-medium text-text-muted uppercase tracking-wider">
              Completados
            </p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-text-primary">12</p>
          <p className="text-[10px] md:text-xs text-text-muted mt-1">
            Esta semana
          </p>
        </div>

        <div className="p-3 md:p-4 rounded-lg md:rounded-xl bg-bg-primary border border-border w-full sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-yellow-400" />
            <p className="text-[10px] md:text-xs font-medium text-text-muted uppercase tracking-wider">
              Pendientes
            </p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-text-primary">7</p>
          <p className="text-[10px] md:text-xs text-text-muted mt-1">
            Programados
          </p>
        </div>
      </div>
    </div>
  );
}
