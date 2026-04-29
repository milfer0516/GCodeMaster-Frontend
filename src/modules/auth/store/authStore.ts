import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Empresa,
  EmpresaPlan,
  Usuario,
  PermisosSession,
} from "../../../types/global.types";

interface AuthStoreState {
  user: Usuario | null;
  empresa: Empresa | null;
  access_token: string | null;
  refresh_token: string | null;
  mfa_pendiente: boolean;
  mfa_id: string | null;
  onboarding_completo: boolean;
  plan_activo: EmpresaPlan;
  email_mfa_pendiente: string | null;
  permisos: PermisosSession | null;
  setPermisos: (permisos: PermisosSession) => void;
  setMfaId: (mfa_id: string) => void;
  setSession: (payload: {
    access_token: string;
    refresh_token: string | null;
    user?: Usuario | null;
    empresa?: Empresa | null;
  }) => void;
  setTokens: (access_token: string, refresh_token: string | null) => void;
  setMfaPendiente: (value: boolean, email?: string | null) => void;
  setOnboardingCompleto: (value: boolean) => void;
  setUser: (user: Usuario | null) => void;
  setEmpresa: (empresa: Empresa | null) => void;
  setPlanActivo: (plan: EmpresaPlan) => void;
  clearMfaPendiente: () => void;
  logout: () => void;
}

const initialState = {
  user: null,
  empresa: null,
  access_token: null,
  refresh_token: null,
  mfa_pendiente: false,
  mfa_id: null,
  onboarding_completo: false,
  plan_activo: "demo" as EmpresaPlan,
  email_mfa_pendiente: null,
  permisos: null,
};

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      ...initialState,
      setSession: ({ access_token, refresh_token, user, empresa }) =>
        set((state) => ({
          ...state,
          access_token,
          refresh_token,
          user: user ?? state.user,
          empresa: empresa ?? state.empresa,
          mfa_pendiente: false,
          mfa_id: null,
          email_mfa_pendiente: null,
          plan_activo: empresa?.plan_activo ?? state.plan_activo,
          onboarding_completo:
            empresa?.setup_completo ?? state.onboarding_completo,
        })),
      setTokens: (access_token, refresh_token) =>
        set({ access_token, refresh_token }),
      setPermisos: (permisos) => set({ permisos }),
      setMfaId: (mfa_id) => set({ mfa_id }),
      setMfaPendiente: (value, email = null) =>
        set({
          mfa_pendiente: value,
          email_mfa_pendiente: value ? email : null,
        }),
      setOnboardingCompleto: (value) => set({ onboarding_completo: value }),
      setUser: (user) => set({ user }),
      setEmpresa: (empresa) =>
        set((state) => ({
          empresa,
          plan_activo: empresa?.plan_activo ?? state.plan_activo,
        })),
      setPlanActivo: (plan) => set({ plan_activo: plan }),
      clearMfaPendiente: () =>
        set({ mfa_pendiente: false, email_mfa_pendiente: null }),
      logout: () => set({ ...initialState }),
    }),
    {
      name: "gcodemaster-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        empresa: state.empresa,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        mfa_pendiente: state.mfa_pendiente,
        mfa_id: state.mfa_id,
        onboarding_completo: state.onboarding_completo,
        plan_activo: state.plan_activo,
        email_mfa_pendiente: state.email_mfa_pendiente,
        permisos: state.permisos,
      }),
    },
  ),
);
