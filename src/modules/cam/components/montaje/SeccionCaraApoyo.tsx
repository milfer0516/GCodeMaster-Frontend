// src/modules/cam/components/montaje/SeccionCaraApoyo.tsx
//
// "Cara de apoyo" — sección del paso Montaje. Elegir la cara (selector o doble
// clic en el visor) y sellarla: el motor orienta la pieza sobre ella
// (/cam/analyze-setup) y es la única fuente de la rotación. Solo se puede
// sellar una cara PLANA: las que el análisis lista en caras_planas.
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useCamStore } from "../../store/camStore";
import { useModoDatum } from "./contextoMontaje";
import { useSellarCaraApoyo } from "./hooksMontaje";

export function SeccionCaraApoyo() {
  const analisis = useCamStore((s) => s.analisis);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);
  const meshData = useCamStore((s) => s.meshData);
  const { setModoDatum } = useModoDatum();

  const carasPlanas = analisis?.caras_planas ?? [];
  const carasParaSelector = [...carasPlanas]
    .sort((a: any, b: any) => b.area_mm2 - a.area_mm2)
    .map((c: any) => {
      let orientacion = "Lateral";
      if (c.apunta_arriba) orientacion = "Superior";
      else if (c.apunta_abajo) orientacion = "Inferior";
      return {
        face_id: c.face_index,
        label: `${orientacion} — Área ${Math.round(c.area_mm2)} mm² — Z=${c.z_mm}mm`,
        normal: c.normal,
      };
    });

  const archivo = useCamStore((s) => s.archivo);
  const idJob = useCamStore((s) => s.idJob);
  const estadoOrientacion = useCamStore((s) => s.estadoOrientacion);
  const errorOrientacion = useCamStore((s) => s.errorOrientacion);
  const sellar = useSellarCaraApoyo();
  const editarCaraApoyo = useCamStore((s) => s.editarCaraApoyo);
  const sellando = estadoOrientacion === "sellando";
  const sellada = estadoOrientacion === "sellada";

  const faceIdApoyo = montajeConfig.face_id_apoyo;
  const esCaraPlana =
    faceIdApoyo !== null &&
    carasPlanas.some((c: any) => c.face_index === faceIdApoyo);
  // Por qué la cara elegida NO se puede sellar (null = sí se puede).
  let motivoNoSellable: string | null = null;
  if (faceIdApoyo === null) {
    motivoNoSellable = "Elija primero una cara de apoyo.";
  } else if (!esCaraPlana) {
    const tipo = meshData?.faces.find((f) => f.face_id === faceIdApoyo)
      ?.surface_type;
    motivoNoSellable = `La cara elegida${
      tipo ? ` es de tipo "${tipo}" y` : ""
    } no es plana: la pieza no puede apoyarse sobre ella. Elija una cara plana.`;
  } else if (!archivo || idJob === null) {
    motivoNoSellable = "Falta el archivo STEP cargado. Vuelva a cargar la pieza.";
  }

  const establecerCaraApoyo = async () => {
    if (motivoNoSellable || !archivo || idJob === null || faceIdApoyo === null)
      return;
    await sellar(archivo, idJob, faceIdApoyo);
  };

  return (
    <>
      {sellada ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Cara de apoyo establecida
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {carasParaSelector.find((c) => c.face_id === faceIdApoyo)
                ?.label ?? `ID ${faceIdApoyo}`}
            </p>
          </div>
          <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Al pasar al siguiente paso la orientación queda fija y no podrá
            cambiarla. Mientras siga en este paso puede usar Editar cara de
            apoyo.
          </p>
          <button
            type="button"
            onClick={() => {
              // Sin orientación sellada no hay puntos válidos: el modo datum
              // se cierra junto con la cara.
              setModoDatum(false);
              editarCaraApoyo();
            }}
            className="w-full rounded-xl border border-border px-4 py-2.5 min-h-[44px] text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
          >
            Editar cara de apoyo
          </button>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-text-muted">
            Doble clic en la cara del visor; un clic muestra su dimensión.
          </p>
          {carasParaSelector.length === 0 ? (
            <p className="text-xs text-text-muted">
              No hay caras de apoyo detectadas.
            </p>
          ) : (
            <select
              value={montajeConfig.face_id_apoyo ?? ""}
              onChange={(e) => {
                const faceId =
                  e.target.value === "" ? null : Number(e.target.value);
                const cara = carasParaSelector.find(
                  (c) => c.face_id === faceId,
                );
                setMontajeConfig({
                  face_id_apoyo: faceId,
                  face_normal_apoyo: cara ? cara.normal : null,
                });
              }}
              className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
            >
              <option value="">Seleccionar cara de apoyo…</option>
              {carasParaSelector.map((c) => (
                <option key={c.face_id} value={c.face_id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          {montajeConfig.face_id_apoyo !== null && (
            <p className="mt-1 text-xs text-accent-blue">
              ✓ Cara seleccionada:{" "}
              {carasParaSelector.find(
                (c) => c.face_id === montajeConfig.face_id_apoyo,
              )?.label ?? `ID ${montajeConfig.face_id_apoyo}`}
            </p>
          )}
          {faceIdApoyo !== null && motivoNoSellable && (
            <p className="mt-2 text-xs leading-snug text-amber-500">
              {motivoNoSellable}
            </p>
          )}
          {errorOrientacion && (
            <p className="mt-2 rounded-lg border border-accent-red/40 bg-accent-red/10 px-2.5 py-1.5 text-xs leading-snug text-accent-red">
              {errorOrientacion}
            </p>
          )}
          <button
            type="button"
            onClick={establecerCaraApoyo}
            disabled={motivoNoSellable !== null || sellando}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sellando && <Loader2 className="h-4 w-4 animate-spin" />}
            {sellando ? "Orientando la pieza…" : "Establecer cara de apoyo"}
          </button>
          {sellando && (
            <p className="mt-1.5 text-center text-xs text-text-muted">
              El motor está orientando la pieza sobre la cara elegida. Puede
              tardar unos segundos.
            </p>
          )}
          {!sellando && (
            <p className="mt-1.5 text-xs text-text-muted">
              Para continuar al siguiente paso, establezca la cara de apoyo.
            </p>
          )}
        </>
      )}
    </>
  );
}
