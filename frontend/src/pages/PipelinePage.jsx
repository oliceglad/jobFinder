import { useMemo } from "react";
import {
  useApplicationsQuery,
  useVacanciesByIdsQuery,
  useUpdateApplicationMutation,
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
  const [updateApplication] = useUpdateApplicationMutation();
  const [deleteApplication] = useDeleteApplicationMutation();
  const { notify } = useToast();

  const vacancyMap = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]));

  return (
    <div className="card">
      <h3>Статусы откликов</h3>
      <div className="list">
        {applications.map((app) => {
          const vacancy = vacancyMap.get(app.vacancy_id);
          return (
            <div className="list-item" key={app.id}>
              <div>
                <h4>{vacancy?.title || `Вакансия #${app.vacancy_id}`}</h4>
                <p className="muted">{vacancy?.company || "Компания"}</p>
                <p className="muted">{app.notes}</p>
              </div>
              <div className="actions">
                <select
                  value={app.status}
                  onChange={(e) =>
                    updateApplication({ id: app.id, status: e.target.value })
                      .unwrap()
                      .then(() => notify("Статус обновлен", "success"))
                  }
                >
                  <option value="applied">Откликнулся</option>
                  <option value="interview">Интервью</option>
                  <option value="offer">Оффер</option>
                  <option value="rejected">Отказ</option>
                </select>
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
