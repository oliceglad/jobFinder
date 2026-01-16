import { Link } from "react-router-dom";
import { useRecommendationsQuery } from "../app/api.js";

export default function RecommendationsPage() {
  const { data: recommendations = [], isFetching } = useRecommendationsQuery();

  return (
    <div className="card">
      <h3>Рекомендации</h3>
      {recommendations.length === 0 && (
        <p className="muted">
          {isFetching
            ? "Рекомендации рассчитываются..."
            : "Пока нет рекомендаций. Проверьте профиль и навыки."}
        </p>
      )}
      <div className="list">
        {recommendations.map((rec) => (
          <div className="list-item" key={rec.id}>
            <div>
              <h4><Link to={`/recommendations/${rec.id}`}>{rec.title}</Link></h4>
              <p className="muted">{rec.company || "Компания"} · {rec.city || ""}</p>
            </div>
            <div className="score">Score {rec.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
