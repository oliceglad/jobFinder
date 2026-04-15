import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useMeQuery, useProfileQuery, useSkillsQuery, useUserSkillsQuery, useAddUserSkillMutation, useUpdateProfileMutation, useUploadAvatarMutation } from "./app/api.js";
import { setUser } from "./app/authSlice.js";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import VacanciesPage from "./pages/VacanciesPage.jsx";
import VacancyDetailPage from "./pages/VacancyDetailPage.jsx";
import RecommendationsPage from "./pages/RecommendationsPage.jsx";
import RecommendationDetailPage from "./pages/RecommendationDetailPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import EmployerPage from "./pages/EmployerPage.jsx";
import PipelinePage from "./pages/PipelinePage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import AppShell from "./components/AppShell.jsx";
import OnboardingWizard from "./components/OnboardingWizard.jsx";
import ToastHost from "./components/ToastHost.jsx";
import "./App.css";

export default function App() {
  const location = useLocation();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  const { data: me } = useMeQuery(undefined, { skip: !token });
  useEffect(() => {
    if (me) dispatch(setUser(me));
  }, [me, dispatch]);

  const { data: skills = [] } = useSkillsQuery(undefined, { skip: !token });
  const { data: userSkills = [] } = useUserSkillsQuery(undefined, { skip: !token });
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useProfileQuery(
    undefined,
    { skip: !token || user?.role !== "seeker" }
  );

  const [addUserSkill] = useAddUserSkillMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const [uploadAvatar] = useUploadAvatarMutation();
  const onboardingDismissed = user
    ? window.localStorage.getItem(`onboarding-closed-${user.id}`) === "true"
    : false;

  const onboardingNeeded = useMemo(() => {
    if (!user || user.role !== "seeker") return false;
    if (profileLoading || profileFetching) return false;
    if (!profile) return true;
    const requiredProfileFields = [
      "full_name",
      "city",
      "work_format",
    ];
    const hasRequiredProfile = requiredProfileFields.every((field) => {
      const value = profile[field];
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
    return !hasRequiredProfile;
  }, [
    user,
    profileLoading,
    profileFetching,
    profile,
  ]);

  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (onboardingNeeded && !onboardingDismissed) {
      setOnboardingOpen(true);
    }
  }, [onboardingNeeded, onboardingDismissed]);

  return (
    <div className="app">
      <Routes>
        <Route path="/auth" element={token ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell routeKey={location.pathname}>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/vacancies" element={<VacanciesPage />} />
                  <Route path="/vacancies/:id" element={<VacancyDetailPage />} />
                  <Route path="/recommendations" element={<RecommendationsPage />} />
                  <Route path="/recommendations/:id" element={<RecommendationDetailPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route
                    path="/admin"
                    element={
                      <RoleRoute roles={["admin"]}>
                        <AdminPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/employer"
                    element={
                      <RoleRoute roles={["employer"]}>
                        <EmployerPage />
                      </RoleRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>

      {token && onboardingOpen && user && (
        <OnboardingWizard
          user={user}
          skills={skills}
          userSkills={userSkills}
          profile={profile}
          onClose={() => {
            window.localStorage.setItem(`onboarding-closed-${user.id}`, "true");
            setOnboardingOpen(false);
          }}
          onSaveProfile={updateProfile}
          onAddSkill={(skillId) => addUserSkill({ skill_id: skillId, level: null })}
          onAvatarUpload={(file) => file && uploadAvatar(file)}
        />
      )}
      <ToastHost />
    </div>
  );
}
