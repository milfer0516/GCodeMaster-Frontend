import { BadgeInfo, Banknote, ShieldAlert } from "lucide-react";

const featureCards = [
  {
    icon: Banknote,
    title: "Licencias CAM caras",
    value: "$3.000 - $15.000 USD / año",
    description: "Evita costos de software internacional que presionan el margen del taller."
  },
  {
    icon: ShieldAlert,
    title: "Programador CNC costoso",
    value: "$3.000.000 - $4.000.000 COP / mes",
    description: "Reduce la dependencia de una sola persona para preparar trabajos repetitivos."
  },
  {
    icon: BadgeInfo,
    title: "Paradas no planeadas",
    value: "$2.000.000 COP por hora",
    description: "Disminuye tiempos muertos causados por errores de programación o ajustes manuales."
  }
] as const;

export function FeaturesSection() {
  return (
    <section id="funciones" className="border-b border-border bg-bg-primary px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Introduccion breve para contextualizar el impacto economico */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-blue">Impacto en el taller</p>
          <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.03em] text-text-primary">
            Tu propiedad intelectual <span className="text-accent-blue">nunca</span> sale de tu taller
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
            La plataforma reduce costos operativos y protege tus procesos porque el archivo STEP
            se procesa localmente en tu equipo.
          </p>
        </div>

        {/* Tarjetas de valor: tres dolores de negocio que la landing debe resolver */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-2xl border border-border bg-bg-surface p-5 shadow-soft transition hover:-translate-y-1 hover:border-accent-blue/60"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-elevated text-accent-blue">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{card.title}</p>
                    <p className="mt-1 text-lg font-bold text-accent-amber">{card.value}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-text-muted">{card.description}</p>
              </article>
            );
          })}
        </div>

        {/* Cierre visual para conectar con el flujo de seguridad del producto */}
        <div className="mt-8 rounded-2xl border border-border bg-bg-surface px-5 py-4 text-center text-sm text-text-muted">
          Seguridad, trazabilidad y ahorro en una sola experiencia pensada para talleres CNC.
        </div>
      </div>
    </section>
  );
}
