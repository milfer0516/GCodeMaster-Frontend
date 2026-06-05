import { History, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const JOBS = [
  {
    id: 1,
    nombre: "Pieza_A_v3.step",
    estado: "completado",
    tiempo: "2h 15min",
    fecha: "Hace 3 horas",
  },
  {
    id: 2,
    nombre: "Engranaje_B2.step",
    estado: "en_proceso",
    tiempo: "45min",
    fecha: "Activo",
  },
  {
    id: 3,
    nombre: "Soporte_CNC.step",
    estado: "error",
    tiempo: "1h 30min",
    fecha: "Hace 1 día",
  },
];

export function JobsRecientes() {
  return (
    <div className="rounded-xl md:rounded-2xl border border-border bg-bg-surface p-4 md:p-6 w-full">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <History className="h-5 w-5 md:h-6 md:w-6 text-accent-blue" />
        <h2 className="text-base md:text-lg font-semibold text-text-primary">
          Jobs Recientes
        </h2>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle px-4 md:px-0">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-text-muted uppercase tracking-wider">
                  Archivo
                </th>
                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-text-muted uppercase tracking-wider">
                  Estado
                </th>
                <th className="hidden sm:table-cell px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-text-muted uppercase tracking-wider">
                  Tiempo
                </th>
                <th className="hidden md:table-cell px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-text-muted uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {JOBS.map((job) => (
                <tr key={job.id} className="hover:bg-bg-elevated transition">
                  <td className="px-2 md:px-4 py-2 md:py-3">
                    <p className="text-xs md:text-sm font-medium text-text-primary truncate max-w-[120px] md:max-w-none">
                      {job.nombre}
                    </p>
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3">
                    <span
                      className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                        job.estado === "completado"
                          ? "bg-green-500/10 text-green-400"
                          : job.estado === "en_proceso"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {job.estado === "completado" ? (
                        <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      ) : job.estado === "en_proceso" ? (
                        <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      ) : (
                        <AlertCircle className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      )}
                      <span className="hidden sm:inline">
                        {job.estado === "completado"
                          ? "Completado"
                          : job.estado === "en_proceso"
                            ? "En proceso"
                            : "Error"}
                      </span>
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 md:px-4 py-2 md:py-3">
                    <p className="text-xs md:text-sm text-text-muted whitespace-nowrap">
                      {job.tiempo}
                    </p>
                  </td>
                  <td className="hidden md:table-cell px-2 md:px-4 py-2 md:py-3">
                    <p className="text-xs md:text-sm text-text-muted whitespace-nowrap">
                      {job.fecha}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
