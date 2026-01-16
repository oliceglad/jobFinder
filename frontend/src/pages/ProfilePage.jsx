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
  const { data: profile } = useProfileQuery();
  const { data: skills = [] } = useSkillsQuery();
  const { data: userSkills = [] } = useUserSkillsQuery();

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
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        city: profile.city || "",
        region: profile.region || "",
        work_format: profile.work_format || "",
        employment_level: profile.employment_level || "",
        desired_salary: profile.desired_salary || "",
        experience_years: profile.experience_years || "",
        keywords: profile.keywords || "",
        about: profile.about || "",
        contact_email: profile.contact_email || "",
        contact_phone: profile.contact_phone || "",
      });
    }
  }, [profile]);

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
    updateProfile({
      ...form,
      desired_salary: form.desired_salary ? Number(form.desired_salary) : null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
    }).unwrap().then(() => notify("Профиль сохранен", "success"));
  };

  return (
    <div className="grid-two">
      <div className="card">
        <h3>Профиль</h3>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            ФИО
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </label>
          <label>
            Город
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label>
            Регион
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </label>
          <label>
            Формат работы
            <input value={form.work_format} onChange={(e) => setForm({ ...form, work_format: e.target.value })} />
          </label>
          <label>
            Уровень занятости
            <input value={form.employment_level} onChange={(e) => setForm({ ...form, employment_level: e.target.value })} />
          </label>
          <label>
            Желаемая зарплата
            <input type="number" value={form.desired_salary} onChange={(e) => setForm({ ...form, desired_salary: e.target.value })} />
          </label>
          <label>
            Опыт (лет)
            <input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
          </label>
          <label>
            Ключевые слова
            <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
          </label>
          <label>
            О себе
            <textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
          </label>
          <label>
            Контактный email
            <input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </label>
          <label>
            Контактный телефон
            <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </label>
          <button className="primary" type="submit">Сохранить</button>
        </form>
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
      </div>
      <div className="card">
        <h3>Аватар и навыки</h3>
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
      </div>
    </div>
  );
}
