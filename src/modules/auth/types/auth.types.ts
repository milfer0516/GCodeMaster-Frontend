import type {
  AuthLoginResponse,
  AuthMFAVerificarResponse,
  Empresa,
  Usuario,
} from "../../../types/global.types";

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  nombre_empresa: string;
  nit: string;
  ciudad: string;
  telefono: string;
  responsable_tecnico: string;
  email_admin: string;
  password: string;
}

export interface MFAVerifyFormValues {
  codigo_6_digitos: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string | null;
  user: Usuario | null;
  empresa: Empresa | null;
}

export type { AuthLoginResponse, AuthMFAVerificarResponse };
