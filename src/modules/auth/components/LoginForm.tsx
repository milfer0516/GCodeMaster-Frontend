import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo valido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const setMfaPendiente = useAuthStore((state) => state.setMfaPendiente);
  const setMfaId = useAuthStore((state) => state.setMfaId);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      const response = await login(values);

      if (response.mfa_required) {
        setMfaPendiente(true, values.email);
        setMfaId(response.mfa_id);
        toast("Codigo enviado al correo registrado.");
        navigate("/mfa");
        return;
      }

      setSession({
        access_token: response.access_token,
        refresh_token: null,
      });
      toast.success("Sesion iniciada correctamente.");
      navigate("/dashboard");
    } catch (error) {
      toast.error("No fue posible iniciar sesion.");
      void error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-text-primary outline-none transition focus:border-accent-blue"
          {...register("email")}
        />
        {errors.email ? (
          <p className="mt-1 text-xs text-accent-red">{errors.email.message}</p>
        ) : null}
      </div>
      <div>
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="password"
        >
          Contrasena
        </label>
        <div className="relative">
          {/* Campo con control de visibilidad para mejorar usabilidad */}
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 pr-12 text-text-primary outline-none transition focus:border-accent-blue"
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-accent-blue hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted transition hover:text-text-primary"
            aria-label={
              showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent-blue px-5 py-2.5 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Ingresando..." : "Iniciar sesion"}
      </button>
    </form>
  );
}
