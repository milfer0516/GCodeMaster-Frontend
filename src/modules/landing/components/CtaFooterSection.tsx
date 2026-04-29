import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const productLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Funciones", href: "#funciones" },
  { label: "Blog Tecnico", href: "#blog-tecnico" },
  { label: "Casos de uso", href: "#casos-de-uso" },
  { label: "Planes", href: "#planes" }
] as const;

const accessLinks = [
  { label: "Crear cuenta", href: "/register" },
  { label: "Iniciar sesión", href: "/login" },
  { label: "Contacto", href: "#contacto" },
  { label: "Volver arriba", href: "#inicio" }
] as const;

export function CtaFooterSection() {
  return (
    <section id="contacto" className="bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* CTA final: invita a registrarse con un mensaje claro y directo */}
        <div
          className="overflow-hidden rounded-3xl border border-border bg-bg-surface p-6 shadow-soft sm:p-8 lg:p-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at top, rgb(var(--color-accent-blue) / 0.14), transparent 38%), linear-gradient(180deg, rgb(var(--color-bg-surface)) 0%, rgb(var(--color-bg-primary)) 100%)"
          }}
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-accent-blue">Listo para empezar</p>
              <h2 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] font-bold tracking-[-0.03em] text-text-primary">
                Lleva tu taller a un flujo CNC más rápido, ordenado y predecible
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
                Regístrate, vincula tu máquina y empieza a convertir archivos STEP en G-Code FANUC
                con una experiencia pensada para talleres reales.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-blue px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 sm:w-auto"
                >
                  Crear cuenta ahora
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-accent-blue hover:text-accent-blue sm:w-auto"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>

            {/* Tarjeta lateral: refuerza confianza con datos de contacto y soporte */}
            <div className="rounded-2xl border border-border bg-bg-elevated/60 p-5 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Contacto comercial</p>
              <div className="mt-4 space-y-4 text-sm text-text-muted">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" />
                  <span>ventas@gcodemaster.cnc</span>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" />
                  <span>+57 300 000 0000</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" />
                  <span>Colombia, atención para talleres CNC y manufactura</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: estructura de enlaces y cierre legal simple */}
        <footer className="mt-8 rounded-3xl border border-border bg-bg-surface px-6 py-8 sm:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
            <div className="md:col-span-2 lg:col-span-1">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-text-primary">
                GCodeMaster CNC
              </p>
              <p className="mt-3 max-w-md text-sm leading-7 text-text-muted">
                Automatización CNC para talleres que necesitan velocidad, precisión y control sin
                sacrificar su información ni su propiedad intelectual.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-text-primary">Producto</p>
              <ul className="mt-4 space-y-3 text-sm text-text-muted">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <a className="transition hover:text-accent-blue" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-text-primary">Acceso</p>
              <ul className="mt-4 space-y-3 text-sm text-text-muted">
                {accessLinks.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link className="transition hover:text-accent-blue" to={link.href}>
                        {link.label}
                      </Link>
                    ) : (
                      <a className="transition hover:text-accent-blue" href={link.href}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-5 text-sm text-text-muted">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 GCodeMaster CNC. Todos los derechos reservados.</p>
              <p>Diseñado para talleres CNC, producción industrial y automatización CAM.</p>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
