// src/modules/cam/components/sujecion/PasoSelectorElemento.tsx
import type { TipoSujecion } from "../../store/camStore";

const ELEMENTOS: Array<{
  tipo: TipoSujecion;
  label: string;
  descripcion: string;
  icono: string;
}> = [
  {
    tipo: "prensa",
    label: "Prensa de banco",
    descripcion: "Piezas prismáticas. El más común en talleres PYME.",
    icono: "▭",
  },
  {
    tipo: "bridas",
    label: "Bridas + tornillos",
    descripcion: "Piezas grandes fijadas directamente en la mesa.",
    icono: "⊞",
  },
  {
    tipo: "mesa_magnetica",
    label: "Mesa magnética",
    descripcion: "Piezas planas de acero o hierro fundido.",
    icono: "▬",
  },
  {
    tipo: "copa_torno",
    label: "Copa de torno",
    descripcion: "Piezas cilíndricas montadas en VMC.",
    icono: "◎",
  },
];

interface Props {
  onSelect: (tipo: TipoSujecion) => void;
}

export const PasoSelectorElemento = ({ onSelect }: Props) => (
  <div className="space-y-3">
    <p className="text-sm text-text-muted">
      Selecciona el sistema de sujeción para esta operación.
    </p>
    <div className="grid grid-cols-2 gap-3">
      {ELEMENTOS.map((el) => (
        <button
          key={el.tipo}
          onClick={() => onSelect(el.tipo)}
          className="flex flex-col gap-1.5 rounded-xl border border-border bg-bg-primary p-4 text-left transition hover:border-accent-blue/60 hover:bg-accent-blue/5 active:scale-[0.98]"
        >
          <span className="text-2xl leading-none">{el.icono}</span>
          <span className="text-sm font-semibold text-text-primary leading-tight">
            {el.label}
          </span>
          <span className="text-xs text-text-muted leading-snug">
            {el.descripcion}
          </span>
        </button>
      ))}
    </div>
  </div>
);
