import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useAddFavoriteMutation,
  useCreateApplicationMutation,
  useFavoritesQuery,
  useUserSkillsQuery,
  useLazyVacanciesQuery,
  useLazySearchVacanciesQuery,
  useRemoveFavoriteMutation,
} from "../app/api.js";
import useToast from "../components/useToast.js";

export default function VacanciesPage() {
  const PAGE_SIZE = 20;
  const SALARY_MIN = 0;
  const SALARY_MAX = 300000;
  const SALARY_STEP = 5000;
  const CITY_OPTIONS = [
    "Москва",
    "Санкт-Петербург",
    "Новосибирск",
    "Екатеринбург",
    "Казань",
    "Нижний Новгород",
    "Челябинск",
    "Самара",
    "Омск",
    "Ростов-на-Дону",
    "Уфа",
    "Красноярск",
    "Пермь",
    "Воронеж",
    "Волгоград",
    "Краснодар",
    "Саратов",
    "Тюмень",
    "Тольятти",
    "Ижевск",
    "Барнаул",
    "Ульяновск",
    "Иркутск",
    "Хабаровск",
    "Ярославль",
    "Владивосток",
    "Махачкала",
    "Томск",
    "Оренбург",
    "Кемерово",
  ];
  const SOURCE_OPTIONS = [
    { value: "hh", label: "HH.ru" },
    { value: "manual", label: "Ручные" },
  ];

  const formatSalary = (vacancy) => {
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

  const normalizeTokens = (value) =>
    value
      .split(/[\\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialText = searchParams.get("text") || "";
  const initialSalaryFrom = Number(searchParams.get("salary_from") || SALARY_MIN) || SALARY_MIN;
  const initialSalaryTo = Number(searchParams.get("salary_to") || SALARY_MAX) || SALARY_MAX;
  const [filters, setFilters] = useState({
    text: initialText,
    city: searchParams.get("city") || "",
    is_remote: searchParams.get("is_remote") || "",
    salary_from: initialSalaryFrom,
    salary_to: initialSalaryTo,
    source: searchParams.get("source") || "",
  });
  const [submitted, setSubmitted] = useState(() => {
    const params = Object.fromEntries(searchParams.entries());
    return Object.keys(params).length ? params : null;
  });

  const { data: favorites = [] } = useFavoritesQuery();
  const { data: userSkills = [] } = useUserSkillsQuery();
  const [fetchVacancies, vacanciesResult] = useLazyVacanciesQuery();
  const [fetchSearchVacancies, searchResult] = useLazySearchVacanciesQuery();
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();
  const [createApplication] = useCreateApplicationMutation();
  const { notify } = useToast();

  const favoriteIds = new Set(favorites.map((fav) => fav.vacancy_id));
  const [onlyMatched, setOnlyMatched] = useState(searchParams.get("onlyMatched") === "1");
  const [onlyFavorites, setOnlyFavorites] = useState(searchParams.get("onlyFavorites") === "1");
  const [keywordTokens, setKeywordTokens] = useState(() => normalizeTokens(initialText));
  const [keywordInput, setKeywordInput] = useState("");
  const [sourceFilters, setSourceFilters] = useState(() => {
    const source = searchParams.get("source");
    return source ? [source] : [];
  });
  const allowedSearchKeys = useMemo(
    () => new Set(["text", "city", "is_remote", "salary_from", "salary_to", "source"]),
    []
  );
  const searchPayload = useMemo(() => {
    if (!submitted) return null;
    const entries = Object.entries(submitted).filter(
      ([key, value]) =>
        allowedSearchKeys.has(key) && value !== "" && value !== null && value !== undefined
    );
    if (entries.length === 0) return null;
    return Object.fromEntries(entries);
  }, [allowedSearchKeys, submitted]);
  const hasSearch = Boolean(searchPayload);

  const [vacancies, setVacancies] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isFetching = hasSearch ? searchResult.isFetching : vacanciesResult.isFetching;

  const skillNames = useMemo(
    () => userSkills.map((item) => item.skill?.name).filter(Boolean),
    [userSkills]
  );

  const loadPage = useCallback(
    async (nextOffset) => {
      const params = { limit: PAGE_SIZE, offset: nextOffset };
      try {
        const result = hasSearch
          ? await fetchSearchVacancies({ ...searchPayload, ...params }).unwrap()
          : await fetchVacancies(params).unwrap();
        setVacancies((prev) => (nextOffset === 0 ? result : [...prev, ...result]));
        setHasMore(result.length === PAGE_SIZE);
        setOffset(nextOffset);
      } catch (error) {
        // errors already handled by baseQuery toast
      }
    },
    [PAGE_SIZE, fetchSearchVacancies, fetchVacancies, hasSearch, searchPayload]
  );

  useEffect(() => {
    setVacancies([]);
    setOffset(0);
    setHasMore(true);
    loadPage(0);
  }, [loadPage]);

  const vacancyMatchMap = useMemo(() => {
    const map = new Map();
    if (skillNames.length === 0) return map;
    const skillSet = skillNames.map((skill) => skill.toLowerCase());

    for (const vacancy of vacancies) {
      const text = [
        vacancy.title,
        vacancy.description,
        vacancy.requirements,
        vacancy.responsibilities,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matched = skillSet.filter((skill) => text.includes(skill));
      const percent = Math.round((matched.length / skillSet.length) * 100);
      map.set(vacancy.id, { matched, percent, text });
    }
    return map;
  }, [vacancies, skillNames]);

  const filteredVacancies = vacancies.filter((vacancy) => {
    if (onlyFavorites && !favoriteIds.has(vacancy.id)) return false;
    if (onlyMatched && !(vacancyMatchMap.get(vacancy.id)?.matched?.length > 0)) return false;
    return true;
  });

  const highlight = (vacancy, title) => {
    const entry = vacancyMatchMap.get(vacancy.id);
    if (!entry || entry.matched.length === 0) return title;
    const pattern = entry.matched
      .map((skill) => skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(`(${pattern})`, "gi");
    return title.replace(regex, "<mark>$1</mark>");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextTokens = [...keywordTokens, ...normalizeTokens(keywordInput)];
    const uniqueTokens = Array.from(new Set(nextTokens));
    const textValue = uniqueTokens.join(" ");
    if (keywordInput.trim()) {
      setKeywordTokens(uniqueTokens);
      setKeywordInput("");
    }

    const params = {};
    if (textValue) params.text = textValue;
    if (filters.city) params.city = filters.city;
    if (filters.is_remote) params.is_remote = filters.is_remote;
    if (filters.salary_from > SALARY_MIN) params.salary_from = filters.salary_from;
    if (filters.salary_to < SALARY_MAX) params.salary_to = filters.salary_to;
    if (filters.source) params.source = filters.source;
    if (onlyMatched) params.onlyMatched = "1";
    if (onlyFavorites) params.onlyFavorites = "1";
    setFilters((prev) => ({ ...prev, text: textValue }));
    setSearchParams(params);
    setVacancies([]);
    setOffset(0);
    setHasMore(true);
    setSubmitted(params);
  };

  const handleFavorite = async (vacancyId) => {
    if (favoriteIds.has(vacancyId)) {
      await removeFavorite(vacancyId).unwrap();
      notify("Удалено из избранного", "success");
    } else {
      await addFavorite(vacancyId).unwrap();
      notify("Добавлено в избранное", "success");
    }
  };

  const handleApply = async (vacancyId) => {
    await createApplication({ vacancy_id: vacancyId, status: "applied", notes: "Applied via portal" }).unwrap();
    notify("Отклик отправлен", "success");
  };

  const commitKeywordInput = useCallback(() => {
    const tokens = normalizeTokens(keywordInput);
    if (tokens.length === 0) return;
    setKeywordTokens((prev) => {
      const next = new Set(prev);
      tokens.forEach((token) => next.add(token));
      return Array.from(next);
    });
    setKeywordInput("");
  }, [keywordInput]);

  useEffect(() => {
    if (!keywordTokens.length) {
      setFilters((prev) => ({ ...prev, text: "" }));
      return;
    }
    setFilters((prev) => ({ ...prev, text: keywordTokens.join(" ") }));
  }, [keywordTokens]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      source: sourceFilters.length === 1 ? sourceFilters[0] : "",
    }));
  }, [sourceFilters]);

  const handleKeywordKeyDown = (event) => {
    if (event.key === " " || event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitKeywordInput();
      return;
    }
    if (event.key === "Backspace" && !keywordInput) {
      setKeywordTokens((prev) => prev.slice(0, -1));
    }
  };

  const handleSalaryFromChange = (value) => {
    const next = Number(value);
    setFilters((prev) => ({
      ...prev,
      salary_from: next,
      salary_to: Math.max(prev.salary_to, next),
    }));
  };

  const handleSalaryToChange = (value) => {
    const next = Number(value);
    setFilters((prev) => ({
      ...prev,
      salary_from: Math.min(prev.salary_from, next),
      salary_to: next,
    }));
  };

  const toggleSource = (value) => {
    setSourceFilters((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  return (
    <>
      <div className="stack">
      <div className="card filter-card">
        <div className="filter-header">
          <div>
            <h3>Фильтры вакансий</h3>
            <p className="muted">Быстро уточните требования и формат работы</p>
          </div>
          <button className="ghost mobile-only" onClick={() => setFiltersOpen(true)}>
            Открыть фильтры
          </button>
        </div>
        <form className="filter-grid desktop-only" onSubmit={handleSubmit}>
          <label className="filter-group">
            <span>Ключевые слова</span>
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
                placeholder="Например: backend react"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                onBlur={commitKeywordInput}
              />
            </div>
          </label>
          <label className="filter-group">
            <span>Город</span>
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            >
              <option value="">Любой город</option>
              {CITY_OPTIONS.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          <label className="filter-group">
            <span>Удаленная работа</span>
            <select
              value={filters.is_remote}
              onChange={(e) => setFilters({ ...filters, is_remote: e.target.value })}
            >
              <option value="">Любой формат</option>
              <option value="true">Удаленно</option>
              <option value="false">Офис/гибрид</option>
            </select>
          </label>
          <label className="filter-group">
            <span>Зарплата</span>
            <div className="range-field">
              <div className="range-values">
                <span>от {filters.salary_from.toLocaleString("ru-RU")}</span>
                <span>до {filters.salary_to.toLocaleString("ru-RU")}</span>
              </div>
              <div className="range-sliders">
                <input
                  type="range"
                  min={SALARY_MIN}
                  max={SALARY_MAX}
                  step={SALARY_STEP}
                  value={filters.salary_from}
                  onChange={(e) => handleSalaryFromChange(e.target.value)}
                />
                <input
                  type="range"
                  min={SALARY_MIN}
                  max={SALARY_MAX}
                  step={SALARY_STEP}
                  value={filters.salary_to}
                  onChange={(e) => handleSalaryToChange(e.target.value)}
                />
              </div>
            </div>
          </label>
          <div className="filter-group">
            <span>Источник</span>
            <div className="source-options">
              {SOURCE_OPTIONS.map((source) => (
                <label key={source.value} className="source-chip">
                  <input
                    type="checkbox"
                    checked={sourceFilters.includes(source.value)}
                    onChange={() => toggleSource(source.value)}
                  />
                  {source.label}
                </label>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span>Показ</span>
            <button className="primary" type="submit">Найти</button>
          </div>
        </form>
        <div className="desktop-only">
          <label className="toggle">
            <input
              type="checkbox"
              checked={onlyMatched}
              onChange={(e) => setOnlyMatched(e.target.checked)}
            />
            Только вакансии с совпадением навыков
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={onlyFavorites}
              onChange={(e) => setOnlyFavorites(e.target.checked)}
            />
            Только избранные
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Результаты</h3>
        <div className="list">
          {filteredVacancies.map((vacancy) => {
            const meta = vacancyMatchMap.get(vacancy.id);
            const salaryLabel = formatSalary(vacancy);
            return (
            <div className="list-item" key={vacancy.id}>
              <div>
                <h4>
                  <Link
                    to={`/vacancies/${vacancy.id}`}
                    dangerouslySetInnerHTML={{ __html: highlight(vacancy, vacancy.title) }}
                  />
                </h4>
                <p className="muted">{vacancy.company || "Компания"}</p>
                <div className="vacancy-badges">
                  {salaryLabel && (
                    <span className="badge badge-salary">{salaryLabel}</span>
                  )}
                  {vacancy.city && (
                    <span className="badge badge-city">{vacancy.city}</span>
                  )}
                  {vacancy.source && (
                    <span className="badge badge-source">{vacancy.source}</span>
                  )}
                </div>
                <p className="muted">{vacancy.url}</p>
                {meta && (
                  <div className="match-meter">
                    <div className="match-label">Совпадение: {meta.percent}%</div>
                    <div className="match-bar">
                      <div className="match-fill" style={{ width: `${meta.percent}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="actions">
                <button
                  className={favoriteIds.has(vacancy.id) ? "ghost active" : "ghost"}
                  onClick={() => handleFavorite(vacancy.id)}
                >
                  {favoriteIds.has(vacancy.id) ? "★ В избранном" : "☆ В избранное"}
                </button>
                <button className="primary" onClick={() => handleApply(vacancy.id)}>
                  Откликнуться
                </button>
              </div>
            </div>
          )})}
        </div>
        {isFetching && vacancies.length === 0 && (
          <div className="loading">Загружаем вакансии…</div>
        )}
        {hasMore && (
          <div className="load-more">
            <button
              className="ghost"
              type="button"
              disabled={isFetching}
              onClick={() => loadPage(offset + PAGE_SIZE)}
            >
              {isFetching ? "Загрузка…" : "Показать еще"}
            </button>
          </div>
        )}
      </div>
      </div>
      {filtersOpen && (
      <div className="sheet-backdrop" onClick={() => setFiltersOpen(false)}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-header">
            <h3>Фильтры</h3>
            <button className="ghost" onClick={() => setFiltersOpen(false)}>Закрыть</button>
          </div>
          <form className="form" onSubmit={(e) => {
            handleSubmit(e);
            setFiltersOpen(false);
          }}>
            <label className="filter-group">
              <span>Ключевые слова</span>
              <div className="token-input">
                {keywordTokens.map((token) => (
                  <span className="token-chip" key={`mobile-${token}`}>
                    {token}
                    <button type="button" onClick={() => setKeywordTokens((prev) => prev.filter((item) => item !== token))}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  onBlur={commitKeywordInput}
                  placeholder="Например: backend react"
                />
              </div>
            </label>
            <label className="filter-group">
              <span>Город</span>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              >
                <option value="">Любой город</option>
                {CITY_OPTIONS.map((city) => (
                  <option key={`mobile-${city}`} value={city}>{city}</option>
                ))}
              </select>
            </label>
            <label className="filter-group">
              <span>Удаленка</span>
              <select
                value={filters.is_remote}
                onChange={(e) => setFilters({ ...filters, is_remote: e.target.value })}
              >
                <option value="">Любая</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </label>
            <label className="filter-group">
              <span>Зарплата</span>
              <div className="range-field">
                <div className="range-values">
                  <span>от {filters.salary_from.toLocaleString("ru-RU")}</span>
                  <span>до {filters.salary_to.toLocaleString("ru-RU")}</span>
                </div>
                <div className="range-sliders">
                  <input
                    type="range"
                    min={SALARY_MIN}
                    max={SALARY_MAX}
                    step={SALARY_STEP}
                    value={filters.salary_from}
                    onChange={(e) => handleSalaryFromChange(e.target.value)}
                  />
                  <input
                    type="range"
                    min={SALARY_MIN}
                    max={SALARY_MAX}
                    step={SALARY_STEP}
                    value={filters.salary_to}
                    onChange={(e) => handleSalaryToChange(e.target.value)}
                  />
                </div>
              </div>
            </label>
            <div className="filter-group">
              <span>Источник</span>
              <div className="source-options">
                {SOURCE_OPTIONS.map((source) => (
                  <label key={`mobile-${source.value}`} className="source-chip">
                    <input
                      type="checkbox"
                      checked={sourceFilters.includes(source.value)}
                      onChange={() => toggleSource(source.value)}
                    />
                    {source.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={onlyMatched}
                onChange={(e) => setOnlyMatched(e.target.checked)}
              />
              Только совпавшие навыки
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(e) => setOnlyFavorites(e.target.checked)}
              />
              Только избранные
            </label>
            <button className="primary" type="submit">Применить</button>
          </form>
        </div>
      </div>
      )}
    </>
  );
}
