// src/hooks/usePlanInfo.ts
import { useMemo } from "react";
import { useAuthStore } from "../modules/auth/store/authStore";

export interface PlanInfo {
  plan: "demo" | "basic" | "premium";
  diasRestantes: number | null;
  diasTranscurridos: number | null;
  vencido: boolean;
  labelPlan: string;
  colorBadge: string;
  puedeAgregarMaquinaExcedente: boolean;
  excedentePrecio: string;
  mensajeUpgrade: string;
  beneficiosActuales: string[];
  beneficiosUpgrade: string[];
  mostrarUpgrade: boolean;
}

export function usePlanInfo(): PlanInfo {
  const plan = useAuthStore((s) => s.plan_activo);
  const empresa = useAuthStore((s) => s.empresa);
  const fecha_registro = empresa?.fecha_registro ?? null;
  const fecha_vencimiento = empresa?.fecha_vencimiento ?? null;

  return useMemo(() => {
    // ── Días restantes y transcurridos ──────────────────────────────
    let diasRestantes: number | null = null;
    let diasTranscurridos: number | null = null;
    let vencido = false;

    if (fecha_registro) {
      const diff = Date.now() - new Date(fecha_registro).getTime();
      diasTranscurridos = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // ── Labels y colores ────────────────────────────────────────────
    const labelPlan: Record<string, string> = {
      demo: "Demo",
      basic: "Basic",
      premium: "Premium",
    };

    const colorBadge: Record<string, string> = {
      demo: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      basic: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      premium: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    };

    // ── Excedente máquinas ──────────────────────────────────────────
    const excedentePrecio =
      plan === "basic"
        ? "$300.000 COP/mes por máquina adicional"
        : plan === "premium"
          ? "$800.000 COP/mes por máquina adicional"
          : "";

    const puedeAgregarMaquinaExcedente = plan === "basic" || plan === "premium";

    // ── Mensajes de upgrade ─────────────────────────────────────────
    const mensajeUpgrade: Record<string, string> = {
      demo: "Estás en prueba gratuita. Actualiza al plan Basic o Premium para desbloquear todas las funciones.",
      basic:
        "¿Quieres el Simulador GL y el Copiloto IA? Actualiza al plan Premium.",
      premium: "",
    };

    // ── Beneficios del plan ACTUAL ──────────────────────────────────
    const beneficiosActuales: Record<string, string[]> = {
      demo: [
        "✅ Generación y visualización de G-Code",
        "⚠️ Simulador GL — máx. 1 vez por día",
        "⚠️ Copiloto IA — máx. 3 consultas por día",
        "❌ Sin descarga de G-Code",
        "❌ Sin copia de G-Code",
        "❌ Máximo 2 proyectos activos",
        "❌ No puede agregar máquinas adicionales",
      ],
      basic: [
        "✅ Generación de G-Code ilimitada",
        "✅ Descarga de G-Code ilimitada",
        "✅ Copia de G-Code con 1 clic",
        "✅ Proyectos ilimitados",
        "✅ Soporte prioritario",
        "✅ Máquina adicional por $300.000 COP/mes",
        "❌ Sin Simulador GL",
        "❌ Sin Copiloto IA",
      ],
      premium: [
        "✅ Generación de G-Code ilimitada",
        "✅ Descarga de G-Code ilimitada",
        "✅ Copia de G-Code con 1 clic",
        "✅ Simulador GL ilimitado",
        "✅ Copiloto IA ilimitado",
        "✅ Proyectos ilimitados",
        "✅ Soporte prioritario",
        "✅ Máquina adicional por $800.000 COP/mes",
      ],
    };

    // ── Beneficios del plan SIGUIENTE (para el CTA de upgrade) ──────
    const beneficiosUpgrade: Record<string, string[]> = {
      demo: [
        "✅ Descarga G-Code ilimitada",
        "✅ Copia G-Code con 1 clic",
        "✅ Proyectos ilimitados",
        "✅ Soporte prioritario",
        "💰 Basic: $600.000/mes o $5.400.000/año (ahorra 10%)",
      ],
      basic: [
        "✅ Todo lo del plan Basic",
        "✅ Simulador GL ilimitado",
        "✅ Copiloto IA ilimitado",
        "💰 Premium: $1.200.000/mes o $10.800.000/año (ahorra 10%)",
      ],
      premium: [],
    };

    const mostrarUpgrade = plan !== "premium";

    return {
      plan: plan as "demo" | "basic" | "premium",
      diasRestantes,
      diasTranscurridos,
      vencido,
      labelPlan: labelPlan[plan] ?? plan,
      colorBadge: colorBadge[plan] ?? colorBadge.demo,
      puedeAgregarMaquinaExcedente,
      excedentePrecio,
      mensajeUpgrade: mensajeUpgrade[plan] ?? "",
      beneficiosActuales: beneficiosActuales[plan] ?? [],
      beneficiosUpgrade: beneficiosUpgrade[plan] ?? [],
      mostrarUpgrade,
    };
  }, [plan, fecha_vencimiento, fecha_registro]);
}
