import { ArrowRight, BookOpenText, Gauge, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const articles = [
  {
    icon: Gauge,
    category: "Parametros de corte",
    title: "Como ajustar Vc y Fz en acero 1020 sin perder productividad",
    excerpt:
      "Explicamos como traducir la teoria de mecanizado a decisiones utiles en el taller, con enfoque en herramientas, velocidad y avance."
  },
  {
    icon: Wrench,
    category: "Herramientas",
    title: "Fresa, broca o escariador: como elegir la herramienta correcta segun la operacion",
    excerpt:
      "Una guia practica para reducir desgaste prematuro, mejorar acabado superficial y evitar errores comunes al programar."
  },
  {
    icon: BookOpenText,
    category: "G-Code FANUC",
    title: "Buenas practicas de G-Code para talleres que estan automatizando su flujo",
    excerpt:
      "Revisamos convenciones, estructura de programa y puntos de control para producir codigo mas claro, estable y seguro."
  }
] as const;

export function BlogSection() {
  return (
    <section id="blog-tecnico" className="border-b border-border bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Blog tecnico: contenido SEO para posicionar la marca antes del registro */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-blue">Blog Tecnico</p>
          <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.03em] text-text-primary">
            Articulos tecnicos para CNC, G-Code, materiales y mecanizado
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
            Publicamos contenido pensado para atraer trafico organico de Google y posicionar a
            GCodeMaster CNC como una referencia tecnica en el sector metalmecanico colombiano.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => {
            const Icon = article.icon;

            return (
              <article
                key={article.title}
                className="rounded-2xl border border-border bg-bg-surface p-5 shadow-soft transition hover:-translate-y-1 hover:border-accent-blue/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-elevated text-accent-blue">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-border bg-bg-elevated px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    {article.category}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold leading-7 text-text-primary">
                  {article.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-text-muted">{article.excerpt}</p>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Lectura tecnica
                  </span>
                  <span className="text-sm font-medium text-accent-blue">5 min</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-bg-surface px-5 py-4">
          <p className="text-sm text-text-muted">
            Si quieres recibir este tipo de contenido y probar el flujo completo, empieza con una
            cuenta gratuita.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
