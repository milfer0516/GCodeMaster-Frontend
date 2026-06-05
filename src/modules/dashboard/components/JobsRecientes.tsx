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
    <div className="w-full max-w-full rounded-xl border border-border bg-bg-surface p-3 md:p-6">
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-6">
        <History className="h-5 w-5 text-accent-blue flex-shrink-0" />
        <h2 className="text-base md:text-lg font-semibold text-text-primary">
          Jobs Recientes
        </h2>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-text-muted uppercase">
                Archivo
              </th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-text-muted uppercase">
                Estado
              </th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-text-muted uppercase">
                Tiempo
              </th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-text-muted uppercase">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {JOBS.map((job) => (
              <tr key={job.id} className="hover:bg-bg-elevated transition">
                <td className="px-2 md:px-4 py-2 md:py-3">
                  <p className="text-xs md:text-sm font-medium text-text-primary truncate max-w-[200px]">
                    {job.nombre}
                  </p>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      job.estado === "completado"
                        ? "bg-green-500/10 text-green-400"
                        : job.estado === "en_proceso"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {job.estado === "completado" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : job.estado === "en_proceso" ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    <span>
                      {job.estado === "completado"
                        ? "Completado"
                        : job.estado === "en_proceso"
                          ? "En proceso"
                          : "Error"}
                    </span>
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3">
                  <p className="text-xs md:text-sm text-text-muted whitespace-nowrap">
                    {job.tiempo}
                  </p>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3">
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
  );
}
