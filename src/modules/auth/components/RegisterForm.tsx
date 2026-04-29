import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { register as registerUser } from "../services/authService";

const registerSchema = z
  .object({
    nombre_empresa: z.string().min(2, "Ingresa el nombre del taller"),
    nit: z.string().min(5, "Ingresa un NIT valido"),
    ciudad: z.string().min(2, "Ingresa la ciudad"),
    telefono: z.string().min(7, "Ingresa un telefono valido"),
    responsable_tecnico: z.string().min(2, "Ingresa tu nombre completo"),
    email_admin: z.string().email("Ingresa un correo valido"),
    password: z
      .string()
      .min(6, "La contrasena debe tener al menos 6 caracteres"),
    confirm_password: z.string().min(6, "Confirma tu contrasena"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contrasenas no coinciden",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;
type RegisterPayload = Omit<RegisterFormValues, "confirm_password">;

export function RegisterForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      const { confirm_password: _confirmPassword, ...payload } = values;
      await registerUser(payload as RegisterPayload);
      toast.success("Registro completado. Revisa tu correo.");
      navigate("/login");
    } catch (error) {
      toast.error("No fue posible completar el registro.");
      void error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="nombre_empresa"
        >
          Nombre del taller
        </label>
        <input
          id="nombre_empresa"
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-text-primary outline-none transition focus:border-accent-blue"
          {...register("nombre_empresa")}
        />
        {errors.nombre_empresa ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.nombre_empresa.message}
          </p>
        ) : null}
        {errors.nombre_empresa ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.nombre_empresa.message}
          </p>
        ) : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-text-muted" htmlFor="nit">
          NIT
        </label>
        <input
          id="nit"
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-text-primary outline-none transition focus:border-accent-blue"
          {...register("nit")}
        />
        {errors.nit ? (
          <p className="mt-1 text-xs text-accent-red">{errors.nit.message}</p>
        ) : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-text-muted" htmlFor="ciudad">
          Ciudad
        </label>
        <input
          id="ciudad"
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-text-primary outline-none transition focus:border-accent-blue"
          {...register("ciudad")}
        />
        {errors.ciudad ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.ciudad.message}
          </p>
        ) : null}
      </div>
      <div>
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="telefono"
        >
          Telefono
        </label>
        <input
          id="telefono"
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-text-primary outline-none transition focus:border-accent-blue"
          {...register("telefono")}
        />
        {errors.telefono ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.telefono.message}
          </p>
        ) : null}
      </div>
      <div>
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="responsable_tecnico"
        >
          Responsable técnico
        </label>
        <input
          id="responsable_tecnico"
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-text-primary outline-none transition focus:border-accent-blue"
          {...register("responsable_tecnico")}
        />
        {errors.responsable_tecnico ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.responsable_tecnico.message}
          </p>
        ) : null}
      </div>
      <div>
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="email_admin"
        >
          Email
        </label>
        <input
          id="email_admin"
          type="email"
          className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-text-primary outline-none transition focus:border-accent-blue"
          {...register("email_admin")}
        />
        {errors.email_admin ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.email_admin.message}
          </p>
        ) : null}
      </div>
      <div className="md:col-span-2">
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="password"
        >
          Contrasena
        </label>
        <p className="mb-2 text-xs text-text-muted">
          Usa al menos 6 caracteres. Recomendado: mayusculas, numeros y un
          simbolo.
        </p>
        <div className="relative">
          {/* Campo con boton para mostrar u ocultar la clave */}
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 pr-12 text-text-primary outline-none transition focus:border-accent-blue"
            {...register("password")}
          />
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
      <div className="md:col-span-2">
        <label
          className="mb-2 block text-sm text-text-muted"
          htmlFor="confirm_password"
        >
          Confirmar contrasena
        </label>
        <p className="mb-2 text-xs text-text-muted">
          Repite la misma contrasena para evitar errores de digitacion al crear
          la cuenta.
        </p>
        <div className="relative">
          {/* Repeticion de clave para evitar errores de digitacion en registro */}
          <input
            id="confirm_password"
            type={showConfirmPassword ? "text" : "password"}
            className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 pr-12 text-text-primary outline-none transition focus:border-accent-blue"
            {...register("confirm_password")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted transition hover:text-text-primary"
            aria-label={
              showConfirmPassword ? "Ocultar contrasena" : "Mostrar contrasena"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.confirm_password ? (
          <p className="mt-1 text-xs text-accent-red">
            {errors.confirm_password.message}
          </p>
        ) : null}
      </div>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent-blue px-5 py-2.5 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>
      </div>
    </form>
  );
}
