import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { verifyMfa } from "../services/authService";
import { useAuthStore } from "../store/authStore";

const mfaSchema = z.object({
  codigo_6_digitos: z
    .string()
    .regex(/^\d{6}$/, "Ingresa un codigo de 6 digitos"),
});

type MFAVerifyFormValues = z.infer<typeof mfaSchema>;

export function MFAVerifyForm() {
  const navigate = useNavigate();
  const email = useAuthStore((state) => state.email_mfa_pendiente);
  const mfa_id = useAuthStore((state) => state.mfa_id);
  const setSession = useAuthStore((state) => state.setSession);
  const setPermisos = useAuthStore((state) => state.setPermisos);
  const clearMfaPendiente = useAuthStore((state) => state.clearMfaPendiente);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MFAVerifyFormValues>({
    resolver: zodResolver(mfaSchema),
  });

  const onSubmit = async (values: MFAVerifyFormValues) => {
    if (!email || !mfa_id) {
      toast.error("Sesion expirada. Inicia sesion de nuevo.");
      navigate("/login");
      return;
    }
    try {
      setLoading(true);
      const response = await verifyMfa({
        mfa_id,
        code: values.codigo_6_digitos,
      });

      setSession({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user: response.usuario,
        empresa: response.empresa,
      });
      setPermisos(response.permisos);
      clearMfaPendiente();
      toast.success(`Bienvenido, ${response.empresa.nombre_empresa}`);
      navigate(response.empresa.setup_completo ? "/dashboard" : "/onboarding");
    } catch {
      toast.error("Codigo incorrecto. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="codigo_6_digitos"
        >
          Codigo de 6 digitos
        </label>
        <input
          id="codigo_6_digitos"
          inputMode="numeric"
          maxLength={6}
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 tracking-[0.35em] text-center text-lg text-text-primary outline-none transition focus:border-accent-blue"
          {...register("codigo_6_digitos")}
        />
        {errors.codigo_6_digitos ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.codigo_6_digitos.message}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent-blue px-5 py-2.5 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Verificando..." : "Verificar codigo"}
      </button>
    </form>
  );
}
