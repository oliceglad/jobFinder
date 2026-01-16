import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useUserSkillsQuery, useVacancyQuery } from "../app/api.js";

export default function VacancyDetailPage() {
  const { id } = useParams();
  const { data: vacancy, isFetching } = useVacancyQuery(id, { skip: !id });
  const { data: userSkills = [] } = useUserSkillsQuery();
  const preferences = useSelector((state) => state.ui.preferences);

  if (!vacancy) {
    return (
      <div className="card">
        <h3>{isFetching ? "Загрузка вакансии…" : "Вакансия не найдена"}</h3>
        {!isFetching && <Link className="link" to="/vacancies">Вернуться к списку</Link>}
      </div>
    );
  }

  const skillNames = userSkills.map((item) => item.skill?.name).filter(Boolean);

  const stripHtml = (value) => {
    if (!value) return "";
    const doc = new DOMParser().parseFromString(value, "text/html");
    return doc.body.textContent || "";
  };

  const plainText = [
    vacancy.title,
    stripHtml(vacancy.description),
    stripHtml(vacancy.requirements),
    stripHtml(vacancy.responsibilities),
  ]
    .filter(Boolean)
    .join(" ");

  const lowerText = plainText.toLowerCase();
  const matchedSkills = skillNames.filter((skill) => lowerText.includes(skill.toLowerCase()));
  const missingSkills = skillNames.filter((skill) => !lowerText.includes(skill.toLowerCase()));

  const highlightSkills = (value) => {
    if (!value) return "";
    const content = stripHtml(value);
    if (matchedSkills.length === 0 || !preferences.highlightEnabled) return content;
    const pattern = matchedSkills
      .map((skill) => skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(`(${pattern})`, "gi");
    if (!preferences.tooltipEnabled) {
      return content.replace(regex, "<mark>$1</mark>");
    }
    return content.replace(
      regex,
      "<span class=\"skill-highlight\" data-tip=\"Навык совпал с вакансией: $1\">$1</span>"
    );
  };

  return (
    <div className="card">
      <h3>{vacancy.title}</h3>
      <p className="muted">{vacancy.company || "Компания"} · {vacancy.city || ""}</p>
      <div className="card gap-card">
        <h4>Gap-анализ навыков</h4>
        <p className="muted">Сопоставление ваших навыков с текстом вакансии.</p>
        <div className="gap-grid">
          <div>
            <div className="pill">Совпали</div>
            <div className="skills">
              {matchedSkills.length > 0 ? matchedSkills.slice(0, 12).map((skill) => (
                <span key={skill} className="tag active">{skill}</span>
              )) : <span className="muted">Пока нет совпадений</span>}
            </div>
          </div>
          <div>
            <div className="pill">Стоит подтянуть</div>
            <div className="skills">
              {missingSkills.length > 0 ? missingSkills.slice(0, 12).map((skill) => (
                <span key={skill} className="tag">{skill}</span>
              )) : <span className="muted">Все навыки совпали</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <h4>Описание</h4>
          <p dangerouslySetInnerHTML={{ __html: highlightSkills(vacancy.description) }} />
        </div>
        {vacancy.requirements && (
          <div>
            <h4>Требования</h4>
            <p dangerouslySetInnerHTML={{ __html: highlightSkills(vacancy.requirements) }} />
          </div>
        )}
        {vacancy.responsibilities && (
          <div>
            <h4>Обязанности</h4>
            <p dangerouslySetInnerHTML={{ __html: highlightSkills(vacancy.responsibilities) }} />
          </div>
        )}
      </div>
      <div className="detail-meta">
        <span className="pill">{vacancy.is_remote ? "Удалёнка" : "Офис/гибрид"}</span>
        {vacancy.salary_from && <span className="pill">От {vacancy.salary_from}</span>}
        {vacancy.salary_to && <span className="pill">До {vacancy.salary_to}</span>}
        {vacancy.source && <span className="pill">Источник: {vacancy.source}</span>}
      </div>
      <a className="primary" href={vacancy.url} target="_blank" rel="noreferrer">Открыть вакансию</a>
    </div>
  );
}
