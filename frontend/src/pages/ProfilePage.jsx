import { useEffect, useMemo, useState } from "react";
import {
  useAddUserSkillMutation,
  useProfileQuery,
  useRemoveUserSkillMutation,
  useSkillsQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useUserSkillsQuery,
} from "../app/api.js";
import useToast from "../components/useToast.js";
import { useDispatch, useSelector } from "react-redux";
import { setHighlightEnabled, setTooltipEnabled } from "../app/uiSlice.js";

export default function ProfilePage() {
  const user = useSelector((state) => state.auth.user);
  const isSeeker = user?.role === "seeker";
  const isEmployer = user?.role === "employer";
  const { data: profile } = useProfileQuery();
  const { data: skills = [] } = useSkillsQuery(undefined, { skip: !isSeeker });
  const { data: userSkills = [] } = useUserSkillsQuery(undefined, { skip: !isSeeker });

  const [updateProfile] = useUpdateProfileMutation();
  const [uploadAvatar] = useUploadAvatarMutation();
  const [addUserSkill] = useAddUserSkillMutation();
  const [removeUserSkill] = useRemoveUserSkillMutation();
  const { notify } = useToast();
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.ui.preferences);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillPage, setSkillPage] = useState(1);
  const skillsPerPage = 24;
  const SALARY_MIN = 0;
  const SALARY_MAX = 300000;
  const SALARY_STEP = 5000;

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
  const WORK_FORMATS = [
    "Офис",
    "Гибрид",
    "Удаленно",
    "Гибкий график",
  ];
  const EMPLOYMENT_LEVELS = [
    "Полная занятость",
    "Частичная занятость",
    "Проектная работа",
    "Стажировка",
  ];

  const normalizeTokens = (value) =>
    value
      .split(/[\\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean);

  const formatNumber = (value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("ru-RU");
  };

  const formatYears = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    return digits;
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "");
    const trimmed = digits.startsWith("7") ? digits.slice(1) : digits;
    const part1 = trimmed.slice(0, 3);
    const part2 = trimmed.slice(3, 6);
    const part3 = trimmed.slice(6, 8);
    const part4 = trimmed.slice(8, 10);
    let result = "+7";
    if (part1) result += ` (${part1}`;
    if (part1.length === 3) result += ")";
    if (part2) result += ` ${part2}`;
    if (part3) result += `-${part3}`;
    if (part4) result += `-${part4}`;
    return result;
  };

  const [form, setForm] = useState({
    full_name: "",
    city: "",
    region: "",
    work_format: "",
    employment_level: "",
    desired_salary: "",
    experience_years: "",
    keywords: "",
    about: "",
    contact_email: "",
    contact_phone: "",
    company_name: "",
    company_site: "",
    company_description: "",
  });
  const [keywordTokens, setKeywordTokens] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [useAccountEmail, setUseAccountEmail] = useState(false);

  useEffect(() => {
    if (profile) {
      const city = profile.city || "";
      setForm({
        full_name: profile.full_name || "",
        city,
        region: profile.region || CITY_REGION_MAP[city] || "",
        work_format: profile.work_format || "",
        employment_level: profile.employment_level || "",
        desired_salary: profile.desired_salary ? Number(profile.desired_salary).toLocaleString("ru-RU") : "",
        experience_years: profile.experience_years ? String(profile.experience_years) : "",
        keywords: profile.keywords || "",
        about: profile.about || "",
        contact_email: profile.contact_email || "",
        contact_phone: profile.contact_phone ? formatPhone(String(profile.contact_phone)) : "",
        company_name: profile.company_name || "",
        company_site: profile.company_site || "",
        company_description: profile.company_description || "",
      });
      setKeywordTokens(normalizeTokens(profile.keywords || ""));
      if (user?.email && profile.contact_email === user.email) {
        setUseAccountEmail(true);
      }
    }
  }, [profile, user?.email]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, keywords: keywordTokens.join(" ") }));
  }, [keywordTokens]);

  useEffect(() => {
    if (useAccountEmail && user?.email) {
      setForm((prev) => ({ ...prev, contact_email: user.email }));
    }
  }, [useAccountEmail, user?.email]);

  const userSkillIds = new Set(userSkills.map((item) => item.skill?.id));
  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) return skills;
    const needle = skillSearch.toLowerCase();
    return skills.filter((skill) => skill.name.toLowerCase().includes(needle));
  }, [skills, skillSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / skillsPerPage));
  const pageSkills = filteredSkills.slice(
    (skillPage - 1) * skillsPerPage,
    skillPage * skillsPerPage,
  );

  useEffect(() => {
    setSkillPage(1);
  }, [skillSearch, skills.length]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const pendingTokens = normalizeTokens(keywordInput);
    const mergedTokens = pendingTokens.length
      ? Array.from(new Set([...keywordTokens, ...pendingTokens]))
      : keywordTokens;
    const keywordsValue = mergedTokens.join(" ");
    const desiredSalaryDigits = form.desired_salary.replace(/\D/g, "");
    const experienceDigits = form.experience_years.replace(/\D/g, "");
    const phoneDigits = form.contact_phone.replace(/\D/g, "");
    updateProfile({
      ...form,
      keywords: keywordsValue,
      desired_salary: desiredSalaryDigits ? Number(desiredSalaryDigits) : null,
      experience_years: experienceDigits ? Number(experienceDigits) : null,
      contact_phone: phoneDigits ? formatPhone(phoneDigits) : null,
    }).unwrap().then(() => notify("Профиль сохранен", "success"));
    if (pendingTokens.length) {
      setKeywordTokens(mergedTokens);
      setKeywordInput("");
    }
  };

  const commitKeywordInput = () => {
    const tokens = normalizeTokens(keywordInput);
    if (!tokens.length) return;
    setKeywordTokens((prev) => Array.from(new Set([...prev, ...tokens])));
    setKeywordInput("");
  };

  return (
    <div className="stack">
      <div className="card">
        <h3>{isEmployer ? "Профиль компании" : "Профиль"}</h3>
        <form className="form" onSubmit={handleSubmit}>
          {isEmployer ? (
            <>
              <label>
                Компания
                <input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </label>
              <label>
                Сайт
                <input
                  value={form.company_site}
                  onChange={(e) => setForm({ ...form, company_site: e.target.value })}
                  placeholder="https://"
                />
              </label>
              <label>
                О компании
                <textarea
                  value={form.company_description}
                  onChange={(e) => setForm({ ...form, company_description: e.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                ФИО
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </label>
              <label>
                Город
                <select
                  value={form.city}
                  onChange={(e) => {
                    const nextCity = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      city: nextCity,
                      region: CITY_REGION_MAP[nextCity] || "",
                    }));
                  }}
                >
                  <option value="">Выберите город</option>
                  {CITY_OPTIONS.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>
              <label>
                Регион
                <input value={form.region} readOnly />
              </label>
              <label>
                Формат работы
                <select
                  value={form.work_format}
                  onChange={(e) => setForm({ ...form, work_format: e.target.value })}
                >
                  <option value="">Выберите формат</option>
                  {WORK_FORMATS.map((format) => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </label>
              <label>
                Уровень занятости
                <select
                  value={form.employment_level}
                  onChange={(e) => setForm({ ...form, employment_level: e.target.value })}
                >
                  <option value="">Выберите уровень</option>
                  {EMPLOYMENT_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label>
                Желаемая зарплата
                <div className="range-field">
                  <div className="range-values">
                    <span>{form.desired_salary || "0"} ₽</span>
                  </div>
                  <div className="range-sliders">
                    <input
                      type="range"
                      min={SALARY_MIN}
                      max={SALARY_MAX}
                      step={SALARY_STEP}
                      value={Number(form.desired_salary.replace(/\D/g, "")) || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          desired_salary: Number(e.target.value).toLocaleString("ru-RU"),
                        })
                      }
                    />
                    <input
                      placeholder="Введите сумму"
                      value={form.desired_salary}
                      onChange={(e) => setForm({ ...form, desired_salary: formatNumber(e.target.value) })}
                    />
                  </div>
                </div>
              </label>
              <label>
                Опыт (лет)
                <input
                  value={form.experience_years}
                  onChange={(e) => setForm({ ...form, experience_years: formatYears(e.target.value) })}
                  placeholder="Например: 3"
                  inputMode="numeric"
                />
              </label>
              <label>
                Ключевые слова
                <div className="token-input">
                  {keywordTokens.map((token) => (
                    <span className="token-chip" key={token}>
                      {token}
                      <button type="button" onClick={() => setKeywordTokens((prev) => prev.filter((item) => item !== token))}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        commitKeywordInput();
                      }
                      if (e.key === "Backspace" && !keywordInput) {
                        setKeywordTokens((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={commitKeywordInput}
                    placeholder="Например: python react"
                  />
                </div>
              </label>
              <label>
                О себе
                <textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
              </label>
              <label>
                Контактный email
                <div className="email-field">
                  <input
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    disabled={useAccountEmail}
                  />
                  <label className="checkbox inline-checkbox">
                    <input
                      type="checkbox"
                      checked={useAccountEmail}
                      onChange={(e) => setUseAccountEmail(e.target.checked)}
                    />
                    Использовать email аккаунта
                  </label>
                </div>
              </label>
              <label>
                Контактный телефон
                <input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: formatPhone(e.target.value) })}
                  placeholder="+7 (999) 123-45-67"
                  inputMode="numeric"
                />
              </label>
            </>
          )}
          <button className="primary" type="submit">Сохранить</button>
        </form>
        {!isEmployer && (
          <>
            <div className="divider" />
            <h4>Настройки интерфейса</h4>
            <label className="toggle">
              <input
                type="checkbox"
                checked={preferences.highlightEnabled}
                onChange={(e) => dispatch(setHighlightEnabled(e.target.checked))}
              />
              Подсветка навыков в вакансии
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={preferences.tooltipEnabled}
                onChange={(e) => dispatch(setTooltipEnabled(e.target.checked))}
              />
              Подсказки при наведении
            </label>
          </>
        )}
      </div>
      <div className="card">
        <h3>Аватар{isSeeker ? " и навыки" : ""}</h3>
        <div className="avatar-block">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" />
          ) : (
            <div className="avatar-placeholder">Загрузить фото</div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadAvatar(file).unwrap().then(() => notify("Аватар обновлен", "success"));
              }
            }}
          />
        </div>
        {isSeeker && (
          <>
            <div className="skill-toolbar">
              <input
                placeholder="Поиск навыков"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
              <div className="pager">
                <button
                  className="ghost"
                  type="button"
                  disabled={skillPage === 1}
                  onClick={() => setSkillPage((prev) => Math.max(1, prev - 1))}
                >
                  Назад
                </button>
                <span>{skillPage} / {totalPages}</span>
                <button
                  className="ghost"
                  type="button"
                  disabled={skillPage === totalPages}
                  onClick={() => setSkillPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Далее
                </button>
              </div>
            </div>
            <div className="skill-list">
              {pageSkills.map((skill) => (
                <div key={skill.id} className="skill-row">
                  <span className="skill-name">{skill.name}</span>
                  <button
                    className={userSkillIds.has(skill.id) ? "ghost active" : "ghost"}
                    onClick={() =>
                      userSkillIds.has(skill.id)
                        ? removeUserSkill(skill.id).unwrap().then(() => notify("Навык удален", "success"))
                        : addUserSkill({ skill_id: skill.id, level: null }).unwrap().then(() => notify("Навык добавлен", "success"))
                    }
                  >
                    {userSkillIds.has(skill.id) ? "Убрать" : "Добавить"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
