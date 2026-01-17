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

  const formatSalary = () => {
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
    if (matchedSkills.length === 0 || !preferences.highlightEnabled) return value;
    const pattern = matchedSkills
      .map((skill) => skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const testRegex = new RegExp(pattern, "i");
    const splitRegex = new RegExp(`(${pattern})`, "gi");
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");

    const walk = (node) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.nodeValue || "";
          if (!testRegex.test(text)) return;
          const fragment = doc.createDocumentFragment();
          const parts = text.split(splitRegex);
          parts.forEach((part, index) => {
            if (!part) return;
            if (index % 2 === 1) {
              if (preferences.tooltipEnabled) {
                const span = doc.createElement("span");
                span.className = "skill-highlight";
                span.setAttribute("data-tip", `Навык совпал с вакансией: ${part}`);
                span.textContent = part;
                fragment.appendChild(span);
              } else {
                const mark = doc.createElement("mark");
                mark.textContent = part;
                fragment.appendChild(mark);
              }
            } else {
              fragment.appendChild(doc.createTextNode(part));
            }
          });
          child.replaceWith(fragment);
          return;
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (["SCRIPT", "STYLE"].includes(child.tagName)) return;
          walk(child);
        }
      });
    };

    walk(doc.body);
    return doc.body.innerHTML;
  };

  return (
    <div className="card vacancy-detail">
      <div className="vacancy-hero">
        <div>
          <h3>{vacancy.title}</h3>
          <p className="muted">{vacancy.company || "Компания"}</p>
        </div>
        <a className="primary" href={vacancy.url} target="_blank" rel="noreferrer">Открыть вакансию</a>
      </div>
      <div className="vacancy-meta">
        {formatSalary() && <span className="badge badge-salary">{formatSalary()}</span>}
        {vacancy.city && <span className="badge badge-city">{vacancy.city}</span>}
        <span className="badge badge-format">{vacancy.is_remote ? "Удалёнка" : "Офис/гибрид"}</span>
        {vacancy.source && <span className="badge badge-source">{vacancy.source}</span>}
      </div>
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
          <div
            className="rich-text"
            dangerouslySetInnerHTML={{ __html: highlightSkills(vacancy.description) }}
          />
        </div>
        {vacancy.requirements && (
          <div>
            <h4>Требования</h4>
            <div
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: highlightSkills(vacancy.requirements) }}
            />
          </div>
        )}
        {vacancy.responsibilities && (
          <div>
            <h4>Обязанности</h4>
            <div
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: highlightSkills(vacancy.responsibilities) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
