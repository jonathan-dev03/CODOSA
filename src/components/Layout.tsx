import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, BookOpen, ShieldAlert, Calendar, User, Bell, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isStaff = profile?.role !== 'eleve' && profile?.role !== 'professeur';
  const showDiscipline = profile?.role !== 'eleve'; // Teachers can see it too in some views or just filtered? User said: hidden for eleve and professeur.
  const canAccessDiscipline = !['eleve', 'professeur'].includes(profile?.role);
  const canAccessDirectory = profile?.role !== 'eleve';

  return (
    <div className="min-h-screen bg-app-bg flex flex-col lg:flex-row">
      {/* Sidebar for Desktop / Tablet (Large screens) */}
      <nav className="hidden lg:flex flex-col w-72 bg-primary text-white h-screen sticky top-0 z-50 shadow-2xl">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center font-bold text-2xl border-2 border-accent shadow-inner">
              C
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none uppercase">CODOSA</h1>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Collège Dominique Savio</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-3xl border border-white/10">
            <div className="w-10 h-10 rounded-full bg-secondary border-2 border-white/20 shadow-sm overflow-hidden flex items-center justify-center font-black text-sm text-white uppercase shrink-0">
              {profile?.full_name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-bold truncate text-white">{profile?.full_name}</p>
               <p className="text-[9px] uppercase tracking-widest text-accent font-black">{profile?.role}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-2 overflow-y-auto">
          <NavLink to="/home" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
            <Home size={20} />
            <span className="uppercase text-xs tracking-widest">{t('nav.home')}</span>
          </NavLink>
          <NavLink to="/journal" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
            <BookOpen size={20} />
            <span className="uppercase text-xs tracking-widest">{t('nav.journal')}</span>
          </NavLink>
          
          {canAccessDiscipline && (
            <NavLink to="/discipline" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
              <ShieldAlert size={20} />
              <span className="uppercase text-xs tracking-widest">{t('nav.discipline')}</span>
            </NavLink>
          )}

          <NavLink to="/schedule" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
            <Calendar size={20} />
            <span className="uppercase text-xs tracking-widest">{t('nav.schedule')}</span>
          </NavLink>

          {canAccessDirectory && (
            <>
              <NavLink to="/professors" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
                <GraduationCap size={20} />
                <span className="uppercase text-xs tracking-widest">{t('nav.professors')}</span>
              </NavLink>

              <NavLink to="/students" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
                <Users size={20} />
                <span className="uppercase text-xs tracking-widest">{t('nav.students')}</span>
              </NavLink>
            </>
          )}
          
          <NavLink to="/account" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
            <User size={20} />
            <span className="uppercase text-xs tracking-widest">{t('nav.account')}</span>
          </NavLink>
        </div>

        <div className="p-8 border-t border-white/5 text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold text-center">
          © 2024 CODOSA Platfòm
        </div>
      </nav>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header (Always visible on mobile, simple on desktop) */}
        <header className="bg-primary lg:bg-white text-white lg:text-primary p-4 sticky top-0 z-40 flex items-center justify-between shadow-xl lg:shadow-none lg:border-b lg:border-gray-100">
          <div className="flex items-center space-x-2 lg:hidden">
            {/* Hamburger Button */}
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 hover:bg-white/10 active:bg-white/20 rounded-xl transition-all"
              id="mobile-hamburger-btn"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center font-bold text-lg border-2 border-accent shadow-inner">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none uppercase">CODOSA</h1>
              <p className="text-[8px] uppercase tracking-widest text-secondary font-bold">Collège Dominique Savio</p>
            </div>
          </div>

          <div className="hidden lg:block">
             <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary/40">Dashboard Platfòm</h2>
          </div>

          <div className="flex items-center space-x-4">
             <div className="relative cursor-pointer">
                <Bell className="w-6 h-6 text-secondary lg:text-primary" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-primary lg:border-white">0</span>
             </div>
             <div className="lg:hidden w-8 h-8 rounded-full bg-secondary border-2 border-white/20 shadow-sm overflow-hidden flex items-center justify-center font-black text-xs text-white uppercase">
                {profile?.full_name?.charAt(0)}
             </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 p-2 lg:p-12 pb-24 lg:pb-12 max-w-7xl mx-auto w-full">
          <div className="bg-white lg:rounded-3xl lg:shadow-sm lg:border lg:border-gray-50 min-h-screen lg:min-h-0 overflow-hidden">
             <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-50 lg:hidden flex" 
            onClick={() => setIsDrawerOpen(false)}
            id="mobile-drawer-overlay"
          >
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 bg-primary h-full shadow-2xl flex flex-col p-6 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold text-xl border-2 border-accent shadow-inner">
                    C
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight leading-none uppercase text-white">CODOSA</h1>
                    <p className="text-[8px] uppercase tracking-widest text-secondary font-bold surrogate">Collège Dominique Savio</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)} 
                  className="text-white hover:text-secondary p-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center space-x-3 my-6 p-4 bg-white/5 rounded-2xl border border-white/10 shrink-0">
                <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-black text-sm text-white uppercase shrink-0">
                  {profile?.full_name?.charAt(0)}
                </div>
                <div className="overflow-hidden">
                   <p className="text-sm font-bold truncate text-white">{profile?.full_name}</p>
                   <p className="text-[9px] uppercase tracking-widest text-accent font-black">{profile?.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-2">
                <NavLink to="/home" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                  <Home size={18} />
                  <span className="uppercase text-xs tracking-widest">{t('nav.home')}</span>
                </NavLink>
                <NavLink to="/journal" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                  <BookOpen size={18} />
                  <span className="uppercase text-xs tracking-widest">{t('nav.journal')}</span>
                </NavLink>
                {canAccessDiscipline && (
                  <NavLink to="/discipline" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                    <ShieldAlert size={18} />
                    <span className="uppercase text-xs tracking-widest">{t('nav.discipline')}</span>
                  </NavLink>
                )}
                <NavLink to="/schedule" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                  <Calendar size={18} />
                  <span className="uppercase text-xs tracking-widest">{t('nav.schedule')}</span>
                </NavLink>
                {canAccessDirectory && (
                  <>
                    <NavLink to="/professors" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                      <GraduationCap size={18} />
                      <span className="uppercase text-xs tracking-widest">{t('nav.professors')}</span>
                    </NavLink>
                    <NavLink to="/students" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                      <Users size={18} />
                      <span className="uppercase text-xs tracking-widest">{t('nav.students')}</span>
                    </NavLink>
                  </>
                )}
                <NavLink to="/account" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                  <User size={18} />
                  <span className="uppercase text-xs tracking-widest">{t('nav.account')}</span>
                </NavLink>
              </div>

              <div className="pt-6 border-t border-white/10 text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold text-center shrink-0">
                © 2024 CODOSA Platfòm
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Only visible on mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 h-20 border-t border-gray-100 lg:hidden">
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
