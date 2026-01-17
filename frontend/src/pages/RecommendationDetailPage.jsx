import { Link, useParams } from "react-router-dom";
import { useRecommendationsQuery, useVacancyQuery } from "../app/api.js";

export default function RecommendationDetailPage() {
  const { id } = useParams();
  const { data: recommendations = [] } = useRecommendationsQuery();
  const { data: vacancy } = useVacancyQuery(id, { skip: !id });

  const recommendation = recommendations.find((item) => String(item.id) === String(id));
  const scoreValue = recommendation ? Number(recommendation.score) : 0;
  const normalizedScore = Number.isFinite(scoreValue) ? Math.min(1, Math.max(0, scoreValue)) : 0;
  const scorePercent = Math.round(normalizedScore * 100);

  const formatSalary = () => {
    if (!vacancy) return null;
    const currency = vacancy.salary_currency
      ? vacancy.salary_currency.toUpperCase()
      : "RUB";
    const formatValue = (value) => Number(value).toLocaleString("ru-RU");
    if (vacancy.salary_from && vacancy.salary_to) {
      return `${formatValue(vacancy.salary_from)}–${formatValue(vacancy.salary_to)} ${currency}`;
    }
    if (vacancy.salary_from) {
      return `от ${formatValue(vacancy.salary_from)} ${currency}`;
    }
    if (vacancy.salary_to) {
      return `до ${formatValue(vacancy.salary_to)} ${currency}`;
    }
    return null;
  };

  if (!recommendation) {
    return (
      <div className="card">
        <h3>Рекомендация не найдена</h3>
        <Link className="link" to="/recommendations">Вернуться к списку</Link>
      </div>
    );
  }

  return (
    <div className="card recommendation-detail">
      <div className="recommendation-hero">
        <div>
          <h3>{recommendation.title}</h3>
          <p className="muted">{recommendation.company || "Компания"}</p>
        </div>
        <Link className="primary" to={`/vacancies/${recommendation.id}`}>К вакансии</Link>
      </div>
      <div className="recommendation-meta">
        <span className="badge badge-score">
          Match: {scorePercent}%
        </span>
        {vacancy?.city && <span className="badge badge-city">{vacancy.city}</span>}
        {vacancy && (
          <span className="badge badge-format">{vacancy.is_remote ? "Удалёнка" : "Офис/гибрид"}</span>
        )}
        {vacancy?.source && <span className="badge badge-source">{vacancy.source}</span>}
      </div>
      <div className="score-card">
        <div>
          <div className="muted">Совпадение</div>
          <div className="score-value">{scorePercent}%</div>
          <div className="score-caption">на основе навыков и рекомендаций</div>
        </div>
        <div className="score-gauge">
          <div className="score-track">
            <div className="score-fill" style={{ width: `${scorePercent}%` }} />
          </div>
          <div className="score-pill">{recommendation.score}</div>
        </div>
      </div>
      {vacancy && (
        <div className="card recommendation-preview">
          <div className="recommendation-preview-head">
            <div>
              <h4>Ключевые детали вакансии</h4>
              <p className="muted">Краткая выжимка перед откликом</p>
            </div>
            {formatSalary() && (
              <span className="badge badge-salary">{formatSalary()}</span>
            )}
          </div>
          <div className="detail-grid">
            <div>
              <h4>Описание</h4>
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: vacancy.description }} />
            </div>
            {vacancy.requirements && (
              <div>
                <h4>Требования</h4>
                <div className="rich-text" dangerouslySetInnerHTML={{ __html: vacancy.requirements }} />
              </div>
            )}
          </div>
        </div>
      )}
      <Link className="link" to="/recommendations">Вернуться к рекомендациям</Link>
    </div>
  );
}
