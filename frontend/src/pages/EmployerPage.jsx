import { useState } from "react";
import { useCreateVacancyMutation } from "../app/api.js";
import useToast from "../components/useToast.js";

export default function EmployerPage() {
  const [createVacancy] = useCreateVacancyMutation();
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

  const handleSubmit = (event) => {
    event.preventDefault();
    createVacancy({
      ...form,
      salary_from: form.salary_from ? Number(form.salary_from) : null,
      salary_to: form.salary_to ? Number(form.salary_to) : null,
      source: "manual",
    }).unwrap().then(() => notify("Вакансия опубликована", "success"));
  };

  return (
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
  );
}
