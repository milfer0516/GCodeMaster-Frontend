import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { AuthRefreshResponse } from "../types/global.types";
import { useAuthStore } from "../modules/auth/store/authStore";

const baseURL =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_API_URL_DEV
    : import.meta.env.VITE_API_URL_PROD;

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().access_token;

  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refresh_token, setTokens, logout } = useAuthStore.getState();

  if (!refresh_token) {
    logout();
    window.location.assign("/login");
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<AuthRefreshResponse>(`${baseURL}/auth/refresh`, {
        refresh_token,
      })
      .then((response) => {
        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token ?? refresh_token;
        setTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      })
      .catch(() => {
        logout();
        window.location.assign("/login");
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    // Excluir logout: cualquier URL que contenga "logout" (sin importar prefijo/baseURL)
    const isLogoutRequest = originalRequest?.url?.includes("logout");

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/verify-mfa") ||
      originalRequest.url?.includes("/auth/refresh") ||
      isLogoutRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const newToken = await refreshAccessToken();
    if (!newToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
    originalRequest.headers.set("Authorization", `Bearer ${newToken}`);

    return api(originalRequest);
  },
);
