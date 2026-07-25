// src/lib/geometry/herramientas/machoRoscar.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Macho de roscar — FUNCIÓN PURA.
//
// El filete de rosca se dibuja como una hélice REAL de paso `paso_rosca_mm`:
// el número de vueltas es longitud/paso, así que un M8×1.25 y un M8×1 se
// distinguen a simple vista. El tramo de entrada va en cono (chaflán de
// entrada) porque un macho no empieza a roscar a pleno diámetro.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { cilindro, tubo, prisma, angulosUniformes } from "../primitivas";
import { CurvaHelicoidal } from "../curvas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { mangoCilindrico, malla } from "./comunes";

/** Filetes del chaflán de entrada (macho de máquina, entrada tipo B). */
const VUELTAS_ENTRADA = 3.5;

export function construirMachoRoscar(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "macho_roscar" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "macho_roscar";

  const paso = r.paso;
  const profundidadHilo = paso * 0.61; // altura del filete ISO
  const rFilete = paso * 0.34; // radio del tubo que dibuja el filete
  const rCresta = r.R - rFilete; // eje del filete: la cresta llega a R
  const rNucleo = Math.max(r.R - profundidadHilo, r.R * 0.5);

  const lRosca = r.Lc;
  const lEntrada = Math.min(VUELTAS_ENTRADA * paso, lRosca * 0.6);

  // Núcleo: cónico en la entrada, cilíndrico después.
  g.add(
    malla(
      cilindro(rNucleo, rNucleo * 0.72, lEntrada, 0, 40),
      m.corte,
    ),
  );
  g.add(
    malla(cilindro(rNucleo, rNucleo, lRosca - lEntrada, lEntrada, 40), m.corte),
  );

  // Filete: tramo cónico de entrada + tramo cilíndrico, en fase continua.
  const vueltasEntrada = lEntrada / paso;
  g.add(
    malla(
      tubo(
        // Arranca a rFilete de la punta: el extremo del tubo es un disco
        // inclinado y a ras de y = 0 asomaría por debajo del plano de entrada.
        new CurvaHelicoidal(
          rCresta * 0.68,
          rCresta,
          rFilete,
          lEntrada,
          vueltasEntrada,
          0,
        ),
        rFilete,
        Math.max(24, Math.round(vueltasEntrada * 24)),
        8,
      ),
      m.corte,
    ),
  );

  const vueltasResto = (lRosca - lEntrada) / paso;
  g.add(
    malla(
      tubo(
        new CurvaHelicoidal(
          rCresta,
          rCresta,
          lEntrada,
          lRosca,
          vueltasResto,
          vueltasEntrada * Math.PI * 2,
        ),
        rFilete,
        Math.max(32, Math.round(vueltasResto * 20)),
        8,
      ),
      m.corte,
    ),
  );

  // Canales rectos de evacuación: interrumpen el filete y forman los filos.
  const rCanal = r.R * 0.26;
  for (const fase of angulosUniformes(r.filos)) {
    const curva = new CurvaHelicoidal(
      r.R - rCanal * 0.9,
      r.R - rCanal * 0.9,
      0,
      lRosca * 1.02,
      0,
      fase,
    );
    g.add(malla(tubo(curva, rCanal, 16, 10), m.ranura));
  }

  // Mango + cuadradillo de arrastre en el extremo.
  const yMango = lRosca;
  const yTope = Math.max(r.Lt, lRosca + r.D * 2.5);
  g.add(mangoCilindrico(m, (r.dMango * 0.78) / 2, yMango, yTope));

  const ladoCuadro = r.dMango * 0.6;
  g.add(
    malla(
      prisma(
        ladoCuadro,
        r.D * 0.9,
        ladoCuadro,
        [0, yTope - r.D * 0.45, 0],
      ),
      m.detalle,
    ),
  );

  return g;
}
