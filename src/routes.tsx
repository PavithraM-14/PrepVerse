import type { ReactNode } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import ResumePage from './pages/ResumePage';
import InterviewPage from './pages/InterviewPage';
import PlannerPage from './pages/PlannerPage';
import CodingPage from './pages/CodingPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Home', path: '/', element: <LandingPage />, public: true },
  { name: 'Login', path: '/login', element: <LoginPage />, public: true },
  { name: 'Dashboard', path: '/dashboard', element: <DashboardPage /> },
  { name: 'Onboarding', path: '/onboarding', element: <OnboardingPage /> },
  { name: 'Resume Analyzer', path: '/resume', element: <ResumePage /> },
  { name: 'Interview Simulator', path: '/interview', element: <InterviewPage /> },
  { name: 'Study Planner', path: '/planner', element: <PlannerPage /> },
  { name: 'Coding Tracker', path: '/coding', element: <CodingPage /> },
  { name: 'Leaderboard', path: '/leaderboard', element: <LeaderboardPage /> },
  { name: 'Profile', path: '/profile', element: <ProfilePage /> },
];
