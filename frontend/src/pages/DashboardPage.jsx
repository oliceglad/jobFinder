import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  useAdminStatsQuery,
  useDashboardMetricsQuery,
  useFavoritesQuery,
  useIncomingApplicationsQuery,
  useProfileQuery,
  useRecommendationsQuery,
  useUserSkillsQuery,
} from "../app/api.js";

const buildSparkline = (values, width, height) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const padding = 6;
  const points = values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const area = `${points} ${width - padding},${height - padding} ${padding},${height - padding}`;
  return { width, height, points, area };
};

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
  const role = user?.role;
  const isSeeker = role === "seeker";
  const isEmployer = role === "employer";
  const isAdmin = role === "admin";
  const { data: profile } = useProfileQuery();
  const { data: userSkills = [] } = useUserSkillsQuery(undefined, { skip: !isSeeker });
  const { data: recommendations = [] } = useRecommendationsQuery(undefined, { skip: !isSeeker });
  const { data: favorites = [] } = useFavoritesQuery(undefined, { skip: !isSeeker });
  const { data: dashboardMetrics } = useDashboardMetricsQuery(undefined, { skip: !isSeeker });
  const { data: incomingApplications = [] } = useIncomingApplicationsQuery(undefined, { skip: !isEmployer });
  const { data: adminStats } = useAdminStatsQuery(undefined, { skip: !isAdmin });

  const recommendationTrend = dashboardMetrics?.recommendation_trend ?? [0, 0, 0, 0, 0, 0, 0];
  const applicationRhythm = dashboardMetrics?.application_rhythm ?? [0, 0, 0, 0, 0, 0, 0];
  const profileProgress = dashboardMetrics?.profile_completion ?? { filled: 0, total: 5, score: 0 };
  const matchScore = dashboardMetrics?.match_score ?? 0;

  const activityBars = useMemo(() => {
    const max = Math.max(...applicationRhythm, 1);
    return applicationRhythm.map((value) => Math.round((value / max) * 100));
  }, [applicationRhythm]);

  const sparkline = useMemo(
    () => buildSparkline(recommendationTrend, 220, 84),
    [recommendationTrend]
  );

  const applicationTotal = useMemo(
    () => applicationRhythm.reduce((sum, value) => sum + value, 0),
    [applicationRhythm]
  );

  const donutStyle = useMemo(() => {
    const degrees = Math.round(profileProgress.score * 3.6);
    return {
      background: `conic-gradient(var(--chart-accent) 0deg ${degrees}deg, #f1e6dd ${degrees}deg 360deg)`,
    };
  }, [profileProgress.score]);

  const statusLabel = {
    applied: "Откликнулся",
    interview: "Интервью",
    offer: "Оффер",
    rejected: "Отказ",
    success: "Успех",
  };

  const incomingCounts = useMemo(() => {
    const base = { applied: 0, interview: 0, offer: 0, rejected: 0, success: 0 };
    incomingApplications.forEach((app) => {
      const key = app.status || "applied";
      if (base[key] === undefined) return;
      base[key] += 1;
    });
    return base;
  }, [incomingApplications]);

  const recentIncoming = useMemo(
    () =>
      [...incomingApplications]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [incomingApplications]
  );

  return (
    <div className="stack">
      <div className="grid-two">
        <div className="card">
          <h3>{isEmployer ? "Отклики" : isAdmin ? "Админ-обзор" : "Обзор"}</h3>
          <p className="muted">
            {isEmployer
              ? "Держите входящие отклики под контролем."
              : isAdmin
              ? "Быстрые метрики по платформе."
              : "Контроль в одном месте."}
          </p>
          {isSeeker && (
            <div className="stats">
              <Stat label="Навыки" value={userSkills.length} />
              <Stat label="Рекомендации" value={recommendations.length} />
              <Stat label="Избранное" value={favorites.length} />
            </div>
          )}
          {isEmployer && (
            <div className="stats">
              <Stat label="Новые" value={incomingCounts.applied} />
              <Stat label="Интервью" value={incomingCounts.interview} />
              <Stat label="Успех" value={incomingCounts.success} />
            </div>
          )}
          {isAdmin && (
            <div className="stats">
              <Stat label="Пользователи" value={adminStats?.users_total ?? 0} />
              <Stat label="Вакансии" value={adminStats?.vacancies_total ?? 0} />
              <Stat label="На модерации" value={adminStats?.vacancies_pending ?? 0} />
            </div>
          )}
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
      {isSeeker && (
        <div className="dashboard-charts">
          <div className="card chart-card accent-ember">
            <div className="chart-head">
              <div>
                <h3>Динамика рекомендаций</h3>
                <p className="muted">Последние 7 дней</p>
              </div>
              <span className="chart-pill">Индекс {matchScore}%</span>
            </div>
            <div className="sparkline">
              <svg viewBox={`0 0 ${sparkline.width} ${sparkline.height}`} role="img" aria-label="Динамика рекомендаций">
                <polygon className="sparkline-fill" points={sparkline.area} />
                <polyline className="sparkline-line" points={sparkline.points} />
              </svg>
            </div>
            <div className="chart-foot">
              <span className="muted">Рекомендации</span>
              <span className="chart-value">{recommendations.length}</span>
            </div>
          </div>
          <div className="card chart-card accent-teal">
            <div className="chart-head">
              <div>
                <h3>Ритм откликов</h3>
                <p className="muted">По дням недели</p>
              </div>
              <span className="chart-pill">{applicationTotal} всего</span>
            </div>
            <div className="bar-chart">
              {activityBars.map((height, index) => (
                <span
                  key={`bar-${index}`}
                  className="bar"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="bar-labels">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      {isEmployer && (
        <div className="grid-two">
          <div className="card">
            <h3>Статусы откликов</h3>
            <p className="muted">Распределение по этапам.</p>
            <div className="stats">
              <Stat label="Интервью" value={incomingCounts.interview} />
              <Stat label="Оффер" value={incomingCounts.offer} />
              <Stat label="Отказ" value={incomingCounts.rejected} />
            </div>
          </div>
          <div className="card">
            <h3>Профиль заполнен</h3>
            <p className="muted">Как видят вас соискатели.</p>
            <div className="profile-progress">
              <div className="donut" style={donutStyle}>
                <span>{profileProgress.score}%</span>
              </div>
              <div>
                <p>Заполнено полей</p>
                <strong>
                  {profileProgress.filled}/{profileProgress.total}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
      {isEmployer && (
        <div className="card">
          <div className="chart-head">
            <div>
              <h3>Последние отклики</h3>
              <p className="muted">5 последних обновлений.</p>
            </div>
            <span className="chart-pill">{incomingApplications.length} всего</span>
          </div>
          <div className="list">
            {recentIncoming.length === 0 && <p className="muted">Откликов пока нет.</p>}
            {recentIncoming.map((app) => (
              <div className="list-item" key={app.id}>
                <div>
                  <h4>{app.vacancy_title || `Вакансия #${app.vacancy_id}`}</h4>
                  <p className="muted">{app.seeker_name || app.seeker_email}</p>
                </div>
                <span className="badge badge-status">{statusLabel[app.status] || app.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {isAdmin && (
        <div className="grid-two">
          <div className="card">
            <h3>Пользователи</h3>
            <p className="muted">Статус аккаунтов.</p>
            <div className="stats">
              <Stat label="Активные" value={adminStats?.users_active ?? 0} />
              <Stat label="Бан" value={adminStats?.users_banned ?? 0} />
              <Stat label="Соискатели" value={adminStats?.seekers_total ?? 0} />
            </div>
          </div>
          <div className="card">
            <h3>Вакансии</h3>
            <p className="muted">Модерация и поток.</p>
            <div className="stats">
              <Stat label="Одобрено" value={adminStats?.vacancies_approved ?? 0} />
              <Stat label="Отклонено" value={adminStats?.vacancies_rejected ?? 0} />
              <Stat label="Отклики" value={adminStats?.applications_total ?? 0} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
