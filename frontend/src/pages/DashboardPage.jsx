import { useSelector } from "react-redux";
import {
  useFavoritesQuery,
  useProfileQuery,
  useRecommendationsQuery,
  useUserSkillsQuery,
} from "../app/api.js";

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useSelector((state) => state.auth.user);
  const { data: profile } = useProfileQuery();
  const { data: userSkills = [] } = useUserSkillsQuery();
  const { data: recommendations = [] } = useRecommendationsQuery();
  const { data: favorites = [] } = useFavoritesQuery();

  return (
    <div className="grid-two">
      <div className="card">
        <h3>Обзор</h3>
        <p className="muted">Контроль в одном месте.</p>
        <div className="stats">
          <Stat label="Навыки" value={userSkills.length} />
          <Stat label="Рекомендации" value={recommendations.length} />
          <Stat label="Избранное" value={favorites.length} />
        </div>
      </div>
      <div className="card">
        <h3>Профиль</h3>
        <p className="muted">Держите профиль актуальным.</p>
        <div className="profile-mini">
          <div>
            <div className="pill">
              {user?.role === "seeker"
                ? "Соискатель"
                : user?.role === "employer"
                ? "Работодатель"
                : user?.role === "admin"
                ? "Администратор"
                : "Пользователь"}
            </div>
            <h4>{profile?.full_name || user?.email}</h4>
            <p>{profile?.city || "Город не указан"}</p>
          </div>
          {profile?.avatar_thumb_url && (
            <img src={profile.avatar_thumb_url} alt="avatar" />
          )}
        </div>
      </div>
    </div>
  );
}
