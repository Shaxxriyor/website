import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { HomeView } from './components/HomeView.jsx';
import { ProfilePanel } from './components/ProfilePanel.jsx';
import { StudentsView } from './components/admin/StudentsView.jsx';
import { StudentProfile } from './components/admin/StudentProfile.jsx';
import { PracticeView } from './components/admin/PracticeView.jsx';
import { LoginView } from './components/admin/LoginView.jsx';
import { OverviewPanel, SignedOutPanel, StudentPanel } from './components/admin/AdminPanel.jsx';
import { Skeleton } from './components/admin/ui.jsx';
import { api, setUnauthorizedHandler } from './lib/api.js';
import { useRoute } from './lib/router.js';
import { user, activity, activitySeries, myCourses } from './data/mock.js';

const ADMIN_ROUTES = ['students', 'practice'];

export default function App() {
  const route = useRoute();
  const isAdminRoute = ADMIN_ROUTES.includes(route.name);

  // Session: undefined = still checking, null = signed out, string = teacher username.
  const [admin, setAdmin] = useState(undefined);
  // Bumped after every change so lists, profiles and panels refetch.
  const [version, setVersion] = useState(0);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const notify = useCallback((message) => setToast({ message, key: Date.now() }), []);

  useEffect(() => {
    setUnauthorizedHandler(() => setAdmin(null));
    api
      .session()
      .then((s) => setAdmin(s.admin))
      .catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => setProfile(null), [route.id]);

  async function signOut() {
    await api.logout().catch(() => {});
    setAdmin(null);
    notify('Signed out');
  }

  let main;
  let panel;
  if (!isAdminRoute) {
    main = <HomeView />;
    panel = <ProfilePanel user={user} activity={activity} activitySeries={activitySeries} courses={myCourses} />;
  } else if (admin === undefined) {
    main = <Skeleton rows={4} />;
    panel = <SignedOutPanel />;
  } else if (!admin) {
    main = <LoginView onSignedIn={() => api.session().then((s) => setAdmin(s.admin))} />;
    panel = <SignedOutPanel />;
  } else if (route.name === 'students' && route.id) {
    main = (
      <StudentProfile id={route.id} version={version} onChanged={refresh} notify={notify} onLoaded={setProfile} />
    );
    panel = <StudentPanel data={profile} onSignOut={signOut} />;
  } else {
    const View = route.name === 'practice' ? PracticeView : StudentsView;
    main = <View version={version} onChanged={refresh} notify={notify} />;
    panel = <OverviewPanel version={version} onSignOut={signOut} />;
  }

  return (
    <div className="stage">
      <div className="backdrop" aria-hidden="true">
        <span className="orb orb--1" />
        <span className="orb orb--2" />
        <span className="orb orb--3" />
      </div>

      <div className="shell">
        <Sidebar active={route.name} />
        <main className="main" key={`${route.name}/${route.id ?? ''}`}>
          {main}
        </main>
        {panel}
      </div>

      {toast && (
        <div className="toast" role="status" key={toast.key}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
