// src/modules/cam/components/resumen/ValorHoja.tsx
// Pinta un Valor de la hoja de setup. La ausencia se ve como ausencia: un
// recuadro discontinuo con la palabra ("no disponible" / "no declarado" y, si
// lo hay, el valor inicial que viajará igual), nunca un hueco ni un guion. El
// texto usa text-text-primary en los tres casos para conservar el contraste en
// tema claro y oscuro; el color va en el borde.
import { textoDeValor, type Valor } from "./hojaSetup";

const CLASE_POR_VALOR: Record<Valor["clase"], string> = {
  dato: "break-words font-medium text-text-primary",
  aviso:
    "inline-block break-words rounded-md border border-accent-amber/70 bg-accent-amber/10 px-1.5 py-0.5 font-medium text-text-primary",
  falta:
    "inline-block break-words rounded-md border border-dashed border-accent-amber/70 bg-accent-amber/10 px-1.5 py-0.5 italic text-text-primary",
};

export function ValorHoja({ valor }: { valor: Valor }) {
  return (
    <span data-valor={valor.clase} className={CLASE_POR_VALOR[valor.clase]}>
      {textoDeValor(valor)}
    </span>
  );
}
