import { createSlice } from "@reduxjs/toolkit";

const initialPrefs = (() => {
  try {
    const raw = window.localStorage.getItem("uiPrefs");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    toasts: [],
    preferences: {
      highlightEnabled: initialPrefs.highlightEnabled ?? true,
      tooltipEnabled: initialPrefs.tooltipEnabled ?? true,
    },
  },
  reducers: {
    addToast(state, action) {
      state.toasts.push({
        id: action.payload.id,
        type: action.payload.type || "info",
        message: action.payload.message,
      });
    },
    removeToast(state, action) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    setHighlightEnabled(state, action) {
      state.preferences.highlightEnabled = action.payload;
      window.localStorage.setItem("uiPrefs", JSON.stringify(state.preferences));
    },
    setTooltipEnabled(state, action) {
      state.preferences.tooltipEnabled = action.payload;
      window.localStorage.setItem("uiPrefs", JSON.stringify(state.preferences));
    },
  },
});

export const { addToast, removeToast, setHighlightEnabled, setTooltipEnabled } = uiSlice.actions;
export default uiSlice.reducer;
