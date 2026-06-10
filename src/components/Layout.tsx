import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, BookOpen, ShieldAlert, Calendar, User, Bell, GraduationCap, Users, Layers, FileText, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { profile, activeCampus, setActiveCampus } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resettingPwd, setResettingPwd] = useState(false);

  const isChatAllowed = ['professeur', 'censeur', 'resp_pedagogique', 'resp_discipline', 'secretaire', 'directeur', 'super_admin'].includes(profile?.role || '');

  useEffect(() => {
    if (!profile || !isChatAllowed) return;

    let activeSub: any = null;

    const fetchUnreads = async () => {
      try {
        const { data: cols } = await supabase
          .from('chat_members')
          .select('channel_id')
          .eq('user_id', profile.id);

        const channelIds = cols?.map(cm => cm.channel_id) || [];
        if (channelIds.length === 0) {
          setUnreadChatCount(0);
          return;
        }

        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id, sender_id, read_by')
          .in('channel_id', channelIds);

        if (messages) {
          const count = messages.filter(m => {
            const arr = m.read_by || [];
            return m.sender_id !== profile.id && !arr.includes(profile.id);
          }).length;
          setUnreadChatCount(count);
        }
      } catch (err) {
        console.warn("Unreads sync warning:", err);
      }
    };

    fetchUnreads();

    activeSub = supabase
      .channel('layout_chat_bell_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchUnreads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, () => {
        fetchUnreads();
      })
      .subscribe();

    return () => {
      if (activeSub) supabase.removeChannel(activeSub);
    };
  }, [profile]);

  const isStaff = profile?.role !== 'eleve' && profile?.role !== 'professeur';
  const showDiscipline = profile?.role !== 'eleve';
  const canAccessDiscipline = profile?.role !== 'eleve';
  const canAccessDirectory = profile?.role !== 'eleve';
  const showCourses = ['professeur', 'resp_pedagogique', 'directeur', 'super_admin', 'censeur', 'resp_discipline'].includes(profile?.role);
  const isFr = i18n.language === 'fr';

  return (
    <div className="min-h-screen bg-app-bg flex flex-col lg:flex-row">
      {profile?.needs_password_reset && (
        <div className="fixed inset-0 bg-primary/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-secondary" />
            
            <h2 className="text-xl font-black text-primary uppercase mb-2">Changement de mot de passe requis</h2>
            <p className="text-xs text-gray-500 mb-6 font-semibold">
              Kòd sekirite ou a te réinitialiser pa yon administratè. Ou dwe chwazi yon nouvo kòd sekirite pou pwoteje kont ou.
            </p>
            
            {resetError && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl mb-4 border-l-4 border-red-500">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="bg-green-50 text-green-700 text-xs font-bold p-3 rounded-xl mb-4 border-l-4 border-green-500">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setResetError('');
              setResetSuccess('');
              
              if (newPassword.length < 6) {
                setResetError(isFr ? "Le mot de passe doit comporter au moins 6 caractères." : "Modpas la dwe genyen omwen 6 karaktè.");
                return;
              }
              if (newPassword !== confirmPassword) {
                setResetError(isFr ? "Les mots de passe ne correspondent pas." : "Modpas yo pa koresponn.");
                return;
              }
              
              setResettingPwd(true);
              try {
                // Update auth password
                const { error: authErr } = await supabase.auth.updateUser({
                  password: newPassword
                });
                if (authErr) throw authErr;
                
                // Update users table in database
                const { error: dbErr } = await supabase
                  .from('users')
                  .update({ needs_password_reset: false })
                  .eq('id', profile.id);
                  
                if (dbErr) throw dbErr;
                
                setResetSuccess(isFr ? "Votre mot de passe a été modifié avec succès !" : "Modpas ou a chanje avèk siksè !");
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              } catch (err: any) {
                setResetError(err.message || "Erreur lors du changement de mot de passe.");
              } finally {
                setResettingPwd(false);
              }
            }} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Nouveau mot de passe :</label>
                <input 
                  type="password"
                  required
                  placeholder="Omwen 6 karaktè..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="p-3.5 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Confirmer le mot de passe :</label>
                <input 
                  type="password"
                  required
                  placeholder="Repete nouvo modpas la..."
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="p-3.5 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={resettingPwd}
                className="w-full bg-[#fac900] text-[#010657] hover:bg-[#ebd056] py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
              >
                {resettingPwd ? "Modifikasyon ap fèt..." : "Mettre à jour mot de passe"}
              </button>
            </form>
          </div>
        </div>
      )}
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
          
          <NavLink to="/devoir" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
            <FileText size={20} />
            <span className="uppercase text-xs tracking-widest">{isFr ? "Devoirs" : "Devwa"}</span>
          </NavLink>

          {canAccessDiscipline && (
            <NavLink to="/discipline" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
              <ShieldAlert size={20} />
              <span className="uppercase text-xs tracking-widest">{t('nav.discipline')}</span>
            </NavLink>
          )}

          <NavLink to="/horaire" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
            <Calendar size={20} />
            <span className="uppercase text-xs tracking-widest">{t('nav.schedule')}</span>
          </NavLink>

          <NavLink to="/events" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
            <Calendar size={20} />
            <span className="uppercase text-xs tracking-widest">{isFr ? "Événements" : "Evènman"}</span>
          </NavLink>

          {isChatAllowed && (
            <NavLink to="/chat" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
              <MessageSquare size={20} />
              <span className="uppercase text-xs tracking-widest">{isFr ? "Messagerie" : "Mesaj"}</span>
            </NavLink>
          )}

          {showCourses && (
            <NavLink to="/courses" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
              <BookOpen size={20} />
              <span className="uppercase text-xs tracking-widest">{isFr ? "Cours & Classes" : "Jesyon Klas"}</span>
            </NavLink>
          )}

          {isStaff && (
            <NavLink to="/salles" className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold", isActive ? "bg-accent text-primary shadow-xl scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100")}>
              <Layers size={20} />
              <span className="uppercase text-xs tracking-widest">{isFr ? "Gestion des Salles" : "Jesyon Salles"}</span>
            </NavLink>
          )}

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

          {/* Directeur campus switcher */}
          {profile?.role === 'directeur' ? (
            <div className="flex h-6 w-full max-w-[100px] border border-[#fac900] rounded-[20px] overflow-hidden z-50 transition-all duration-200 shrink-0">
              <button 
                onClick={() => setActiveCampus('fondamentale')}
                className={clsx(
                  "flex-1 text-center cursor-pointer select-none leading-none transition-all duration-200 ease-in-out text-[9px] md:text-[11px] font-bold h-full border-r border-[#fac900]",
                  activeCampus === 'fondamentale' 
                    ? "bg-[#fac900] text-[#010657]" 
                    : "bg-transparent text-white lg:text-[#010657]/60"
                )}
              >
                FOND.
              </button>
              <button 
                onClick={() => setActiveCampus('secondaire')}
                className={clsx(
                  "flex-1 text-center cursor-pointer select-none leading-none transition-all duration-200 ease-in-out text-[9px] md:text-[11px] font-bold h-full",
                  activeCampus === 'secondaire' 
                    ? "bg-[#fac900] text-[#010657]" 
                    : "bg-transparent text-white lg:text-[#010657]/60"
                )}
              >
                SEC.
              </button>
            </div>
          ) : (
            <div className="hidden lg:block w-[100px] shrink-0"></div>
          )}

          <div className="flex items-center space-x-4">
             {isChatAllowed && (
               <NavLink to="/chat" className="relative cursor-pointer hover:opacity-85 transition-opacity mr-2">
                  <MessageSquare className="w-6 h-6 text-secondary lg:text-primary" />
                  {unreadChatCount > 0 && (
                     <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-primary lg:border-white animate-pulse">
                       {unreadChatCount}
                     </span>
                  )}
               </NavLink>
             )}

             <div className="relative cursor-pointer">
                <Bell className="w-6 h-6 text-secondary lg:text-primary" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-primary lg:border-white">0</span>
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

                <NavLink to="/devoir" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                  <FileText size={18} />
                  <span className="uppercase text-xs tracking-widest">{isFr ? "Devoirs" : "Devwa"}</span>
                </NavLink>

                {canAccessDiscipline && (
                  <NavLink to="/discipline" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                    <ShieldAlert size={18} />
                    <span className="uppercase text-xs tracking-widest">{t('nav.discipline')}</span>
                  </NavLink>
                )}
                <NavLink to="/horaire" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                  <Calendar size={18} />
                  <span className="uppercase text-xs tracking-widest">{t('nav.schedule')}</span>
                </NavLink>

                <NavLink to="/events" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                  <Calendar size={18} />
                  <span className="uppercase text-xs tracking-widest">{isFr ? "Événements" : "Evènman"}</span>
                </NavLink>

                {isChatAllowed && (
                  <NavLink to="/chat" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                    <MessageSquare size={18} />
                    <span className="uppercase text-xs tracking-widest">{isFr ? "Messagerie" : "Mesaj"}</span>
                  </NavLink>
                )}

                {showCourses && (
                  <NavLink to="/courses" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                    <BookOpen size={18} />
                    <span className="uppercase text-xs tracking-widest">{isFr ? "Cours & Classes" : "Jesyon Klas"}</span>
                  </NavLink>
                )}
                {isStaff && (
                  <NavLink to="/salles" onClick={() => setIsDrawerOpen(false)} className={({ isActive }) => clsx("flex items-center space-x-4 p-4 rounded-xl transition-all font-bold text-white", isActive ? "bg-accent text-primary shadow-lg" : "opacity-60 hover:opacity-100")}>
                    <Layers size={18} />
                    <span className="uppercase text-xs tracking-widest">{isFr ? "Gestion des Salles" : "Jesyon Salles"}</span>
                  </NavLink>
                )}
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
      <nav className="fixed bottom-0 left-0 right-0 bg-[#010657] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 h-20 border-t border-white/5 lg:hidden">
        <div className="flex items-center justify-around h-full max-w-md mx-auto">
          <NavLink to="/home" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-[#fac900] scale-110" : "text-white opacity-60")}>
            <Home size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.home')}</span>
          </NavLink>
          <NavLink to="/journal" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-[#fac900] scale-110" : "text-white opacity-60")}>
            <BookOpen size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.journal')}</span>
          </NavLink>
          
          {profile?.role === 'eleve' ? (
            <NavLink to="/devoir" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-[#fac900] scale-110" : "text-white opacity-60")}>
              <FileText size={24} />
              <span className="text-[10px] font-bold uppercase">{isFr ? "Devoirs" : "Devwa"}</span>
            </NavLink>
          ) : (
            canAccessDiscipline && (
              <NavLink to="/discipline" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-[#fac900] scale-110" : "text-white opacity-60")}>
                <ShieldAlert size={24} />
                <span className="text-[10px] font-bold uppercase">{t('nav.discipline')}</span>
              </NavLink>
            )
          )}

          <NavLink to="/horaire" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-[#fac900] scale-110" : "text-white opacity-60")}>
            <Calendar size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.schedule')}</span>
          </NavLink>
          
          <NavLink to="/account" className={({ isActive }) => clsx("flex flex-col items-center space-y-1 transition-all", isActive ? "text-[#fac900] scale-110" : "text-white opacity-60")}>
            <User size={24} />
            <span className="text-[10px] font-bold uppercase">{t('nav.account')}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
