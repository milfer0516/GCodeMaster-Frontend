import { useAuthStore } from "../modules/auth/store/authStore";

export function useRequireOnboarding() {
  return useAuthStore((state) => ({
    onboardingCompleto: state.onboarding_completo,
    accessToken: state.access_token
  }));
}
