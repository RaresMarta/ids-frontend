import { createBrowserRouter } from "react-router";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AnalysisPage from "./pages/AnalysisPage";
import ComparisonPage from "./pages/ComparisonPage";
import ResultsPage from "./pages/ResultsPage";
import LiveMonitorPage from "./pages/LiveMonitorPage";

export const router = createBrowserRouter([
  {
    // Public landing page.
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
  {
    path: "/dashboard",
    Component: DashboardPage,
  },
  {
    path: "/analysis",
    Component: AnalysisPage,
  },
  {
    path: "/compare",
    Component: ComparisonPage,
  },
  {
    path: "/results",
    Component: ResultsPage,
  },
  {
    // Public showcase — the live operator console (no auth gate).
    path: "/monitor",
    Component: LiveMonitorPage,
  },
]);
