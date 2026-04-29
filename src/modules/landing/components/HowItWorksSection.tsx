import {
  ArrowRight,
  FileUp,
  ScanSearch,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

const steps = [
  {
    icon: FileUp,
    number: "01",
    title: "Sube tu archivo STEP",
    description:
      "Cargas tu archivo desde tu computador y el proceso de análisis comienza sin salir de tu equipo.",
  },
  {
    icon: ScanSearch,
    number: "02",
    title: "Analisis geometrico automatico",
    description:
      "GCodeMaster CNC interpreta la geometría y detecta automáticamente todas las operaciones de mecanizado requeridas  en segundos. Sin configuración manual, sin experiencia en programación CAM.",
  },
  {
    icon: SlidersHorizontal,
    number: "03",
    title: "Selecciona operaciones y material",
    description:
      "Ajustas qué operaciones ejecutar, eliges el material y el sistema calcula los parámetros de corte.",
  },
  {
    icon: Sparkles,
    number: "04",
    title: "Genera G-Code FANUC",
    description:
      "Obtienes el código listo para revisar, validar y descargar según tu plan activo.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="casos-de-uso"
      className="border-b border-border bg-bg-primary px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Encabezado: explica el flujo de uso en lenguaje simple para clientes nuevos */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-blue">
            Como funciona
          </p>
          <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.03em] text-text-primary">
            De archivo STEP a G-Code en un flujo simple y guiado
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
            Diseñamos el recorrido para que un taller entienda el valor en
            minutos, sin curvas de aprendizaje largas ni herramientas pesadas.
          </p>
        </div>

        {/* Tarjetas del flujo: cada paso se muestra como una etapa clara del proceso */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <article
                key={step.number}
                className="relative rounded-2xl border border-border bg-bg-surface p-5 shadow-soft"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-elevated text-accent-blue">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-accent-amber">
                      Paso {step.number}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-text-primary">
                      {step.title}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-text-muted">
                  {step.description}
                </p>

                {!isLast ? (
                  <div className="pointer-events-none absolute right-[-12px] top-1/2 hidden -translate-y-1/2 xl:flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-primary text-accent-blue shadow-soft">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {/* Cierre breve para reforzar el valor del proceso guiado */}
        <div className="mt-8 rounded-2xl border border-border bg-bg-surface px-5 py-4 text-center text-sm text-text-muted">
          Menos fricción para el cliente, más velocidad para el taller y un
          resultado más consistente en cada job.
        </div>
      </div>
    </section>
  );
}
