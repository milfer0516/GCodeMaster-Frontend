// src/components/ui/PlanesModal.tsx
import { useState } from "react";
import { Modal } from "./Modal";
import { usePlanInfo } from "../../hooks/usePlanInfo";
import { Check, X } from "lucide-react";

interface PlanesModalProps {
  open: boolean;
  onClose: () => void;
}

type Periodo = "mensual" | "anual";

const PLANES = [
  {
    id: "basic",
    nombre: "Basic",
    descripcion: "Generación de G-Code puro y optimizado para tu taller.",
    precio_mes: 600000,
    precio_año: 5400000,
    color: "border-blue-500/30",
    colorBtn: "bg-accent-blue hover:brightness-110",
    colorBadge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    features: [
      { label: "Generación G-Code ilimitada", incluido: true },
      { label: "Descarga G-Code ilimitada", incluido: true },
      { label: "Copia G-Code con 1 clic", incluido: true },
      { label: "Jobs/Proyectos ilimitados", incluido: true },
      { label: "Soporte prioritario", incluido: true },
      { label: "Máquina adicional $300.000/mes", incluido: true },
      { label: "Simulador GL", incluido: false },
      { label: "Copiloto IA", incluido: false },
    ],
  },
  {
    id: "premium",
    nombre: "Premium",
    descripcion: "Acceso completo con Simulador GL y Copiloto IA.",
    precio_mes: 1200000,
    precio_año: 10800000,
    color: "border-purple-500/30",
    colorBtn: "bg-purple-500 hover:bg-purple-600",
    colorBadge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    destacado: true,
    features: [
      { label: "Generación G-Code ilimitada", incluido: true },
      { label: "Descarga G-Code ilimitada", incluido: true },
      { label: "Copia G-Code con 1 clic", incluido: true },
      { label: "Jobs/Proyectos ilimitados", incluido: true },
      { label: "Soporte prioritario", incluido: true },
      { label: "Máquina adicional $800.000/mes", incluido: true },
      { label: "Simulador GL ilimitado", incluido: true },
      { label: "Copiloto IA ilimitado", incluido: true },
    ],
  },
];

const formatCOP = (valor: number) => `$${valor.toLocaleString("es-CO")} COP`;

export function PlanesModal({ open, onClose }: PlanesModalProps) {
  const { plan } = usePlanInfo();
  const [periodo, setPeriodo] = useState<Periodo>("mensual");

  return (
    <Modal open={open} onClose={onClose} title="Selecciona tu plan" size="xl">
      {/* Toggle mensual/anual */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <button
          onClick={() => setPeriodo("mensual")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            periodo === "mensual"
              ? "bg-accent-blue text-white"
              : "border border-border text-text-muted hover:text-text-primary"
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setPeriodo("anual")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            periodo === "anual"
              ? "bg-accent-blue text-white"
              : "border border-border text-text-muted hover:text-text-primary"
          }`}
        >
          Anual
          <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
            Ahorra 10%
          </span>
        </button>
      </div>

      {/* Tarjetas */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANES.map((p) => {
          const precio = periodo === "mensual" ? p.precio_mes : p.precio_año;
          const esPlanActual = plan === p.id;

          return (
            <div
              key={p.id}
              className={`relative rounded-xl border p-5 ${p.color} ${
                p.destacado ? "ring-1 ring-purple-500/30" : ""
              }`}
            >
              {/* Badge destacado */}
              {p.destacado && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-purple-500 px-3 py-0.5 text-xs font-semibold text-white">
                    Recomendado
                  </span>
                </div>
              )}

              {/* Header tarjeta */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${p.colorBadge}`}
                  >
                    {p.nombre}
                  </span>
                  {esPlanActual && (
                    <span className="text-xs text-text-muted">Plan actual</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-text-muted">{p.descripcion}</p>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-text-primary">
                    {formatCOP(precio)}
                  </span>
                  <span className="ml-1 text-xs text-text-muted">
                    /{periodo === "mensual" ? "mes" : "año"}
                  </span>
                </div>
                {periodo === "anual" && (
                  <p className="mt-1 text-xs text-green-400">
                    Equivale a {formatCOP(Math.floor(p.precio_año / 12))}/mes
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="mb-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-xs">
                    {f.incluido ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    )}
                    <span
                      className={
                        f.incluido ? "text-text-primary" : "text-text-muted"
                      }
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Botón */}
              <button
                disabled={esPlanActual}
                onClick={() => {
                  // TODO: conectar con flujo de pago
                  alert(`Flujo de pago ${p.nombre} — próximamente`);
                }}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${p.colorBtn}`}
              >
                {esPlanActual ? "Plan actual" : `Contratar ${p.nombre}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Nota */}
      <p className="mt-4 text-center text-xs text-text-muted">
        Todos los precios en pesos colombianos (COP) + IVA. Cancela cuando
        quieras.
      </p>
    </Modal>
  );
}
