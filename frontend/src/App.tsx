import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { RegisterPage } from "./pages/Register";
import { TranscriptPage } from "./pages/Transcript";
import { VerifyPage } from "./pages/Verify";

function HomeRedirect() {
  const session = useAuthStore((state) => state.session);
  return <Navigate replace to={session ? "/dashboard" : "/login"} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<HomeRedirect />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<RegisterPage />} path="/register" />
      <Route element={<VerifyPage />} path="/verify" />
      <Route element={<DashboardPage />} path="/dashboard" />
      <Route element={<TranscriptPage />} path="/transcript/:jobId" />
      <Route element={<NotFoundPage />} path="/404" />
      <Route element={<Navigate replace to="/404" />} path="*" />
    </Routes>
  );
}
