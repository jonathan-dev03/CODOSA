import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, BookOpen, ShieldAlert, Calendar, User, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';

export default function Layout() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const isStaff = profile?.role !== 'eleve' && profile?.role !== 'professeur';
  const showDiscipline = profile?.role !== 'eleve'; // Teachers can see it too in some views or just filtered? User said: hidden for eleve and professeur.
  const canAccessDiscipline = !['eleve', 'professeur'].includes(profile?.role);

  return (
    <div className="pb-24 min-h-screen bg-app-bg">
      {/* Header */}
      <header className="bg-primary text-white p-4 sticky top-0 z-40 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold text-xl border-2 border-accent shadow-inner">
            C
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none uppercase">CODOSA</h1>
            <p className="text-[9px] uppercase tracking-widest text-secondary font-bold">Collège Dominique Savio</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <div className="relative cursor-pointer">
             <Bell className="w-6 h-6 text-secondary" />
             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-primary">0</span>
           </div>
           <div className="w-8 h-8 rounded-full bg-secondary border-2 border-white/20 shadow-sm overflow-hidden flex items-center justify-center font-black text-xs text-white uppercase">
             {profile?.full_name?.charAt(0)}
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto min-h-screen">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 h-20 border-t border-gray-100">
        <div className="flex items-center justify-around h-full max-w-md mx-auto">
          <NavLink to="/home" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-secondary scale-110" : "text-primary opacity-40")}>
            <Home size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.home')}</span>
          </NavLink>
          <NavLink to="/journal" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-secondary scale-110" : "text-primary opacity-40")}>
            <BookOpen size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.journal')}</span>
          </NavLink>
          
          {canAccessDiscipline && (
            <NavLink to="/discipline" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-secondary scale-110" : "text-primary opacity-40")}>
              <ShieldAlert size={24} />
              <span className="text-[10px] font-bold uppercase">{t('nav.discipline')}</span>
            </NavLink>
          )}

          <NavLink to="/schedule" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-secondary scale-110" : "text-primary opacity-40")}>
            <Calendar size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.schedule')}</span>
          </NavLink>
          
          <NavLink to="/account" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-secondary scale-110" : "text-primary opacity-40")}>
            <User size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.account')}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
