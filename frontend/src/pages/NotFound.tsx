import { Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function NotFoundPage() {
  return (
    <AuthShell
      eyebrow="Missing route"
      subtitle="This single-page app only exposes auth, dashboard, and transcript routes. The requested path is outside the current shell."
      title={
        <>
          This page fell <em>off</em> the map.
        </>
      }
    >
      <Card className="mx-auto w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The route you requested does not exist in this single-page app.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/dashboard">
            Return to dashboard
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
