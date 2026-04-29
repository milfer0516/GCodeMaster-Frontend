import { useAuthStore } from "../modules/auth/store/authStore";

export function useRequireAuth() {
  return useAuthStore((state) => ({
    accessToken: state.access_token,
    mfaPendiente: state.mfa_pendiente,
    user: state.user
  }));
}
