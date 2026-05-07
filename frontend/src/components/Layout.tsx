import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/store/auth';

export function Layout() {
  const theme = useAuth((s) => s.user?.theme) ?? 'violet';

  // Subtle grid background + active theme on the authenticated app shell only.
  useEffect(() => {
    document.body.dataset.grid = '1';
    return () => {
      delete document.body.dataset.grid;
    };
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    return () => {
      delete document.body.dataset.theme;
    };
  }, [theme]);

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
