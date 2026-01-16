import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../app/authSlice.js";
import GlobalStatus from "./GlobalStatus.jsx";
import MobileNav from "./MobileNav.jsx";

const baseTabs = [
  { to: "/dashboard", label: "Главная" },
  { to: "/vacancies", label: "Вакансии" },
  { to: "/recommendations", label: "Рекомендации" },
  { to: "/pipeline", label: "Отклики" },
  { to: "/profile", label: "Профиль" },
];

export default function AppShell({ children, routeKey }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const tabs = [...baseTabs];
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
          <p className="muted">Навигация по сервису</p>
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
            <div>
              <h2>Панель управления</h2>
              <p className="muted">Вакансии, отклики и рекомендации — всё здесь</p>
            </div>
            <div className="header-actions">
              <span className="pill">Роль: {roleLabel}</span>
              <span className="pill">{user?.email}</span>
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
