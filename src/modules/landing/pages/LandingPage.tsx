import { LandingHeader } from "../components/LandingHeader";
import { HeroSection } from "../components/HeroSection";
import { CtaFooterSection } from "../components/CtaFooterSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { BlogSection } from "../components/BlogSection";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { PricingSection } from "../components/PricingSection";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      {/* Seccion 1: encabezado / navegacion de la landing */}
      <LandingHeader />
      {/* Seccion 2: hero principal con propuesta de valor y mockup tecnico */}
      <HeroSection />
      {/* Seccion 3: tarjetas de valor y costos operativos */}
      <FeaturesSection />
      {/* Seccion 4: explicacion del flujo principal del producto */}
      <HowItWorksSection />
      {/* Seccion 5: blog tecnico para atraer trafico organico */}
      <BlogSection />
      {/* Seccion 6: planes comerciales de la plataforma */}
      <PricingSection />
      {/* Seccion 7: llamada a la accion final y footer */}
      <CtaFooterSection />
    </main>
  );
}
