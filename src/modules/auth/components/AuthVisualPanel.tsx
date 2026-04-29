import { Link } from "react-router-dom";
import authVisual from "../../../assets/landing/Imagen Formularios Registro Login.png";

type AuthVisualPanelProps = {
  title: string;
  description: string;
  showDescription?: boolean;
  minimal?: boolean;
  imageFit?: "cover" | "contain";
};

export function AuthVisualPanel({
  title,
  description,
  showDescription = true,
  minimal = false,
  imageFit = "cover"
}: AuthVisualPanelProps) {
  return (
    <aside className="hidden overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-soft lg:flex lg:min-h-[420px] lg:flex-col xl:h-full">
      {/* Encabezado de marca: siempre visible y sin recorte */}
      <div className="shrink-0 px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center rounded-full border border-white/10 bg-bg-primary/75 px-4 py-2 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-accent-blue hover:bg-bg-primary/90 hover:shadow-soft"
          aria-label="Volver al inicio"
        >
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent-blue transition-colors hover:text-white">
            GCodeMaster CNC
          </p>
        </Link>

        {minimal ? null : (
          <div className="mt-4 max-w-[28rem]">
            <h2 className="text-[22px] font-bold leading-tight text-text-primary">{title}</h2>
            {showDescription ? (
              <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Imagen principal: ocupa el resto del panel sin tapar el nombre */}
      <div className="relative mt-4 flex-1 min-h-0 overflow-hidden">
        <img
          src={authVisual}
          alt="Pantalla de inicio de sesion y registro"
          className={`h-full w-full bg-bg-primary ${
            imageFit === "contain" ? "object-contain p-6 sm:p-8" : "object-cover object-[center_35%]"
          }`}
        />

        {/* Capa sutil para dar profundidad sin esconder la fotografia */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,17,23,0.04)_0%,rgba(15,17,23,0.18)_100%)]" />
      </div>
    </aside>
  );
}
