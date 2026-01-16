import { NavLink } from "react-router-dom";

export default function MobileNav({ tabs }) {
  return (
    <nav className="mobile-nav">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? "active" : "")}
          end>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
