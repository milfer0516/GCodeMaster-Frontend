import { Check, Lock, Star } from "lucide-react";

const plans = [
  {
    name: "Demo",
    price: "$0",
    period: "7 dias",
    highlighted: false,
    features: [
      "Lectura de archivos STEP",
      "Analisis geometrico automatico",
      "Visualizacion de G-Code en pantalla",
      "Descarga bloqueada",
      "Simulacion 3D bloqueada"
    ]
  },
  {
    name: "Prueba",
    price: "$700K",
    period: "COP / mes",
    highlighted: false,
    features: [
      "Todo lo del plan Demo",
      "Descarga de G-Code FANUC",
      "Simulacion 3D",
      "Acceso a jobs",
      "Soporte basico"
    ]
  },
  {
    name: "Estandar",
    price: "$1.000K",
    period: "COP / mes",
    highlighted: true,
    features: [
      "Todo lo del plan Prueba",
      "Asistente IA CNC",
      "Herramientas propias",
      "Materiales frecuentes",
      "Historial completo"
    ]
  },
  {
    name: "Anual",
    price: "$10.000K",
    period: "COP / año",
    highlighted: false,
    features: [
      "Todo lo del plan Estandar",
      "2 meses gratis",
      "Soporte prioritario",
      "Onboarding personalizado",
      "Beta features"
    ]
  }
] as const;

export function PricingSection() {
  return (
    <section id="planes" className="border-b border-border bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Encabezado de precios: claro y directo para clientes potenciales */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-blue">Planes</p>
          <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.03em] text-text-primary">
            Diseñado para talleres CNC que quieren crecer sin fricción
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
            Empieza gratis, prueba el flujo completo y luego escala al plan que mejor encaje con
            el nivel de operación de tu taller.
          </p>
        </div>

        {/* Cuadrícula de planes: una propuesta escalonada para capturar distintos perfiles */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={[
                "relative rounded-2xl border p-5 shadow-soft transition hover:-translate-y-1",
                plan.highlighted
                  ? "border-accent-blue/60 bg-bg-surface ring-1 ring-accent-blue/20"
                  : "border-border bg-bg-surface"
              ].join(" ")}
            >
              {plan.highlighted ? (
                <div className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent-blue/40 bg-accent-blue px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  <Star className="h-3.5 w-3.5 fill-white" />
                  Mas elegido
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-accent-amber">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-text-muted">
                    {plan.period}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated p-2 text-accent-blue">
                  <Lock className="h-4 w-4" />
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={[
                  "mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold transition",
                  plan.highlighted
                    ? "bg-accent-blue text-white hover:brightness-110"
                    : "border border-border text-text-primary hover:border-accent-blue hover:text-accent-blue"
                ].join(" ")}
              >
                {plan.highlighted ? "Elegir plan" : "Ver detalles"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
