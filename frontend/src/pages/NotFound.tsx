import { Link } from "react-router-dom";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg text-center">
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
    </div>
  );
}
