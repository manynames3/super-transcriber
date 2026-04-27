import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../lib/cognito";
import { useAuthStore } from "../store/authStore";
import { BrandMark } from "./BrandMark";
import { Button } from "./ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = async () => {
    try {
      if (session?.accessToken) {
        await logout(session.accessToken);
      }
    } catch (error) {
      console.error("logout failed", error);
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="app-shell">
      <header className="chrome-nav">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
          <Link to="/dashboard">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link className="hidden hover:text-foreground md:inline-flex" to="/dashboard">
              Dashboard
            </Link>
            {session?.email ? (
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs md:inline-flex">
                {session.email}
              </span>
            ) : null}
            <Button onClick={() => void handleLogout()} size="sm" variant="ghost">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
