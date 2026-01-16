import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLoginMutation, useRegisterMutation, useMeQuery } from "../app/api.js";
import { setToken, setUser } from "../app/authSlice.js";
import { useNavigate } from "react-router-dom";
import useToast from "../components/useToast.js";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("seeker");
  const [error, setError] = useState("");
  const { notify } = useToast();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [register, { isLoading: registerLoading }] = useRegisterMutation();
  const { data: me } = useMeQuery(undefined, { skip: !token });

  useEffect(() => {
    if (me) {
      dispatch(setUser(me));
      navigate("/dashboard");
    }
  }, [me, dispatch, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        const data = await login({ email, password }).unwrap();
        dispatch(setToken(data.access_token));
        notify("Вы вошли в систему", "success");
      } else {
        await register({ email, password, role }).unwrap();
        const data = await login({ email, password }).unwrap();
        dispatch(setToken(data.access_token));
        notify("Аккаунт создан", "success");
      }
    } catch (err) {
      setError(err.message || "Ошибка авторизации");
    }
  };

  return (
    <div className="hero">
      <div className="hero-content">
        <div className="brand">JobFinder</div>
        <h1>Умный подбор вакансий с объяснимыми рекомендациями.</h1>
        <p>
          Пройди онбординг, укажи навыки и получай подборки вакансий, которые
          действительно подходят.
        </p>
      </div>
      <div className="hero-panel">
        <div className="card">
          <div className="card-header">
            <h3>{mode === "login" ? "Вход" : "Регистрация"}</h3>
            <p>{mode === "login" ? "С возвращением!" : "Создай аккаунт"}</p>
          </div>
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Пароль
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {mode === "register" && (
              <label>
                Роль
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="seeker">Соискатель</option>
                  <option value="employer">Работодатель</option>
                </select>
              </label>
            )}
            <button className="primary" type="submit" disabled={loginLoading || registerLoading}>
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
            {error && <div className="alert">{error}</div>}
          </form>
          <div className="card-footer">
            <button className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Вход"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
