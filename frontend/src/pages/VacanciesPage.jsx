import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useAddFavoriteMutation,
  useCreateApplicationMutation,
  useFavoritesQuery,
  useUserSkillsQuery,
  useLazyVacanciesQuery,
  useLazySearchVacanciesQuery,
  useRemoveFavoriteMutation,
  useParseHHMutation,
} from "../app/api.js";
import useToast from "../components/useToast.js";

export default function VacanciesPage() {
  const PAGE_SIZE = 20;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    text: searchParams.get("text") || "",
    city: searchParams.get("city") || "",
    is_remote: searchParams.get("is_remote") || "",
    salary_from: searchParams.get("salary_from") || "",
    salary_to: searchParams.get("salary_to") || "",
    source: searchParams.get("source") || "",
  });
  const [submitted, setSubmitted] = useState(() => {
    const params = Object.fromEntries(searchParams.entries());
    return Object.keys(params).length ? params : null;
  });

  const user = useSelector((state) => state.auth.user);
  const { data: favorites = [] } = useFavoritesQuery();
  const { data: userSkills = [] } = useUserSkillsQuery();
  const [fetchVacancies, vacanciesResult] = useLazyVacanciesQuery();
  const [fetchSearchVacancies, searchResult] = useLazySearchVacanciesQuery();
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();
  const [createApplication] = useCreateApplicationMutation();
  const [parseHH] = useParseHHMutation();
  const { notify } = useToast();

  const favoriteIds = new Set(favorites.map((fav) => fav.vacancy_id));
  const [onlyMatched, setOnlyMatched] = useState(searchParams.get("onlyMatched") === "1");
  const [onlyFavorites, setOnlyFavorites] = useState(searchParams.get("onlyFavorites") === "1");
  const [hhText, setHhText] = useState(searchParams.get("hh_text") || filters.text || "python");
  const [hhArea, setHhArea] = useState(searchParams.get("hh_area") || "");
  const allowedSearchKeys = useMemo(
    () => new Set(["text", "city", "is_remote", "salary_from", "salary_to", "source"]),
    []
  );
  const searchPayload = useMemo(() => {
    if (!submitted) return null;
    const entries = Object.entries(submitted).filter(
      ([key, value]) => allowedSearchKeys.has(key) && value !== ""
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
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== "")
    );
    if (onlyMatched) params.onlyMatched = "1";
    if (onlyFavorites) params.onlyFavorites = "1";
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

  const handleParseHH = async () => {
    if (!hhText.trim()) {
      notify("Введите текст для поиска", "warn");
      return;
    }
    await parseHH({ text: hhText.trim(), area: hhArea || undefined, pages: 1 }).unwrap();
    notify("Вакансии с HH добавлены", "success");
    setVacancies([]);
    setOffset(0);
    setHasMore(true);
    loadPage(0);
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
            <input
              placeholder="Например: backend, react"
              value={filters.text}
              onChange={(e) => setFilters({ ...filters, text: e.target.value })}
            />
          </label>
          <label className="filter-group">
            <span>Город</span>
            <input
              placeholder="Например: Москва"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            />
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
            <span>Зарплата от</span>
            <input
              type="number"
              placeholder="от 2000"
              value={filters.salary_from}
              onChange={(e) => setFilters({ ...filters, salary_from: e.target.value })}
            />
          </label>
          <label className="filter-group">
            <span>Зарплата до</span>
            <input
              type="number"
              placeholder="до 5000"
              value={filters.salary_to}
              onChange={(e) => setFilters({ ...filters, salary_to: e.target.value })}
            />
          </label>
          <label className="filter-group">
            <span>Источник</span>
            <input
              placeholder="hh / manual"
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            />
          </label>
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
        {user?.role === "seeker" && (
          <div className="card hh-card desktop-only">
            <h4>Подтянуть вакансии с HH.ru</h4>
            <div className="filter-grid">
              <label className="filter-group">
                <span>Запрос</span>
                <input value={hhText} onChange={(e) => setHhText(e.target.value)} />
              </label>
              <label className="filter-group">
                <span>Город (area id)</span>
                <input value={hhArea} onChange={(e) => setHhArea(e.target.value)} />
              </label>
              <div className="filter-group">
                <span>Действие</span>
                <button className="primary" type="button" onClick={handleParseHH}>
                  Подтянуть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Результаты</h3>
        <div className="list">
          {filteredVacancies.map((vacancy) => {
            const meta = vacancyMatchMap.get(vacancy.id);
            return (
            <div className="list-item" key={vacancy.id}>
              <div>
                <h4>
                  <Link
                    to={`/vacancies/${vacancy.id}`}
                    dangerouslySetInnerHTML={{ __html: highlight(vacancy, vacancy.title) }}
                  />
                </h4>
                <p className="muted">{vacancy.company || "Компания"} · {vacancy.city || ""}</p>
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
              <input
                value={filters.text}
                onChange={(e) => setFilters({ ...filters, text: e.target.value })}
              />
            </label>
            <label className="filter-group">
              <span>Город</span>
              <input
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              />
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
              <span>Зарплата от</span>
              <input
                type="number"
                value={filters.salary_from}
                onChange={(e) => setFilters({ ...filters, salary_from: e.target.value })}
              />
            </label>
            <label className="filter-group">
              <span>Зарплата до</span>
              <input
                type="number"
                value={filters.salary_to}
                onChange={(e) => setFilters({ ...filters, salary_to: e.target.value })}
              />
            </label>
            <label className="filter-group">
              <span>Источник</span>
              <input
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              />
            </label>
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
            {user?.role === "seeker" && (
              <>
                <label className="filter-group">
                  <span>HH.ru запрос</span>
                  <input value={hhText} onChange={(e) => setHhText(e.target.value)} />
                </label>
                <label className="filter-group">
                  <span>HH.ru area id</span>
                  <input value={hhArea} onChange={(e) => setHhArea(e.target.value)} />
                </label>
                <button className="ghost" type="button" onClick={handleParseHH}>
                  Подтянуть с HH
                </button>
              </>
            )}
            <button className="primary" type="submit">Применить</button>
          </form>
        </div>
      </div>
      )}
    </>
  );
}
