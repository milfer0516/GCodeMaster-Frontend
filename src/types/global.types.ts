export type MfaPurpose = "login" | "register" | "reset_password";

export interface MFACode {
  id_mfa: number;
  id_usuario: number;
  mfa_id: string;
  purpose: MfaPurpose;
  expira_en: string;
  intentos: number;
  max_intentos: number;
}

export type EmpresaPlan = "demo" | "basic" | "premium";

export interface Empresa {
  id_empresa: number;
  codigo_empresa: string | null;
  nombre_empresa: string;
  nit?: string;
  ciudad?: string | null;
  telefono?: string | null;
  responsable_tecnico: string | null;
  plan_activo: EmpresaPlan;
  fecha_registro?: string;
  fecha_vencimiento: string | null;
  activo?: boolean;
  setup_completo: boolean;
}

export type Moneda = "COP" | "USD";
export type EstadoPago = "pendiente" | "confirmado" | "rechazado" | "cancelado";

export interface Pago {
  id_pago: number;
  id_empresa: number;
  monto: number;
  moneda: Moneda;
  plan: string;
  estado: EstadoPago;
  numero_transaccion: string;
  fecha_vencimiento: string;
}

export type RolUsuario = "admin" | "operario" | "cliente";

export interface Usuario {
  id_usuario: number;
  id_empresa?: number;
  nombre_completo: string;
  email: string;
  rol: RolUsuario;
  activo?: boolean;
  verificado?: boolean;
}

export type TipoMaquina = "VMC" | "Torno" | "Fresadora";
export type ControladorMaquina = "FANUC" | "Siemens" | "HAAS";

export interface Maquina {
  id_maquina: number;
  id_empresa: number | null;
  nombre: string;
  modelo: string | null;
  marca: string | null;
  tipo: TipoMaquina;
  controlador: ControladorMaquina;
  rpm_min_husillo: number;
  rpm_max_husillo: number;
  avance_max_mmmin: number;
  recorrido_x_mm: number;
  recorrido_y_mm: number;
  recorrido_z_mm: number;
  cono_husillo: string | null;
  potencia_husillo_kw: number | null;
}

export type MaterialHerramienta = "HSS" | "Carburo" | "Inserto";
export type EstadoHerramienta =
  | "nuevo"
  | "bueno"
  | "desgastado"
  | "fuera_de_servicio";

export interface Herramienta {
  id_herramienta: number;
  id_empresa: number;
  nombre: string;
  tipo: string;
  diametro: number;
  filos: number;
  material_herramienta: MaterialHerramienta;
  largo_total: number | null;
  vida_util_horas: number | null;
  horas_usado: number;
  estado: EstadoHerramienta;
  costo_unitario: number | null;
}

export type GrupoIso = "P" | "M" | "K" | "N" | "S" | "H";

export interface MaterialGlobal {
  id_material: number;
  nombre: string;
  grupo_iso: GrupoIso;
  dureza_hb: number | null;
  vc_min: number;
  vc_max: number;
  fz_min: number;
  fz_max: number;
}

export type JobStatus = "pendiente" | "procesando" | "aprobado" | "error";

export interface Job {
  id_job: number;
  id_empresa: number;
  id_maquina: number;
  id_herramienta: number;
  id_material: number;
  status: JobStatus;
  archivo_gcode_path: string | null;
  simulacion_url: string | null;
}

export interface PerfilCorte {
  id_perfil: number;
  id_empresa: number;
  id_material: number;
  nombre: string;
  vc_personalizada: number;
  fz_personalizado: number;
}

export interface AuthLoginResponse {
  access_token: string;
  mfa_requerido: boolean;
}

export interface UsuarioSession {
  id_usuario: number;
  nombre_completo: string;
  email: string;
  rol: RolUsuario;
}

export interface EmpresaSession {
  id_empresa: number;
  codigo_empresa: string | null;
  nombre_empresa: string;
  responsable_tecnico: string | null;
  plan_activo: EmpresaPlan;
  fecha_vencimiento: string | null;
  setup_completo: boolean;
}

export interface PermisosSession {
  puede_descargar: boolean;
  puede_copiar: boolean;
  simulador_gl: boolean;
  ai_copilot: boolean;
}

export interface AuthLoginResponse {
  mfa_required: boolean;
  mfa_id: string;
  expires_in: number;
  message: string;
}

export interface AuthMFAVerificarResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  usuario: UsuarioSession;
  empresa: EmpresaSession;
  permisos: PermisosSession;
}

export interface AuthRefreshResponse {
  access_token: string;
  refresh_token?: string;
}
