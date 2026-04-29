import { useEffect, useMemo, useState } from "react";
import { LogIn, Menu, MoonStar, SunMedium, X } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Inicio", href: "#inicio" },
  { label: "Funciones", href: "#funciones" },
  { label: "Blog Tecnico", href: "#blog-tecnico" },
  { label: "Casos de uso", href: "#casos-de-uso" },
  { label: "Planes", href: "#planes" },
  { label: "Contacto", href: "#contacto" },
] as const;

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Sincroniza el tema con el documento y lo deja persistente entre recargas.
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("gcodemaster-theme") as
      | "dark"
      | "light"
      | null;
    const initialTheme = savedTheme ?? "dark";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("gcodemaster-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const themeLabel = useMemo(
    () => (theme === "dark" ? "Modo Claro" : "Modo Oscuro"),
    [theme],
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-primary/95 backdrop-blur-xl">
      {/* Barra superior: identidad de marca + navegacion principal */}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Bloque de logo con bandera e identidad visual */}
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-1 py-1 transition hover:opacity-90"
        >
          <span className="flex h-4 w-5 overflow-hidden rounded-[2px] border border-border shadow-sm">
            <span className="h-1/3 w-full bg-[#FCD116]" />
            <span className="h-1/3 w-full bg-[#003087]" />
            <span className="h-1/3 w-full bg-[#CE1126]" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-text-primary sm:text-base">
            GCodeMaster <span className="text-accent-blue">CNC</span>
          </span>
        </Link>

        {/* Navegacion desktop: se mostrara en pantallas medianas en adelante */}
        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Navegacion principal"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-1 text-sm text-text-muted transition hover:text-text-primary"
            >
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Acciones de acceso: login, tema y menu movil */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary transition hover:border-accent-blue hover:text-accent-blue"
            aria-label={themeLabel}
          >
            {theme === "dark" ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>

          <Link
            to="/register"
            className="hidden items-center gap-2 rounded-lg border border-accent-blue bg-accent-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 sm:inline-flex"
          >
            <span>Registrarse</span>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-primary transition hover:border-accent-blue hover:text-accent-blue"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Iniciar Sesion</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-bg-surface p-2 text-text-primary transition hover:border-accent-blue hover:text-accent-blue lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Panel movil: menu tipo drawer para pantallas pequenas */}
      {mobileMenuOpen ? (
        <div
          id="landing-mobile-menu"
          className="border-t border-border bg-bg-surface lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3">
              <span className="text-sm font-medium text-text-primary">
                Navegacion rapida
              </span>
              <button
                type="button"
                onClick={() =>
                  setTheme((current) => (current === "dark" ? "light" : "dark"))
                }
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-primary"
              >
                {theme === "dark" ? (
                  <SunMedium className="h-4 w-4" />
                ) : (
                  <MoonStar className="h-4 w-4" />
                )}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>

            <nav className="grid gap-2" aria-label="Navegacion movil">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary transition hover:border-accent-blue"
                >
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-accent-blue px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
              >
                Registrarse
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-text-primary transition hover:border-accent-blue hover:text-accent-blue"
              >
                Iniciar Sesion
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
