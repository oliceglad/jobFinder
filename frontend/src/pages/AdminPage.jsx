import { useMemo, useState } from "react";
import {
  useSeedSkillsMutation,
  useSeedDemoMutation,
  useAdminStatsQuery,
  useAdminUsersQuery,
  useUpdateAdminUserMutation,
  useAdminVacanciesQuery,
  useUpdateAdminVacancyMutation,
  useAdminModerationLogsQuery,
} from "../app/api.js";
import useToast from "../components/useToast.js";

export default function AdminPage() {
  const [seedSkills] = useSeedSkillsMutation();
  const [seedDemo] = useSeedDemoMutation();
  const { data: stats } = useAdminStatsQuery();
  const { data: users = [] } = useAdminUsersQuery();
  const [updateAdminUser] = useUpdateAdminUserMutation();
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState("");
  const [moderationNotes, setModerationNotes] = useState({});
  const { data: vacancies = [] } = useAdminVacanciesQuery(
    vacancyStatusFilter ? { status: vacancyStatusFilter } : undefined
  );
  const [updateAdminVacancy] = useUpdateAdminVacancyMutation();
  const { data: moderationLogs = [] } = useAdminModerationLogsQuery();
  const { notify } = useToast();

  const statsItems = useMemo(
    () => [
      { label: "Пользователи", value: stats?.users_total ?? 0 },
      { label: "Активные", value: stats?.users_active ?? 0 },
      { label: "Заблокированные", value: stats?.users_banned ?? 0 },
      { label: "Соискатели", value: stats?.seekers_total ?? 0 },
      { label: "Работодатели", value: stats?.employers_total ?? 0 },
      { label: "Вакансии", value: stats?.vacancies_total ?? 0 },
      { label: "На модерации", value: stats?.vacancies_pending ?? 0 },
      { label: "Отклики", value: stats?.applications_total ?? 0 },
    ],
    [stats]
  );

  const statusLabel = {
    pending: "На модерации",
    approved: "Одобрена",
    rejected: "Отклонена",
  };

  return (
    <div className="stack">
      <div className="card">
        <h3>Админ-дашборд</h3>
        <p className="muted">Сводка активности платформы и контроль качества.</p>
        <div className="stats">
          {statsItems.map((item) => (
            <div className="stat" key={item.label}>
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Навыки</h3>
        <button
          className="primary"
          onClick={() => seedSkills().unwrap().then(() => notify("Навыки загружены", "success"))}
        >
          Загрузить пул навыков
        </button>
        <button
          className="ghost"
          onClick={() => seedDemo().unwrap().then(() => notify("Демо-данные добавлены", "success"))}
        >
          Добавить демо вакансии и работодателя
        </button>
      </div>
      <div className="card">
        <h3>Модерация вакансий</h3>
        <div className="filter-grid">
          <label className="filter-group">
            <span>Статус</span>
            <select
              value={vacancyStatusFilter}
              onChange={(e) => setVacancyStatusFilter(e.target.value)}
            >
              <option value="">Все</option>
              <option value="pending">На модерации</option>
              <option value="approved">Одобрены</option>
              <option value="rejected">Отклонены</option>
            </select>
          </label>
        </div>
        <div className="list list-scroll">
          {vacancies.length === 0 && <p className="muted">Нет вакансий для модерации.</p>}
          {vacancies.map((vacancy) => (
            <div className="list-item admin-vacancy" key={vacancy.id}>
              <div>
                <h4>{vacancy.title}</h4>
                <p className="muted">{vacancy.company || "Компания"} · {vacancy.city || "Город не указан"}</p>
                <div className="vacancy-badges">
                  <span className="badge badge-source">{vacancy.source}</span>
                  <span className="badge badge-status">{statusLabel[vacancy.moderation_status] || vacancy.moderation_status}</span>
                </div>
                <label className="filter-group">
                  <span>Комментарий модерации</span>
                  <input
                    value={moderationNotes[vacancy.id] || ""}
                    onChange={(e) =>
                      setModerationNotes((prev) => ({ ...prev, [vacancy.id]: e.target.value }))
                    }
                    placeholder="Причина решения"
                  />
                </label>
              </div>
              <div className="actions">
                <select
                  value={vacancy.moderation_status}
                  onChange={(e) =>
                    updateAdminVacancy({
                      id: vacancy.id,
                      moderation_status: e.target.value,
                      note: moderationNotes[vacancy.id] || null,
                    })
                      .unwrap()
                      .then(() => notify("Статус модерации обновлен", "success"))
                  }
                >
                  <option value="pending">На модерации</option>
                  <option value="approved">Одобрить</option>
                  <option value="rejected">Отклонить</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Журнал модерации</h3>
        <p className="muted">Последние изменения статусов вакансий.</p>
        <button
          className="ghost"
          type="button"
          onClick={() => window.open("/api/admin/moderation/logs/export", "_blank")}
        >
          Экспорт CSV
        </button>
        <div className="list">
          {moderationLogs.length === 0 && <p className="muted">Пока нет записей.</p>}
          {moderationLogs.slice(0, 20).map((log) => (
            <div className="list-item admin-log" key={log.id}>
              <div>
                <h4>{log.vacancy_title || `Вакансия #${log.vacancy_id}`}</h4>
                <p className="muted">{log.admin_email || "Администратор"}</p>
                <div className="vacancy-badges">
                  <span className="badge badge-status">{statusLabel[log.from_status] || log.from_status}</span>
                  <span className="badge badge-status">{statusLabel[log.to_status] || log.to_status}</span>
                </div>
                {log.note && <p className="muted">{log.note}</p>}
              </div>
              <div className="actions">
                <span className="muted">{new Date(log.created_at).toLocaleString("ru-RU")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Пользователи</h3>
        <p className="muted">Мягкая блокировка аккаунтов без удаления.</p>
        <div className="list">
          {users.length === 0 && <p className="muted">Нет пользователей.</p>}
          {users.map((user) => (
            <div className="list-item admin-user" key={user.id}>
              <div>
                <h4>{user.email}</h4>
                <div className="vacancy-badges">
                  <span className="badge badge-city">{user.role}</span>
                  <span className="badge badge-status">{user.is_active ? "Активен" : "Заблокирован"}</span>
                </div>
              </div>
              <div className="actions">
                <button
                  className={user.is_active ? "ghost" : "primary"}
                  onClick={() =>
                    updateAdminUser({ id: user.id, is_active: !user.is_active })
                      .unwrap()
                      .then(() => notify(user.is_active ? "Пользователь заблокирован" : "Пользователь активирован", "success"))
                  }
                >
                  {user.is_active ? "Заблокировать" : "Разблокировать"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
