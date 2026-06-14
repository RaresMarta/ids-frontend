import { createBrowserRouter } from "react-router";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AnalysisPage from "./pages/AnalysisPage";
import ComparisonPage from "./pages/ComparisonPage";
import ResultsPage from "./pages/ResultsPage";
import LiveMonitorPage from "./pages/LiveMonitorPage";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  // ── Public ────────────────────────────────────────────────────────────────
  {
    // The landing page is the only public app surface.
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },

  // ── Authenticated only ──────────────────────────────────────────────────────
  // Everything below requires a Supabase session; otherwise → /login.
  {
    Component: ProtectedRoute,
    children: [
      { path: "/dashboard", Component: DashboardPage },
      { path: "/analysis", Component: AnalysisPage },
      { path: "/compare", Component: ComparisonPage },
      { path: "/results", Component: ResultsPage },
      { path: "/monitor", Component: LiveMonitorPage },
    ],
  },
]);
