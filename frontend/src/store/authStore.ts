import { create } from "zustand";
import type { AuthSession } from "../types";

interface AuthState {
  pendingVerificationEmail: string | null;
  session: AuthSession | null;
  clearSession: () => void;
  setPendingVerificationEmail: (email: string | null) => void;
  setSession: (session: AuthSession) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  pendingVerificationEmail: null,
  session: null,
  clearSession: () =>
    set({
      pendingVerificationEmail: null,
      session: null,
    }),
  setPendingVerificationEmail: (email) =>
    set({
      pendingVerificationEmail: email,
    }),
  setSession: (session) =>
    set({
      session,
    }),
}));
