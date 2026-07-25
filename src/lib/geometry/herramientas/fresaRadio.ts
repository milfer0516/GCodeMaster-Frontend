// src/lib/geometry/herramientas/fresaRadio.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Fresa de radio (bull nose / torica) — FUNCIÓN PURA.
// Cilindro con radio de esquina en la arista de la punta. El radio se dibuja
// EXACTO con un sólido de revolución: si el operador escribe R2 en una Ø6, ve
// que el radio se está comiendo casi toda la punta.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { revolucion, arcoPerfil } from "../primitivas";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import {
  cuerpoAcanalado,
  dientesFrontales,
  mangoCilindrico,
  malla,
  alturaArranqueFilos,
} from "./comunes";

const HELICE_GRADOS = 30;

export function construirFresaRadio(
  p: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
): THREE.Group {
  const r = resolverParametros({ ...p, familia: "fresa_radio" });
  const m = materiales ?? crearMaterialesHerramienta(p);

  const g = new THREE.Group();
  g.name = "fresa_radio";

  const rc = Math.min(r.radioEsquina, r.R * 0.95);
  const yFilos = Math.max(rc, alturaArranqueFilos(r.R, 0.3, HELICE_GRADOS));

  // Nariz: plano frontal → arco de esquina → cilindro. Perfil cerrado en el eje
  // por arriba y por abajo para que la revolución sea un sólido tapado.
  const perfilNariz: Array<[number, number]> = [
    [0, 0],
    [r.R - rc, 0],
    ...arcoPerfil(r.R - rc, rc, rc, -Math.PI / 2, 0, 10),
    [r.R, yFilos],
    [0, yFilos],
  ];
  g.add(malla(revolucion(perfilNariz, 48), m.corte));
  g.add(dientesFrontales(m, r.R - rc * 0.6, 0, r.filos));

  // Los filos arrancan justo donde termina la nariz.
  if (r.Lc > yFilos * 1.1) {
    g.add(
      cuerpoAcanalado(m, {
        radio: r.R,
        yInicio: yFilos,
        yFin: r.Lc,
        filos: r.filos,
        anguloHelice: HELICE_GRADOS,
      }),
    );
  }

  g.add(mangoCilindrico(m, r.dMango / 2, Math.max(r.Lc, yFilos * 1.2), r.Lt));

  return g;
}
