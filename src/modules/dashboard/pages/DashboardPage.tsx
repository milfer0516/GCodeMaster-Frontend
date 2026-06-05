import { EstadoMaquina } from "../components/EstadoMaquina";
import { JobsRecientes } from "../components/JobsRecientes";
import { ResumenPlan } from "../components/ResumenPlan";

export function DashboardPage() {
  return (
    <div className="w-full max-w-full space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          Vista general del sistema CNC
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-full">
        <EstadoMaquina />
        <div className="lg:col-span-2">
          <ResumenPlan />
        </div>
      </div>

      <JobsRecientes />
    </div>
  );
}
