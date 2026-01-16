import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api.js";
import authReducer from "./authSlice.js";
import uiReducer from "./uiSlice.js";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});
