import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { verifyRegistration } from "../lib/cognito";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function VerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingVerificationEmail = useAuthStore((state) => state.pendingVerificationEmail);
  const setPendingVerificationEmail = useAuthStore((state) => state.setPendingVerificationEmail);
  const session = useAuthStore((state) => state.session);
  const email = useMemo(() => searchParams.get("email") ?? pendingVerificationEmail, [pendingVerificationEmail, searchParams]);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  if (session) {
    return <Navigate replace to="/dashboard" />;
  }

  if (!email) {
    return <Navigate replace to="/register" />;
  }

  const handleChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setCode((current) => current.map((entry, entryIndex) => (entryIndex === index ? "" : entry)));
      return;
    }

    if (digits.length > 1) {
      const next = [...code];
      digits.slice(0, 6).split("").forEach((digit, digitIndex) => {
        if (index + digitIndex < 6) {
          next[index + digitIndex] = digit;
        }
      });
      setCode(next);
      refs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    setCode((current) => current.map((entry, entryIndex) => (entryIndex === index ? digits : entry)));
    refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmationCode = code.join("");

    if (confirmationCode.length !== 6) {
      setError("Enter the full 6-digit verification code.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await verifyRegistration(email, confirmationCode);
      setPendingVerificationEmail(null);
      navigate("/login", { replace: true });
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify email</CardTitle>
          <CardDescription>Enter the 6-digit code sent to {email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex justify-between gap-2">
              {code.map((value, index) => (
                <input
                  className="h-14 w-12 rounded-2xl border border-input bg-white/80 text-center text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  inputMode="numeric"
                  key={index}
                  maxLength={6}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={(event) => {
                    event.preventDefault();
                    handleChange(index, event.clipboardData.getData("text"));
                  }}
                  ref={(element) => {
                    refs.current[index] = element;
                  }}
                  value={value}
                />
              ))}
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Verifying" : "Verify account"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Need to restart?{" "}
            <Link className="font-medium text-primary" to="/register">
              Register again
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
