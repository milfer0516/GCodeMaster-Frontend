import { api } from "../../../services/api";
import type {
  AuthLoginResponse,
  AuthMFAVerificarResponse,
} from "../../../types/global.types";
import type { RegisterFormValues } from "../types/auth.types";

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<AuthLoginResponse>("/auth/login", payload);
  return data;
}

export async function register(payload: RegisterFormValues) {
  const { data } = await api.post<{
    id_empresa: number;
    id_usuario: number;
    codigo_empresa: string;
    mensaje: string;
  }>("/auth/register", payload);
  return data;
}

export async function verifyMfa(payload: { mfa_id: string; code: string }) {
  const { data } = await api.post<AuthMFAVerificarResponse>(
    "/auth/verify-mfa",
    payload,
  );
  return data;
}

export async function refresh(refresh_token: string) {
  const { data } = await api.post("/auth/refresh", { refresh_token });
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function forgotPassword(payload: { email: string }) {
  const { data } = await api.post<{ mensaje: string }>(
    "/auth/forgot-password",
    payload,
  );
  return data;
}

export async function resetPassword(payload: {
  token: string;
  nueva_password: string;
  confirmar_password: string;
}) {
  const { data } = await api.post<{ mensaje: string }>(
    "/auth/reset-password",
    payload,
  );
  return data;
}
