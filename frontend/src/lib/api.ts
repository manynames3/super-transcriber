import { refreshTokens } from "./cognito";
import { useAuthStore } from "../store/authStore";
import type { ApiErrorResponse } from "../types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface ApiRequestOptions extends RequestInit {
  retryOnUnauthorized?: boolean;
}

let refreshPromise: Promise<void> | null = null;

async function readError(response: Response): Promise<Error> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return new Error(data.error || `Request failed with status ${response.status}.`);
  } catch {
    return new Error(`Request failed with status ${response.status}.`);
  }
}

async function refreshSessionOrLogout() {
  const authStore = useAuthStore.getState();
  const session = authStore.session;

  if (!session?.refreshToken) {
    authStore.clearSession();
    window.location.assign("/login");
    throw new Error("Your session has expired.");
  }

  if (!refreshPromise) {
    refreshPromise = refreshTokens(session.refreshToken, session.email)
      .then((nextSession) => {
        useAuthStore.getState().setSession(nextSession);
      })
      .catch((error: unknown) => {
        useAuthStore.getState().clearSession();
        window.location.assign("/login");
        throw error instanceof Error ? error : new Error("Unable to refresh the session.");
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  await refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL.");
  }

  const { retryOnUnauthorized = true, headers, ...rest } = options;
  const session = useAuthStore.getState().session;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      ...(headers ?? {}),
      Authorization: session?.accessToken ? `Bearer ${session.accessToken}` : "",
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401 && retryOnUnauthorized) {
    await refreshSessionOrLogout();
    return apiRequest<T>(path, {
      ...options,
      retryOnUnauthorized: false,
    });
  }

  if (!response.ok) {
    throw await readError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
