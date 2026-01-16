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

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [skills, search]);

  const handleSaveProfile = async () => {
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
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </label>
                <label>
                  Формат работы
                  <input value={form.work_format} onChange={(e) => setForm({ ...form, work_format: e.target.value })} />
                </label>
                <button className="primary" onClick={handleSaveProfile}>Далее</button>
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
              <div className="skills">
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
              <button className="primary" onClick={handleSaveSkills}>Далее</button>
            </div>
          )}
          {step === 3 && (
            <div className="wizard-step">
              <h3>Предпочтения</h3>
              <div className="form">
                <label>
                  Уровень занятости
                  <input value={form.employment_level} onChange={(e) => setForm({ ...form, employment_level: e.target.value })} />
                </label>
                <label>
                  Желаемая зарплата
                  <input type="number" value={form.desired_salary} onChange={(e) => setForm({ ...form, desired_salary: e.target.value })} />
                </label>
                <label>
                  Ключевые слова
                  <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
                </label>
                <button className="primary" onClick={() => setStep(4)}>Далее</button>
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
