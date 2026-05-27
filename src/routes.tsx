import type { ReactNode } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import RoadmapPage from './pages/RoadmapPage';
import ResumePage from './pages/ResumePage';
import InterviewPage from './pages/InterviewPage';
import PlannerPage from './pages/PlannerPage';
import CodingPage from './pages/CodingPage';
import CodeReviewPage from './pages/CodeReviewPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';

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
  { name: 'My Roadmap', path: '/roadmap', element: <RoadmapPage /> },
  { name: 'Resume Analyzer', path: '/resume', element: <ResumePage /> },
  { name: 'Interview Simulator', path: '/interview', element: <InterviewPage /> },
  { name: 'Study Planner', path: '/planner', element: <PlannerPage /> },
  { name: 'Coding Tracker', path: '/coding', element: <CodingPage /> },
  { name: 'AI Code Reviewer', path: '/code-review', element: <CodeReviewPage /> },
  { name: 'Leaderboard', path: '/leaderboard', element: <LeaderboardPage /> },
  { name: 'Notifications', path: '/notifications', element: <NotificationsPage /> },
  { name: 'Profile', path: '/profile', element: <ProfilePage /> },
];
