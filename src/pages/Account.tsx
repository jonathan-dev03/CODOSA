import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Globe, User, Settings, ShieldCheck, ChevronRight, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

export default function Account() {
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ha' ? 'fr' : 'ha');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const canStartNewYear = ['directeur', 'censeur_fondamental', 'censeur_secondaire', 'super_admin'].includes(profile?.role);
  const isAdmin = ['super_admin', 'directeur'].includes(profile?.role);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="text-center space-y-4">
        <div className="w-24 h-24 bg-primary text-white rounded-[2rem] mx-auto flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white overflow-hidden relative">
           {profile?.full_name?.charAt(0).toUpperCase()}
           <div className="absolute bottom-0 left-0 right-0 h-2 bg-secondary"></div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">{profile?.full_name}</h2>
          <div className="flex items-center justify-center space-x-2 mt-1">
            <span className="bg-secondary text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest leading-normal">{t(`roles.${profile?.role}`)}</span>
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest leading-normal">{profile?.campus}</span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-50 space-y-2">
        <button 
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-accent/10 p-3 rounded-xl text-accent"><Globe size={20} /></div>
            <span className="font-bold text-primary opacity-80">{t('lang_toggle')}</span>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-secondary transition-all" />
        </button>

        {profile?.role === 'professeur' && (
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group">
            <div className="flex items-center space-x-4">
              <div className="bg-secondary/10 p-3 rounded-xl text-secondary"><Settings size={20} /></div>
              <span className="font-bold text-primary opacity-80">{t('account.update_profile')}</span>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-secondary transition-all" />
          </button>
        )}

        {isAdmin && (
          <button className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-2xl transition-all shadow-lg active:scale-[0.98]">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl"><ShieldCheck size={20} /></div>
              <span className="font-bold uppercase tracking-widest text-xs">{t('account.admin_panel')}</span>
            </div>
            <ChevronRight size={18} className="opacity-40" />
          </button>
        )}

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition-all group mt-4"
        >
          <div className="flex items-center space-x-4 text-red-500">
            <div className="bg-red-500/10 p-3 rounded-xl"><LogOut size={20} /></div>
            <span className="font-bold">{t('account.logout')}</span>
          </div>
        </button>
      </div>

      {canStartNewYear && (
        <section className="bg-accent p-6 rounded-[2.5rem] shadow-xl border-4 border-white relative overflow-hidden">
          <GraduationCap className="absolute -bottom-4 -right-4 w-24 h-24 text-primary opacity-10" />
          <h3 className="text-primary font-black uppercase text-xs tracking-widest mb-2">{t('account.academic_actions')}</h3>
          <p className="text-primary/70 text-sm font-medium mb-4">{t('account.academic_description')}</p>
          <button 
            onClick={() => navigate('/discipline')}
            className="bg-primary text-white w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all text-center"
          >
             {t('account.new_academic_year')}
          </button>
        </section>
      )}

      <footer className="text-center pt-8 pb-4">
         <p className="text-[10px] font-black text-primary opacity-20 uppercase tracking-[0.3em]">CODOSA v1.0.0 • AI Powered</p>
      </footer>
    </div>
  );
}
