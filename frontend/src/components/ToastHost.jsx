import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { removeToast } from "../app/uiSlice.js";

export default function ToastHost() {
  const toasts = useSelector((state) => state.ui.toasts);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => dispatch(removeToast(toast.id)), 3500)
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [toasts, dispatch]);

  const iconFor = (type) => {
    if (type === "success") return "✅";
    if (type === "warn") return "⚠️";
    if (type === "error") return "⛔";
    return "ℹ️";
  };

  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span>{iconFor(toast.type)}</span>
          <span>{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => dispatch(removeToast(toast.id))}
            aria-label="Закрыть уведомление"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
