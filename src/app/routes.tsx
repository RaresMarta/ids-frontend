import { createBrowserRouter, redirect } from "react-router";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AnalysisPage from "./pages/AnalysisPage";
import ClassifyPage from "./pages/ClassifyPage";
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

  // Legacy paths fold into the consolidated analysis surface. Kept at the top
  // level (not behind the guard) so old bookmarks forward instead of bouncing
  // logged-out users to /login.
  { path: "/dashboard", loader: () => redirect("/analysis") },
  { path: "/results", loader: () => redirect("/analysis") },

  // ── Authenticated only ──────────────────────────────────────────────────────
  // Everything below requires a Supabase session; otherwise → /login.
  {
    Component: ProtectedRoute,
    children: [
      // Analysis is the home surface (classifier overview + history). Classify and the
      // classification report are nested pages reached via in-page buttons / back links.
      { path: "/analysis", Component: AnalysisPage },
      { path: "/analysis/classify", Component: ClassifyPage },
      { path: "/analysis/results", Component: ResultsPage },
      { path: "/compare", Component: ComparisonPage },
      { path: "/monitor", Component: LiveMonitorPage },
    ],
  },

  // Unknown URL → landing.
  { path: "*", loader: () => redirect("/") },
]);
