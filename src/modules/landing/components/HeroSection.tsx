import { ArrowRight, PlayCircle } from "lucide-react";

import centroMecanizado from "../../../assets/landing/Centro de Mecanizado.png";

export function HeroSection() {
  return (
    <section id="inicio" className="relative overflow-hidden border-b border-border bg-bg-primary">
      {/* Fondo decorativo: capas suaves para dar profundidad industrial */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.10),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 xl:grid-cols-[1.05fr_0.95fr] xl:px-8">
        {/* Bloque textual principal: propuesta de valor y CTAs */}
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-bg-surface px-4 py-2 text-xs uppercase tracking-[0.22em] text-accent-blue">
            Generador de código G inteligente para CNC
          </div>

          <h1 className="max-w-2xl text-balance text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-text-primary">
            <span className="block">GCodeMaster</span>
            <span className="text-accent-blue">CNC</span>
          </h1>

          <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-text-muted sm:text-lg">
            De archivo STEP a G-Code FANUC en minutos, con interpretacion
            geometrica automatica, parametros de corte precisos y simulacion 3D
            antes de ejecutar en tu maquina.
          </p>

          {/* Acciones principales para demo y exploracion visual */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-blue px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Iniciar Demo Gratis 7 dias
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#seguridad"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-accent-blue hover:text-accent-blue"
            >
              <PlayCircle className="h-4 w-4" />
              Ver Simulacion en Vivo
            </a>
          </div>

          {/* Mensaje de confianza alineado al concepto de seguridad del producto */}
          <p className="mt-6 max-w-2xl text-sm leading-7 text-text-muted">
            Tu archivo STEP no abandona tu computador. Solo se procesan los
            datos geométricos necesarios para generar el G-Code.
          </p>
        </div>

        {/* Bloque visual principal: foto real de la maquina para elevar confianza */}
        <div className="relative">
          <div className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full bg-accent-blue/10 blur-3xl lg:block" />
          <div className="absolute -right-8 bottom-10 hidden h-32 w-32 rounded-full bg-accent-amber/10 blur-3xl lg:block" />

          <div className="rounded-2xl border border-border bg-bg-surface/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            {/* Encabezado tipo software industrial para conservar el lenguaje visual */}
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
              <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
              <span className="h-3 w-3 rounded-full bg-[#10b981]" />
              <span className="ml-auto text-xs uppercase tracking-[0.2em] text-text-muted">
                Centro de Mecanizado Real
              </span>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-xl border border-border bg-bg-elevated">
              {/* Fotografia real como pieza central del hero */}
              <img
                src={centroMecanizado}
                alt="Centro de mecanizado CNC"
                className="h-[340px] w-full object-cover object-center sm:h-[420px]"
                loading="eager"
              />

              {/* Overlay sutil para mantener legibilidad sobre la imagen */}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,17,23,0.08)_0%,rgba(15,17,23,0.42)_100%)]" />

              {/* Badge superior para reforzar el mensaje comercial */}
              <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-bg-primary/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary backdrop-blur">
                Produccion CNC
              </div>

              {/* Tarjeta flotante de contexto técnico sobre la imagen */}
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border/80 bg-bg-primary/90 p-4 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-accent-blue">
                      Generación de código G automatizado
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      STEP local, analisis geometrico y salida FANUC lista para
                      validar.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-right">
                    <div className="text-sm font-semibold text-text-primary">
                      + rapidez
                    </div>
                    <div className="text-xs text-text-muted">
                      menos reprocesos
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mensaje inferior de confianza y contexto del producto */}
            <div className="mt-2 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-bg-elevated px-3 py-3 text-center">
                <div className="text-lg font-semibold text-text-primary">
                  7 dias
                </div>
                <div className="text-xs text-text-muted">Demo guiada</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-elevated px-3 py-3 text-center">
                <div className="text-lg font-semibold text-text-primary">
                  100%
                </div>
                <div className="text-xs text-text-muted">STEP local</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-elevated px-3 py-3 text-center">
                <div className="text-lg font-semibold text-text-primary">
                  FANUC
                </div>
                <div className="text-xs text-text-muted">Salida G-Code</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
