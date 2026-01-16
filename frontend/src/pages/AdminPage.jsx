import { useState } from "react";
import {
  useParseHHMutation,
  useSeedSkillsMutation,
  useSeedDemoMutation,
} from "../app/api.js";
import useToast from "../components/useToast.js";

export default function AdminPage() {
  const [seedSkills] = useSeedSkillsMutation();
  const [seedDemo] = useSeedDemoMutation();
  const [parseHH] = useParseHHMutation();
  const { notify } = useToast();

  const [hhText, setHhText] = useState("python");
  const [hhArea, setHhArea] = useState("1");
  const [pages, setPages] = useState(1);
  return (
    <div className="stack">
      <div className="card">
        <h3>Навыки</h3>
        <button
          className="primary"
          onClick={() => seedSkills().unwrap().then(() => notify("Навыки загружены", "success"))}
        >
          Загрузить пул навыков
        </button>
        <button
          className="ghost"
          onClick={() => seedDemo().unwrap().then(() => notify("Демо-данные добавлены", "success"))}
        >
          Добавить демо вакансии и работодателя
        </button>
      </div>
      <div className="card">
        <h3>Парсинг HeadHunter</h3>
        <div className="form-grid">
          <input value={hhText} onChange={(e) => setHhText(e.target.value)} placeholder="Поисковый текст" />
          <input value={hhArea} onChange={(e) => setHhArea(e.target.value)} placeholder="Area id" />
          <input type="number" value={pages} onChange={(e) => setPages(Number(e.target.value))} />
          <button
            className="primary"
            onClick={() =>
              parseHH({ text: hhText, area: hhArea, pages })
                .unwrap()
                .then(() => notify("Парсинг запущен", "success"))
            }
          >
            Запустить
          </button>
        </div>
      </div>
    </div>
  );
}
