import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { addToast } from "./uiSlice.js";

const envUrl = import.meta.env.VITE_API_URL;
const API_URL =
  envUrl && envUrl !== "http://localhost" && envUrl !== "http://localhost/"
    ? envUrl
    : "/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    const message =
      result.error?.data?.detail ||
      result.error?.error ||
      "Ошибка запроса";
    api.dispatch(
      addToast({
        id: `${Date.now()}-${Math.random()}`,
        type: "error",
        message,
      })
    );
  }
  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Me",
    "Profile",
    "Skills",
    "UserSkills",
    "Vacancies",
    "Recommendations",
    "Favorites",
    "Applications",
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: ({ email, password }) => {
        const body = new URLSearchParams();
        body.append("username", email);
        body.append("password", password);
        return {
          url: "/auth/login",
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        };
      },
    }),
    register: builder.mutation({
      query: (payload) => ({
        url: "/auth/register",
        method: "POST",
        body: payload,
      }),
    }),
    me: builder.query({
      query: () => "/auth/me",
      providesTags: ["Me"],
    }),
    skills: builder.query({
      query: () => "/skills/",
      providesTags: ["Skills"],
    }),
    seedSkills: builder.mutation({
      query: () => ({ url: "/skills/seed", method: "POST" }),
      invalidatesTags: ["Skills"],
    }),
    seedDemo: builder.mutation({
      query: () => ({ url: "/admin/seed-demo", method: "POST" }),
      invalidatesTags: ["Vacancies", "Favorites", "Recommendations"],
    }),
    userSkills: builder.query({
      query: () => "/skills/user",
      providesTags: ["UserSkills"],
    }),
    addUserSkill: builder.mutation({
      query: (payload) => ({
        url: "/skills/user",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["UserSkills"],
    }),
    removeUserSkill: builder.mutation({
      query: (skillId) => ({
        url: `/skills/user/${skillId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["UserSkills"],
    }),
    profile: builder.query({
      query: () => "/profiles/me",
      providesTags: ["Profile"],
    }),
    updateProfile: builder.mutation({
      query: (payload) => ({
        url: "/profiles/me",
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Profile"],
    }),
    uploadAvatar: builder.mutation({
      query: (file) => {
        const form = new FormData();
        form.append("file", file);
        return {
          url: "/profiles/me/avatar",
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: ["Profile"],
    }),
    vacancies: builder.query({
      query: ({ limit = 20, offset = 0 } = {}) => ({
        url: "/vacancies/",
        params: { limit, offset },
      }),
      providesTags: ["Vacancies"],
    }),
    searchVacancies: builder.query({
      query: (params = {}) => ({
        url: "/vacancies/search",
        params,
      }),
      providesTags: ["Vacancies"],
    }),
    vacancy: builder.query({
      query: (id) => `/vacancies/${id}`,
      providesTags: ["Vacancies"],
    }),
    vacanciesByIds: builder.query({
      query: (ids = []) => ({
        url: "/vacancies/by-ids",
        params: { ids },
      }),
      providesTags: ["Vacancies"],
    }),
    recommendations: builder.query({
      query: () => "/recommendations/",
      providesTags: ["Recommendations"],
    }),
    favorites: builder.query({
      query: () => "/favorites/",
      providesTags: ["Favorites"],
    }),
    addFavorite: builder.mutation({
      query: (vacancyId) => ({
        url: `/favorites/${vacancyId}`,
        method: "POST",
      }),
      invalidatesTags: ["Favorites"],
    }),
    removeFavorite: builder.mutation({
      query: (vacancyId) => ({
        url: `/favorites/${vacancyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Favorites"],
    }),
    applications: builder.query({
      query: () => "/applications/",
      providesTags: ["Applications"],
    }),
    createApplication: builder.mutation({
      query: (payload) => ({
        url: "/applications/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Applications"],
    }),
    updateApplication: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/applications/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["Applications"],
    }),
    deleteApplication: builder.mutation({
      query: (id) => ({
        url: `/applications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Applications"],
    }),
    parseHH: builder.mutation({
      query: (params) => ({
        url: "/vacancies/parse/hh",
        method: "POST",
        params,
      }),
    }),
    createVacancy: builder.mutation({
      query: (payload) => ({
        url: "/vacancies/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Vacancies"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useMeQuery,
  useSkillsQuery,
  useSeedSkillsMutation,
  useSeedDemoMutation,
  useUserSkillsQuery,
  useAddUserSkillMutation,
  useRemoveUserSkillMutation,
  useProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useVacanciesQuery,
  useSearchVacanciesQuery,
  useLazyVacanciesQuery,
  useLazySearchVacanciesQuery,
  useVacancyQuery,
  useVacanciesByIdsQuery,
  useRecommendationsQuery,
  useFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useApplicationsQuery,
  useCreateApplicationMutation,
  useUpdateApplicationMutation,
  useDeleteApplicationMutation,
  useParseHHMutation,
  useCreateVacancyMutation,
} = api;
