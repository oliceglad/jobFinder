import { createSlice } from "@reduxjs/toolkit";

const initialToken = window.localStorage.getItem("token") || "";
const initialUser = window.localStorage.getItem("user");

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: initialToken,
    user: initialUser ? JSON.parse(initialUser) : null,
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
      window.localStorage.setItem("token", action.payload || "");
    },
    setUser(state, action) {
      state.user = action.payload;
      if (action.payload) {
        window.localStorage.setItem("user", JSON.stringify(action.payload));
      } else {
        window.localStorage.removeItem("user");
      }
    },
    logout(state) {
      state.token = "";
      state.user = null;
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
    },
  },
});

export const { setToken, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
