import type { ReactElement } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BottomNav, KenteStrip, type NavKey } from "@krado/ui";
import { getToken } from "./api";
import { LangProvider, useLang } from "./lang";
import { Login } from "./screens/Login";
import { Onboarding } from "./screens/Onboarding";
import { Dashboard } from "./screens/Dashboard";
import { Bookings } from "./screens/Bookings";
import { Money } from "./screens/Money";
import { Styles } from "./screens/Styles";
import { Settings } from "./screens/Settings";

const NAV_PATHS: Record<NavKey, string> = {
  home: "/",
  bookings: "/bookings",
  money: "/money",
  styles: "/styles",
};

function Shell() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = (Object.entries(NAV_PATHS).find(([, path]) => path === pathname)?.[0] ??
    undefined) as NavKey | undefined;

  return (
    <div className="app-shell">
      <KenteStrip />
      <main className="app-shell__main">
        <Outlet />
      </main>
      <div className="app-shell__nav">
        <BottomNav lang={lang} active={active} onNavigate={(key) => navigate(NAV_PATHS[key])} />
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactElement }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <LangProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/money" element={<Money />} />
          <Route path="/styles" element={<Styles />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LangProvider>
  );
}
