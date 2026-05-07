import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OnboardingGate } from '@/components/OnboardingGate';
import { CookieBanner } from '@/components/CookieBanner';
import { useAuth } from '@/store/auth';
import { useRealtime } from '@/hooks/useRealtime';
import { isConfigured } from '@/lib/supabase';
import ConfigError from '@/pages/ConfigError';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Docs from '@/pages/Docs';
import Onboarding from '@/pages/Onboarding';
import OrgSettings from '@/pages/OrgSettings';
import Dashboard from '@/pages/Dashboard';
import Tasks from '@/pages/Tasks';
import Focus from '@/pages/Focus';
import Habits from '@/pages/Habits';
import Reflection from '@/pages/Reflection';
import Achievements from '@/pages/Achievements';
import Shop from '@/pages/Shop';
import Profile from '@/pages/Profile';
import Squads from '@/pages/Squads';
import BuddyPage from '@/pages/Buddy';
import Chat from '@/pages/Chat';
import ManageSquads from '@/pages/admin/ManageSquads';
import Leaderboard from '@/pages/Leaderboard';
import Streak from '@/pages/Streak';
import Emergency from '@/pages/Emergency';
import Settings from '@/pages/Settings';
import AICoach from '@/pages/AICoach';
import AdminDashboard from '@/pages/AdminDashboard';
import ManageTasks from '@/pages/admin/ManageTasks';
import AITaskGen from '@/pages/admin/AITaskGen';
import Submissions from '@/pages/admin/Submissions';
import EmergencyQueue from '@/pages/admin/EmergencyQueue';
import AdminUsers from '@/pages/admin/Users';
import NotFound from '@/pages/NotFound';

export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    if (isConfigured) init();
  }, [init]);

  useRealtime();

  // If env vars are missing, show a clear setup page instead of a blank screen.
  if (!isConfigured) {
    return <ConfigError />;
  }

  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/docs" element={<Docs />} />

      {/* Onboarding lives outside the org gate but still requires auth */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <Layout />
            </OnboardingGate>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/reflection" element={<Reflection />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/streak" element={<Streak />} />
        <Route path="/coach" element={<AICoach />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/squads" element={<Squads />} />
        <Route path="/buddy" element={<BuddyPage />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/u/:userId" element={<Profile />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/org" element={<OrgSettings />} />

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/tasks" element={<ManageTasks />} />
        <Route path="/admin/ai-tasks" element={<AITaskGen />} />
        <Route path="/admin/submissions" element={<Submissions />} />
        <Route path="/admin/emergency" element={<EmergencyQueue />} />
        <Route path="/admin/squads" element={<ManageSquads />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    <CookieBanner />
    </>
  );
}
