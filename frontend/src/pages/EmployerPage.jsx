import { useEffect, useMemo, useState } from "react";
import {
  useCreateVacancyMutation,
  useIncomingApplicationsQuery,
  useUpdateApplicationMutation,
  useSkillsQuery,
  useTalentsQuery,
} from "../app/api.js";
import useToast from "../components/useToast.js";

export default function EmployerPage() {
  const [createVacancy] = useCreateVacancyMutation();
  const { data: incomingApplications = [] } = useIncomingApplicationsQuery();
  const [updateApplication] = useUpdateApplicationMutation();
  const { data: skills = [] } = useSkillsQuery();
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [talentCity, setTalentCity] = useState("");
  const [talentRegion, setTalentRegion] = useState("");
  const [talentQuery, setTalentQuery] = useState("");
  const [talentSalaryMin, setTalentSalaryMin] = useState("");
  const [talentSalaryMax, setTalentSalaryMax] = useState("");
  const [talentExpMin, setTalentExpMin] = useState("");
  const [talentExpMax, setTalentExpMax] = useState("");
  const CITY_REGION_MAP = {
    Москва: "Москва",
    "Санкт-Петербург": "Санкт-Петербург",
    Новосибирск: "Новосибирская область",
    Екатеринбург: "Свердловская область",
    Казань: "Республика Татарстан",
    "Нижний Новгород": "Нижегородская область",
    Челябинск: "Челябинская область",
    Самара: "Самарская область",
    Омск: "Омская область",
    "Ростов-на-Дону": "Ростовская область",
    Уфа: "Республика Башкортостан",
    Красноярск: "Красноярский край",
    Пермь: "Пермский край",
    Воронеж: "Воронежская область",
    Волгоград: "Волгоградская область",
    Краснодар: "Краснодарский край",
    Саратов: "Саратовская область",
    Тюмень: "Тюменская область",
    Тольятти: "Самарская область",
    Ижевск: "Удмуртская Республика",
    Барнаул: "Алтайский край",
    Ульяновск: "Ульяновская область",
    Иркутск: "Иркутская область",
    Хабаровск: "Хабаровский край",
    Ярославль: "Ярославская область",
    Владивосток: "Приморский край",
    Махачкала: "Республика Дагестан",
    Томск: "Томская область",
    Оренбург: "Оренбургская область",
    Кемерово: "Кемеровская область",
  };
  const CITY_OPTIONS = Object.keys(CITY_REGION_MAP);
  const talentsParams = useMemo(() => {
    const params = {};
    if (selectedSkills.length) params.skill_ids = selectedSkills;
    if (talentCity) params.city = talentCity;
    if (talentRegion) params.region = talentRegion;
    if (talentQuery.trim()) params.q = talentQuery.trim();
    if (talentSalaryMin) params.salary_min = Number(talentSalaryMin);
    if (talentSalaryMax) params.salary_max = Number(talentSalaryMax);
    if (talentExpMin) params.exp_min = Number(talentExpMin);
    if (talentExpMax) params.exp_max = Number(talentExpMax);
    return params;
  }, [selectedSkills, talentCity, talentRegion, talentQuery, talentSalaryMin, talentSalaryMax, talentExpMin, talentExpMax]);
  const { data: talents = [] } = useTalentsQuery(talentsParams);
  const { notify } = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    company: "",
    city: "",
    url: "",
    salary_from: "",
    salary_to: "",
    is_remote: false,
  });
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    const next = {};
    incomingApplications.forEach((app) => {
      next[app.id] = {
        status: app.status,
        contact_name: app.contact_name || "",
        contact_email: app.contact_email || "",
        contact_phone: app.contact_phone || "",
      };
    });
    setDrafts(next);
  }, [incomingApplications]);

  const statusLabel = {
    applied: "Откликнулся",
    interview: "Интервью",
    offer: "Оффер",
    rejected: "Отказ",
    success: "Успех",
  };

  const [expandedSeekerId, setExpandedSeekerId] = useState(null);
  const sortedApplications = useMemo(
    () =>
      [...incomingApplications].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [incomingApplications]
  );

  const toggleSkill = (skillId) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const toggleSeeker = (id) => {
    setExpandedSeekerId((prev) => (prev === id ? null : id));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    createVacancy({
      ...form,
      salary_from: form.salary_from ? Number(form.salary_from) : null,
      salary_to: form.salary_to ? Number(form.salary_to) : null,
      source: "manual",
    }).unwrap().then(() => notify("Вакансия опубликована", "success"));
  };

  const handleDraftChange = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = (appId) => {
    const draft = drafts[appId];
    if (!draft) return;
    const payload = { id: appId, status: draft.status };
    if (draft.status === "success") {
      payload.contact_name = draft.contact_name || null;
      payload.contact_email = draft.contact_email || null;
      payload.contact_phone = draft.contact_phone || null;
    } else {
      payload.contact_name = null;
      payload.contact_email = null;
      payload.contact_phone = null;
    }
    updateApplication(payload)
      .unwrap()
      .then(() => notify("Отклик обновлен", "success"));
  };

  return (
    <div className="stack">
      <div className="card">
        <h3>Новая вакансия</h3>
        <form className="form" onSubmit={handleSubmit}>
          <input placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input placeholder="Компания" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input placeholder="Город" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input placeholder="Ссылка" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <input type="number" placeholder="Зарплата от" value={form.salary_from} onChange={(e) => setForm({ ...form, salary_from: e.target.value })} />
          <input type="number" placeholder="Зарплата до" value={form.salary_to} onChange={(e) => setForm({ ...form, salary_to: e.target.value })} />
          <label className="checkbox">
            <input type="checkbox" checked={form.is_remote} onChange={(e) => setForm({ ...form, is_remote: e.target.checked })} />
            Возможна удаленка
          </label>
          <button className="primary" type="submit">Опубликовать</button>
        </form>
      </div>
      <div className="card">
        <h3>Отклики на вакансии</h3>
        <div className="list">
          {sortedApplications.length === 0 && (
            <p className="muted">Пока нет новых откликов.</p>
          )}
          {sortedApplications.map((app) => {
            const draft = drafts[app.id] || { status: app.status };
            return (
              <div className="list-item application-card" key={app.id}>
                <div>
                  <h4>{app.vacancy_title || `Вакансия #${app.vacancy_id}`}</h4>
                  <p className="muted">{app.vacancy_company || "Компания"}</p>
                  <div className="application-meta">
                    <span className="badge badge-status">
                      {statusLabel[app.status] || app.status}
                    </span>
                    <span className="badge badge-city">{app.seeker_name || app.seeker_email}</span>
                    {app.seeker_phone && (
                      <span className="badge badge-contact">{app.seeker_phone}</span>
                    )}
                  </div>
                  {app.notes && <p className="muted">{app.notes}</p>}
                </div>
                <div className="actions">
                  <label className="filter-group">
                    <span>Статус</span>
                    <select
                      value={draft.status}
                      onChange={(e) => handleDraftChange(app.id, "status", e.target.value)}
                    >
                      <option value="applied">Откликнулся</option>
                      <option value="interview">Интервью</option>
                      <option value="offer">Оффер</option>
                      <option value="rejected">Отказ</option>
                      <option value="success">Успех</option>
                    </select>
                  </label>
                  {draft.status === "success" && (
                    <div className="contact-form">
                      <input
                        placeholder="Контактное лицо"
                        value={draft.contact_name || ""}
                        onChange={(e) => handleDraftChange(app.id, "contact_name", e.target.value)}
                      />
                      <input
                        placeholder="Email"
                        value={draft.contact_email || ""}
                        onChange={(e) => handleDraftChange(app.id, "contact_email", e.target.value)}
                      />
                      <input
                        placeholder="Телефон"
                        value={draft.contact_phone || ""}
                        onChange={(e) => handleDraftChange(app.id, "contact_phone", e.target.value)}
                      />
                    </div>
                  )}
                  <button className="primary" onClick={() => handleSave(app.id)}>
                    Сохранить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <h3>Соискатели сервиса</h3>
        <p className="muted">Фильтруйте кандидатов по навыкам и смотрите профили.</p>
        <div className="talent-layout">
          <div className="talent-filters">
            <div className="filter-group">
              <span>Навыки</span>
              <div className="source-options">
                {skills.map((skill) => (
                  <label key={skill.id} className="source-chip">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                    />
                    {skill.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="filter-group">
              <span>Город</span>
              <select
                value={talentCity}
                onChange={(e) => {
                  const nextCity = e.target.value;
                  setTalentCity(nextCity);
                  setTalentRegion(CITY_REGION_MAP[nextCity] || "");
                }}
              >
                <option value="">Любой</option>
                {CITY_OPTIONS.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </label>
            <label className="filter-group">
              <span>Регион</span>
              <input value={talentRegion} readOnly />
            </label>
            <label className="filter-group">
              <span>Ключевые слова</span>
              <input
                placeholder="Например: Python, React"
                value={talentQuery}
                onChange={(e) => setTalentQuery(e.target.value)}
              />
            </label>
            <label className="filter-group">
              <span>Зарплата от</span>
              <input
                inputMode="numeric"
                value={talentSalaryMin}
                onChange={(e) => setTalentSalaryMin(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="filter-group">
              <span>Зарплата до</span>
              <input
                inputMode="numeric"
                value={talentSalaryMax}
                onChange={(e) => setTalentSalaryMax(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="filter-group">
              <span>Опыт от (лет)</span>
              <input
                inputMode="numeric"
                value={talentExpMin}
                onChange={(e) => setTalentExpMin(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="filter-group">
              <span>Опыт до (лет)</span>
              <input
                inputMode="numeric"
                value={talentExpMax}
                onChange={(e) => setTalentExpMax(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          </div>
          <div className="talent-list">
            {talents.length === 0 && (
              <p className="muted">Пока нет подходящих соискателей.</p>
            )}
            <div className="list">
              {talents.map((seeker) => {
                const isOpen = expandedSeekerId === seeker.id;
                return (
                <div className="list-item talent-card" key={seeker.id}>
                  <div>
                    <h4>{seeker.profile?.full_name || seeker.email}</h4>
                    <p className="muted">
                      {seeker.profile?.city || "Город не указан"}
                      {seeker.profile?.region ? ` · ${seeker.profile.region}` : ""}
                    </p>
                    {seeker.profile?.about && (
                      <p className="muted">{seeker.profile.about}</p>
                    )}
                    <div className="vacancy-badges">
                      {(seeker.skills || []).slice(0, 8).map((skill) => (
                        <span key={skill.id} className="badge badge-skill">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                    {isOpen && (
                      <div className="talent-details">
                        {seeker.profile?.keywords && (
                          <div>
                            <div className="muted">Ключевые слова</div>
                            <p>{seeker.profile.keywords}</p>
                          </div>
                        )}
                        {seeker.profile?.about && (
                          <div>
                            <div className="muted">О себе</div>
                            <p>{seeker.profile.about}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="actions">
                    {seeker.profile?.contact_email && (
                      <span className="badge badge-contact">{seeker.profile.contact_email}</span>
                    )}
                    {seeker.profile?.contact_phone && (
                      <span className="badge badge-contact">{seeker.profile.contact_phone}</span>
                    )}
                    <button className="ghost" onClick={() => toggleSeeker(seeker.id)}>
                      {isOpen ? "Скрыть" : "Подробнее"}
                    </button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
