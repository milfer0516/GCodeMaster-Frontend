import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClass: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Contenido: acotado al viewport (la envoltura tiene p-4) y en flex
          columna para que SOLO el cuerpo se desplace — la cabecera queda
          fija y el contenido largo nunca empuja nada fuera de la pantalla. */}
      <div
        className={`relative flex max-h-[calc(100vh-2rem)] w-full flex-col ${sizeClass[size]} rounded-2xl border border-border bg-bg-surface shadow-2xl`}
      >
        {/* Header */}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-text-primary">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body: ES la zona con scroll del modal (overflow-y-auto). Sin esto,
            un contenido alto estiraba el modal más allá del viewport sin forma
            de llegar a los botones de abajo. */}
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
