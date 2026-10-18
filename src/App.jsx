import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { HomeView } from './components/HomeView.jsx';
import { StudentHomePanel } from './components/StudentHomePanel.jsx';
import { RatingView } from './components/RatingView.jsx';
import { StudentsView } from './components/admin/StudentsView.jsx';
import { StudentProfile } from './components/admin/StudentProfile.jsx';
import { PracticeView } from './components/admin/PracticeView.jsx';
import { LoginView } from './components/admin/LoginView.jsx';
import { OverviewPanel, SignedOutPanel, StudentPanel } from './components/admin/AdminPanel.jsx';
import { Skeleton } from './components/admin/ui.jsx';
import { api, setUnauthorizedHandler } from './lib/api.js';
import { useRoute } from './lib/router.js';

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
  // Signed-in student on the public pages: undefined = checking, null = none.
  const [me, setMe] = useState(undefined);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const notify = useCallback((message) => setToast({ message, key: Date.now() }), []);

  const loadMe = useCallback(
    () =>
      api
        .me()
        .then((d) => setMe(d.student ? d : null))
        .catch(() => setMe((m) => m ?? null)),
    [],
  );

  // Refresh when the student comes back from a marathon tab, so new progress shows.
  useEffect(() => {
    loadMe();
    const onVisible = () => document.visibilityState === 'visible' && loadMe();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadMe]);

  async function studentSignOut() {
    await api.studentLogout().catch(() => {});
    setMe(null);
    notify('Signed out');
  }

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
  const studentPanel = (
    <StudentHomePanel
      me={me}
      onSignedIn={async () => {
        await loadMe();
        notify('Signed in — your progress will be saved');
      }}
      onSignOut={studentSignOut}
      onChanged={async () => {
        await loadMe();
        refresh();
      }}
      notify={notify}
    />
  );
  if (route.name === 'rating') {
    main = <RatingView signedIn={Boolean(me) || Boolean(admin)} version={version} />;
    panel = !me && admin ? <OverviewPanel version={version} onSignOut={signOut} /> : studentPanel;
  } else if (!isAdminRoute) {
    main = <HomeView tab={route.name} results={me?.marathon} practice={me?.practice} signedIn={Boolean(me)} me={me} admin={admin} />;
    panel = studentPanel;
  } else if (admin === undefined) {
    main = <Skeleton rows={4} />;
    panel = <SignedOutPanel />;
  } else if (!admin) {
    main = <LoginView studentName={me?.student.full_name} onSignedIn={() => api.session().then((s) => setAdmin(s.admin))} />;
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
        <Sidebar active={isAdminRoute || route.name === 'rating' ? route.name : 'home'} userName={isAdminRoute ? admin || null : me?.student.full_name} userId={isAdminRoute ? null : me?.student.id} userAvatar={isAdminRoute ? null : me?.student.avatar_v} teacher={Boolean(admin) || isAdminRoute} />
        <main className="main" key={isAdminRoute || route.name === 'rating' ? `${route.name}/${route.id ?? ''}` : 'home'}>
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
