import { Link, useParams } from "react-router-dom";
import { useRecommendationsQuery, useVacancyQuery } from "../app/api.js";

export default function RecommendationDetailPage() {
  const { id } = useParams();
  const { data: recommendations = [] } = useRecommendationsQuery();
  const { data: vacancy } = useVacancyQuery(id, { skip: !id });

  const recommendation = recommendations.find((item) => String(item.id) === String(id));

  if (!recommendation) {
    return (
      <div className="card">
        <h3>Рекомендация не найдена</h3>
        <Link className="link" to="/recommendations">Вернуться к списку</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>{recommendation.title}</h3>
      <p className="muted">{recommendation.company || "Компания"} · {recommendation.city || ""}</p>
      <div className="score">Итоговый score: {recommendation.score}</div>
      {vacancy && (
        <div className="detail-grid">
          <div>
            <h4>Описание</h4>
            <p>{vacancy.description}</p>
          </div>
          {vacancy.requirements && (
            <div>
              <h4>Требования</h4>
              <p>{vacancy.requirements}</p>
            </div>
          )}
        </div>
      )}
      <Link className="link" to={`/vacancies/${recommendation.id}`}>Перейти к вакансии</Link>
    </div>
  );
}
