/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AchievementsView } from './components/views/AchievementsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AriaTeacherView } from './components/views/AriaTeacherView';
import { AuthOnboardingView } from './components/views/AuthOnboardingView';
import { DashboardView } from './components/views/DashboardView';
import { ExplorerView } from './components/views/ExplorerView';
import { FocusCenterView } from './components/views/FocusCenterView';
import { LessonsView } from './components/views/LessonsView';
import { NotesView } from './components/views/NotesView';
import { NotificationsView } from './components/views/NotificationsView';
import { NumericalLabView } from './components/views/NumericalLabView';
import { ParentDashboardView } from './components/views/ParentDashboardView';
import { PersonalLibraryView } from './components/views/PersonalLibraryView';
import { PreviousClassesView } from './components/views/PreviousClassesView';
import { ProfileSettingsView } from './components/views/ProfileSettingsView';
import { QuizzesView } from './components/views/QuizzesView';
import { StudyPlannerView } from './components/views/StudyPlannerView';
import { YouTubeHubView } from './components/views/YouTubeHubView';
import { INITIAL_NOTIFICATIONS, INITIAL_STUDY_TASKS } from './data/curriculum';
import type {
  ActiveStudyContext,
  FocusSessionRecord,
  NavModuleId,
  NotificationItem,
  StudentProfile,
  StudyTask,
  UserRole,
} from './types/studyverse';
import { resolveDefaultContext } from './utils/curriculumHelpers';

const DEFAULT_PROFILE: StudentProfile = {
  name: 'Ananya Sharma',
  email: 'ananya.sharma@studyverse.edu',
  gradeId: 'class-10',
  streamId: 'general',
  board: 'NCERT / CBSE',
  dailyGoalMinutes: 90,
  guardianName: 'Rajesh Sharma',
  guardianEmail: 'rajesh.sharma@example.com',
};

function hasAutostartParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => hasAutostartParam());
  const [role, setRole] = useState<UserRole>('student');
  const [activeModule, setActiveModule] = useState<NavModuleId>('dashboard');
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [studyContext, setStudyContext] = useState<ActiveStudyContext>(() =>
    resolveDefaultContext(DEFAULT_PROFILE.gradeId, DEFAULT_PROFILE.streamId)
  );
  const [tasks, setTasks] = useState<StudyTask[]>(INITIAL_STUDY_TASKS);
  const [focusSessions, setFocusSessions] = useState<FocusSessionRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleCompleteOnboarding = (nextProfile: StudentProfile, chosenRole: UserRole) => {
    setProfile(nextProfile);
    setStudyContext(resolveDefaultContext(nextProfile.gradeId, nextProfile.streamId));
    setRole(chosenRole);
    setActiveModule(chosenRole === 'parent' ? 'parent-dashboard' : 'dashboard');
    setIsOnboarded(true);
  };

  const handleUpdateProfile = (nextProfile: StudentProfile) => {
    const gradeOrStreamChanged =
      nextProfile.gradeId !== profile.gradeId || nextProfile.streamId !== profile.streamId;
    setProfile(nextProfile);
    if (gradeOrStreamChanged) {
      setStudyContext(resolveDefaultContext(nextProfile.gradeId, nextProfile.streamId));
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    );
  };

  const handleAddTask = (taskInput: Omit<StudyTask, 'id' | 'completed'>) => {
    setTasks((prev) => [
      {
        ...taskInput,
        id: `task-${Date.now()}`,
        completed: false,
      },
      ...prev,
    ]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const handleLogFocusSession = useCallback((label: string, minutes: number) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setFocusSessions((prev) => [
      {
        id: `focus-${Date.now()}`,
        label,
        minutes,
        completedAt: timeLabel,
      },
      ...prev,
    ]);
  }, []);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSelectSubjectFromDashboard = (subjectId: string) => {
    setStudyContext((prev) => ({
      ...prev,
      gradeId: profile.gradeId,
      streamId: profile.streamId,
      subjectId,
    }));
  };

  const handleLaunchTopic = (nextContext: ActiveStudyContext, target: NavModuleId) => {
    setStudyContext(nextContext);
    setActiveModule(target);
  };

  if (!isOnboarded) {
    return (
      <AuthOnboardingView
        initialProfile={profile}
        onCompleteOnboarding={handleCompleteOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6fc] dark:bg-[#110d1e] text-[#1b1430] dark:text-[#f3f0fc] flex">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          if (mod === 'parent-dashboard') setRole('parent');
          else if (role === 'parent' && mod === 'dashboard') setRole('student');
        }}
        profile={profile}
        unreadNotificationsCount={unreadCount}
        onSignOutToAuth={() => setIsOnboarded(false)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeModule={activeModule}
          profile={profile}
          role={role}
          onToggleRole={setRole}
          onSelectModule={setActiveModule}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          unreadCount={unreadCount}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'dashboard' && (
            <DashboardView
              profile={profile}
              context={studyContext}
              tasks={tasks}
              focusSessions={focusSessions}
              onToggleTask={handleToggleTask}
              onNavigate={setActiveModule}
              onSelectSubjectContext={handleSelectSubjectFromDashboard}
            />
          )}

          {activeModule === 'explorer' && (
            <ExplorerView
              context={studyContext}
              onUpdateContext={setStudyContext}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'previous-classes' && (
            <PreviousClassesView
              studentGradeId={profile.gradeId}
              onLaunchTopic={handleLaunchTopic}
            />
          )}

          {activeModule === 'lessons' && (
            <LessonsView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'notes' && (
            <NotesView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'aria' && (
            <AriaTeacherView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'quizzes' && (
            <QuizzesView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'numerical-lab' && (
            <NumericalLabView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'focus' && (
            <FocusCenterView
              sessions={focusSessions}
              onLogFocusSession={handleLogFocusSession}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'youtube' && (
            <YouTubeHubView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'planner' && (
            <StudyPlannerView
              profile={profile}
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'analytics' && (
            <AnalyticsView
              profile={profile}
              tasks={tasks}
              focusSessions={focusSessions}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'achievements' && (
            <AchievementsView
              tasks={tasks}
              focusSessions={focusSessions}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'library' && (
            <PersonalLibraryView onNavigate={setActiveModule} />
          )}

          {activeModule === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'parent-dashboard' && (
            <ParentDashboardView
              profile={profile}
              tasks={tasks}
              focusSessions={focusSessions}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'settings' && (
            <ProfileSettingsView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((prev) => !prev)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
