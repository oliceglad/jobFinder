import { useMemo } from "react";
import {
  useApplicationsQuery,
  useVacanciesByIdsQuery,
  useDeleteApplicationMutation,
} from "../app/api.js";
import useToast from "../components/useToast.js";

export default function PipelinePage() {
  const { data: applications = [] } = useApplicationsQuery();
  const vacancyIds = useMemo(
    () => Array.from(new Set(applications.map((app) => app.vacancy_id))),
    [applications]
  );
  const { data: vacancies = [] } = useVacanciesByIdsQuery(vacancyIds, {
    skip: vacancyIds.length === 0,
  });
  const [deleteApplication] = useDeleteApplicationMutation();
  const { notify } = useToast();

  const vacancyMap = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]));
  const statusLabel = {
    applied: "Откликнулся",
    interview: "Интервью",
    offer: "Оффер",
    rejected: "Отказ",
    success: "Успех",
  };

  return (
    <div className="card">
      <h3>Статусы откликов</h3>
      <div className="list">
        {applications.map((app) => {
          const vacancy = vacancyMap.get(app.vacancy_id);
          const contacts = [app.contact_email, app.contact_phone].filter(Boolean).join(" · ");
          return (
            <div className="list-item" key={app.id}>
              <div>
                <h4>{vacancy?.title || `Вакансия #${app.vacancy_id}`}</h4>
                <p className="muted">{vacancy?.company || "Компания"}</p>
                <p className="muted">{app.notes}</p>
                <div className="vacancy-badges">
                  <span className="badge badge-status">
                    {statusLabel[app.status] || app.status}
                  </span>
                </div>
                {app.status === "success" && (app.contact_name || contacts) && (
                  <div className="contact-card">
                    <div className="contact-title">Контакты работодателя</div>
                    {app.contact_name && <div className="contact-row">{app.contact_name}</div>}
                    {contacts && <div className="contact-row">{contacts}</div>}
                  </div>
                )}
              </div>
              <div className="actions">
                <button
                  className="ghost"
                  onClick={() =>
                    deleteApplication(app.id)
                      .unwrap()
                      .then(() => notify("Запись удалена", "success"))
                  }
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
