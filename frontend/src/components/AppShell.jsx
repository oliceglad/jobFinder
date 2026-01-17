import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../app/authSlice.js";
import GlobalStatus from "./GlobalStatus.jsx";
import MobileNav from "./MobileNav.jsx";

const baseTabs = [
  { to: "/dashboard", label: "Главная" },
  { to: "/vacancies", label: "Вакансии" },
  { to: "/recommendations", label: "Рекомендации" },
  { to: "/pipeline", label: "Отклики" },
  { to: "/notifications", label: "Уведомления" },
  { to: "/profile", label: "Профиль" },
];

export default function AppShell({ children, routeKey }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) return;
    const key = `lk-refreshed-${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "true");
    window.location.reload();
  }, [user]);

  const tabs = baseTabs.filter((tab) => {
    if (user?.role === "employer") {
      return (
        tab.to !== "/vacancies" &&
        tab.to !== "/recommendations" &&
        tab.to !== "/pipeline" &&
        tab.to !== "/notifications"
      );
    }
    if (user?.role === "admin") {
      return tab.to === "/dashboard";
    }
    return true;
  });
  if (user?.role === "employer") {
    tabs.push({ to: "/employer", label: "Работодатель" });
  }
  if (user?.role === "admin") {
    tabs.push({ to: "/admin", label: "Админ" });
  }

  const roleLabel = {
    seeker: "Соискатель",
    employer: "Работодатель",
    admin: "Администратор",
  }[user?.role] || "Пользователь";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/auth");
  };

  return (
    <div className="content">
      <GlobalStatus />
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">JobFinder</div>
          <nav className="tabs">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => (isActive ? "active" : "")}
                end
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="main">
          <header className="header">
            <div className="header-title">
              <h2>Панель управления</h2>
            </div>
            <div className="header-actions">
              <span className="role-pill">
                <span className="role-dot" />
                <span className="role-label">Роль:</span>
                <span className="role-value">{roleLabel}</span>
              </span>
              <span className="pill email-pill">{user?.email}</span>
              <button className="ghost" onClick={handleLogout}>Выйти</button>
            </div>
          </header>
          <main className="panel-grid">
            <div key={routeKey} className="page">
              {children}
            </div>
          </main>
        </section>
      </div>
      <MobileNav tabs={tabs} />
    </div>
  );
}
