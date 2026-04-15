import { useMemo, useState } from "react";
import useToast from "./useToast.js";

export default function OnboardingWizard({
  user,
  skills,
  userSkills,
  profile,
  onClose,
  onSaveProfile,
  onAddSkill,
  onAvatarUpload,
}) {
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
  const { notify } = useToast();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState(
    new Set(userSkills.map((item) => item.skill?.id))
  );
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    city: profile?.city || "",
    work_format: profile?.work_format || "",
    employment_level: profile?.employment_level || "",
    desired_salary: profile?.desired_salary || "",
    keywords: profile?.keywords || "",
  });
  const isStepOneValid = Boolean(
    form.full_name.trim() && form.city.trim() && form.work_format.trim()
  );
  const isStepTwoValid = selectedSkills.size > 0;
  const isStepThreeValid = Boolean(
    form.employment_level.trim() &&
      String(form.desired_salary).trim() &&
      Number(form.desired_salary) > 0 &&
      form.keywords.trim()
  );

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [skills, search]);

  const handleSaveProfile = async () => {
    if (!isStepOneValid) return;
    await onSaveProfile({
      full_name: form.full_name,
      city: form.city,
      work_format: form.work_format,
      employment_level: form.employment_level,
      desired_salary: form.desired_salary ? Number(form.desired_salary) : null,
      keywords: form.keywords,
    });
    notify("Профиль сохранен", "success");
    setStep(2);
  };

  const handleSaveSkills = async () => {
    if (!isStepTwoValid) return;
    for (const skillId of selectedSkills) {
      if (!userSkills.find((item) => item.skill?.id === skillId)) {
        await onAddSkill(skillId);
      }
    }
    notify("Навыки обновлены", "success");
    setStep(3);
  };

  const handleFinish = async () => {
    await onSaveProfile({
      work_format: form.work_format,
      employment_level: form.employment_level,
      desired_salary: form.desired_salary ? Number(form.desired_salary) : null,
      keywords: form.keywords,
    });
    notify("Онбординг завершен", "success");
    onClose();
  };

  return (
    <div className="onboarding">
      <div className="wizard">
        <div className="wizard-header">
          <h2>Привет, {user.email}</h2>
          <p>Заполним профиль за несколько шагов.</p>
          <button className="wizard-close" type="button" onClick={onClose}>
            Закрыть
          </button>
          <div className="steps">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className={item <= step ? "step active" : "step"}>{item}</div>
            ))}
          </div>
        </div>
        <div className="wizard-body">
          {step === 1 && (
            <div className="wizard-step">
              <h3>Основная информация</h3>
              <p className="muted">Роль: {user.role}.</p>
              <div className="form">
                <label>
                  ФИО
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </label>
                <label>
                  Город
                  <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                    <option value="">Выберите город</option>
                    {CITY_OPTIONS.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
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
                <button className="primary" onClick={handleSaveProfile} disabled={!isStepOneValid}>
                  Далее
                </button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="wizard-step">
              <h3>Выберите навыки</h3>
              <input
                className="search"
                placeholder="Поиск навыков"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="skills wizard-skills">
                {filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    className={selectedSkills.has(skill.id) ? "tag active" : "tag"}
                    onClick={() => {
                      const next = new Set(selectedSkills);
                      if (next.has(skill.id)) {
                        next.delete(skill.id);
                      } else {
                        next.add(skill.id);
                      }
                      setSelectedSkills(next);
                    }}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
              <button className="primary" onClick={handleSaveSkills} disabled={!isStepTwoValid}>
                Далее
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="wizard-step">
              <h3>Предпочтения</h3>
              <div className="form">
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
                  <input type="number" value={form.desired_salary} onChange={(e) => setForm({ ...form, desired_salary: e.target.value })} />
                </label>
                <label>
                  Ключевые слова
                  <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
                </label>
                <button
                  className="primary"
                  onClick={() => setStep(4)}
                  disabled={!isStepThreeValid}
                >
                  Далее
                </button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="wizard-step">
              <h3>Аватар</h3>
              <p className="muted">Загрузите фото — необязательно.</p>
              <input type="file" accept="image/*" onChange={(e) => onAvatarUpload(e.target.files?.[0])} />
              <div className="actions">
                <button className="ghost" onClick={onClose}>Пропустить</button>
                <button className="primary" onClick={handleFinish}>Готово</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
