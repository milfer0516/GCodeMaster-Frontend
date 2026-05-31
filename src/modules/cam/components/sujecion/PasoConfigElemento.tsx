// src/modules/cam/components/sujecion/PasoConfigElemento.tsx
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Maquina } from "../../../../services/maquinasService";
import type { TipoSujecion, SujecionConfig } from "../../store/camStore";

const ANCHOS_PRENSA = [100, 125, 150, 200] as const;
const ALTURAS_MORDAZA = [40, 50, 60, 80] as const;
const OPCIONES_BRIDAS = [2, 4, 6, 8] as const;

function calcularPosicionesBridas(
  cantidad: number,
  dimX: number,
  dimY: number,
  holgura: number,
): Array<{ x: number; y: number }> {
  const mitadX = dimX / 2;
  const mitadY = dimY / 2;
  const esquinas = [
    { x: mitadX + holgura, y: mitadY + holgura },
    { x: -mitadX - holgura, y: mitadY + holgura },
    { x: -mitadX - holgura, y: -mitadY - holgura },
    { x: mitadX + holgura, y: -mitadY - holgura },
  ];
  const centrosLados = [
    { x: 0, y: mitadY + holgura },
    { x: 0, y: -mitadY - holgura },
    { x: mitadX + holgura, y: 0 },
    { x: -mitadX - holgura, y: 0 },
  ];
  return [...esquinas, ...centrosLados].slice(0, cantidad);
}

interface Props {
  tipo: TipoSujecion;
  dimensiones: { x: number; y: number; z: number };
  maquina: Maquina;
  onBack: () => void;
  onConfirm: (config: Partial<SujecionConfig>) => void;
}

export const PasoConfigElemento = ({
  tipo,
  dimensiones,
  maquina,
  onBack,
  onConfirm,
}: Props) => {
  const holguraBridas =
    Math.ceil((maquina.diametro_herramienta_max_mm ?? 80) / 2) + 5;
  const limiteSeguroZ =
    maquina.recorrido_z_mm - (maquina.largo_herramienta_max_mm ?? 300);

  // ── Prensa ──
  const [anchoPrensa, setAnchoPrensa] = useState(125);
  const [apertura, setApertura] = useState(Math.ceil(dimensiones.y) + 20);
  const [alturaMordaza, setAlturaMordaza] = useState(50);
  const [alturaParalelasPrensa, setAlturaParalelasPrensa] = useState(0);

  // ── Bridas ──
  const [cantidadBridas, setCantidadBridas] = useState(4);
  const [posicionAutomatica, setPosicionAutomatica] = useState(true);
  const [alturaParalelasBridas, setAlturaParalelasBridas] = useState(50);

  // ── Copa ──
  const [diametroCopa, setDiametroCopa] = useState(
    Math.ceil(Math.max(dimensiones.x, dimensiones.y) + 20),
  );
  const [tipoGarras, setTipoGarras] = useState<3 | 4>(3);
  const [profundidadAgarre, setProfundidadAgarre] = useState(30);

  // ── Mesa magnética ──
  const [esFerromagnetico, setEsFerromagnetico] = useState(true);

  const handleConfirm = () => {
    let config: Partial<SujecionConfig> = {};

    if (tipo === "prensa") {
      const alturaTotal =
        alturaMordaza + alturaParalelasPrensa + dimensiones.z;
      config = {
        ancho_mordaza_mm: anchoPrensa,
        apertura_mm: apertura,
        altura_mordaza_mm: alturaMordaza,
        altura_paralelas_mm: alturaParalelasPrensa,
        altura_total_montaje_mm: alturaTotal,
        envolvente: {
          x_min: -anchoPrensa / 2,
          x_max: anchoPrensa / 2,
          y_min: -apertura / 2,
          y_max: apertura / 2,
          z_min: -(alturaMordaza + alturaParalelasPrensa),
          z_max: dimensiones.z,
          z_apoyo_mm: alturaMordaza,
        },
      };
    } else if (tipo === "bridas") {
      const posiciones = posicionAutomatica
        ? calcularPosicionesBridas(
            cantidadBridas,
            dimensiones.x,
            dimensiones.y,
            holguraBridas,
          )
        : [];
      const alturaTotal = alturaParalelasBridas + dimensiones.z;
      config = {
        cantidad_bridas: cantidadBridas,
        posicion_automatica: posicionAutomatica,
        posiciones_bridas: posiciones,
        altura_paralelas_mm: alturaParalelasBridas,
        altura_total_montaje_mm: alturaTotal,
        envolvente: {
          x_min: -dimensiones.x / 2 - holguraBridas,
          x_max: dimensiones.x / 2 + holguraBridas,
          y_min: -dimensiones.y / 2 - holguraBridas,
          y_max: dimensiones.y / 2 + holguraBridas,
          z_min: -alturaParalelasBridas,
          z_max: dimensiones.z,
          z_apoyo_mm: alturaParalelasBridas,
        },
      };
    } else if (tipo === "copa_torno") {
      config = {
        diametro_copa_mm: diametroCopa,
        tipo_garras: tipoGarras,
        profundidad_agarre_mm: profundidadAgarre,
        altura_paralelas_mm: 0,
        altura_total_montaje_mm: dimensiones.z,
        envolvente: {
          x_min: -diametroCopa / 2,
          x_max: diametroCopa / 2,
          y_min: -diametroCopa / 2,
          y_max: diametroCopa / 2,
          z_min: -80,
          z_max: dimensiones.z,
          z_apoyo_mm: profundidadAgarre,
        },
      };
    } else if (tipo === "mesa_magnetica") {
      config = {
        es_material_ferromagnetico: esFerromagnetico,
        altura_paralelas_mm: 0,
        altura_total_montaje_mm: dimensiones.z,
        envolvente: {
          x_min: -dimensiones.x / 2,
          x_max: dimensiones.x / 2,
          y_min: -dimensiones.y / 2,
          y_max: dimensiones.y / 2,
          z_min: -10,
          z_max: dimensiones.z,
          z_apoyo_mm: 0,
        },
      };
    }

    onConfirm(config);
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none";

  const btnOpcion = (activo: boolean) =>
    `flex-1 rounded-lg border py-2 text-sm font-medium transition ${
      activo
        ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
        : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/40"
    }`;

  const Toggle = ({
    value,
    onChange,
    label,
    sublabel,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
    label: string;
    sublabel?: string;
  }) => (
    <div className="flex items-center justify-between rounded-lg border border-border bg-bg-primary px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {sublabel && <p className="text-xs text-text-muted">{sublabel}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${value ? "bg-accent-blue" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  const AlturaTotal = ({ total }: { total: number }) => (
    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-muted">
      Altura total del montaje:{" "}
      <span
        className={`font-semibold ${
          total > limiteSeguroZ ? "text-yellow-400" : "text-text-primary"
        }`}
      >
        {Math.round(total)}mm
      </span>
      {" / "}
      <span className="text-text-primary">límite {limiteSeguroZ}mm</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── PRENSA ── */}
      {tipo === "prensa" && (
        <>
          <div>
            <p className="text-xs font-medium text-text-primary mb-2">
              Ancho de mordaza
            </p>
            <div className="flex gap-2">
              {ANCHOS_PRENSA.map((w) => (
                <button key={w} onClick={() => setAnchoPrensa(w)} className={btnOpcion(anchoPrensa === w)}>
                  {w}mm
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-primary block mb-1">
                Apertura (mm)
              </label>
              <input
                type="number"
                value={apertura}
                min={Math.ceil(dimensiones.y)}
                onChange={(e) => setApertura(Number(e.target.value))}
                className={inputCls}
              />
              <p className="text-xs text-text-muted mt-0.5">
                Pieza Y: {Math.round(dimensiones.y)}mm
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-text-primary block mb-1">
                Alt. mordaza
              </label>
              <div className="flex gap-1">
                {ALTURAS_MORDAZA.map((h) => (
                  <button
                    key={h}
                    onClick={() => setAlturaMordaza(h)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                      alturaMordaza === h
                        ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                        : "border-border bg-bg-primary text-text-muted"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-primary block mb-1">
              Altura paralelas (mm) — 0 si no usa
            </label>
            <input
              type="number"
              value={alturaParalelasPrensa}
              min={0}
              step={5}
              onChange={(e) => setAlturaParalelasPrensa(Number(e.target.value))}
              className={inputCls}
            />
            <p className="text-xs text-text-muted mt-0.5">
              z_apoyo G-Code = alt. mordaza ({alturaMordaza}mm)
            </p>
          </div>

          <AlturaTotal
            total={alturaMordaza + alturaParalelasPrensa + dimensiones.z}
          />
        </>
      )}

      {/* ── BRIDAS ── */}
      {tipo === "bridas" && (
        <>
          <div>
            <p className="text-xs font-medium text-text-primary mb-2">
              Cantidad de bridas
            </p>
            <div className="flex gap-2">
              {OPCIONES_BRIDAS.map((n) => (
                <button key={n} onClick={() => setCantidadBridas(n)} className={btnOpcion(cantidadBridas === n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-primary block mb-1">
              Altura paralelas (mm)
            </label>
            <input
              type="number"
              value={alturaParalelasBridas}
              min={0}
              step={5}
              onChange={(e) => setAlturaParalelasBridas(Number(e.target.value))}
              className={inputCls}
            />
            <p className="text-xs text-text-muted mt-0.5">
              z_apoyo G-Code = alt. paralelas ({alturaParalelasBridas}mm)
            </p>
          </div>

          <Toggle
            value={posicionAutomatica}
            onChange={setPosicionAutomatica}
            label="Posición automática"
            sublabel={`Holgura ${holguraBridas}mm · Ø${maquina.diametro_herramienta_max_mm ?? 80}mm máx`}
          />

          <AlturaTotal total={alturaParalelasBridas + dimensiones.z} />
        </>
      )}

      {/* ── COPA DE TORNO ── */}
      {tipo === "copa_torno" && (
        <>
          <div>
            <label className="text-xs font-medium text-text-primary block mb-1">
              Diámetro de copa (mm)
            </label>
            <input
              type="number"
              value={diametroCopa}
              min={50}
              step={10}
              onChange={(e) => setDiametroCopa(Number(e.target.value))}
              className={inputCls}
            />
            <p className="text-xs text-text-muted mt-0.5">
              Ref. pieza: Ø{Math.round(Math.max(dimensiones.x, dimensiones.y))}mm
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-text-primary mb-2">
              Tipo de garras
            </p>
            <div className="flex gap-2">
              {([3, 4] as const).map((g) => (
                <button key={g} onClick={() => setTipoGarras(g)} className={btnOpcion(tipoGarras === g)}>
                  {g} garras
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-primary block mb-1">
              Profundidad de agarre (mm)
            </label>
            <input
              type="number"
              value={profundidadAgarre}
              min={10}
              max={Math.floor(dimensiones.z * 0.6)}
              step={5}
              onChange={(e) => setProfundidadAgarre(Number(e.target.value))}
              className={inputCls}
            />
            <p className="text-xs text-text-muted mt-0.5">
              Longitud de pieza dentro de las garras ·{" "}
              z_apoyo G-Code = {profundidadAgarre}mm
            </p>
          </div>

          <AlturaTotal total={dimensiones.z} />
        </>
      )}

      {/* ── MESA MAGNÉTICA ── */}
      {tipo === "mesa_magnetica" && (
        <>
          <Toggle
            value={esFerromagnetico}
            onChange={setEsFerromagnetico}
            label="Material ferromagnético"
            sublabel="Acero / hierro fundido"
          />
          {!esFerromagnetico && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
              La mesa magnética no asegura materiales no ferromagnéticos.
            </div>
          )}
          <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-muted">
            z_apoyo G-Code ={" "}
            <span className="font-semibold text-text-primary">0mm</span>
            {" "}(pieza directamente sobre mesa)
          </div>
          <AlturaTotal total={dimensiones.z} />
        </>
      )}

      <div className="flex justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition"
        >
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
        <button
          onClick={handleConfirm}
          disabled={tipo === "mesa_magnetica" && !esFerromagnetico}
          className="rounded-xl bg-accent-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};
