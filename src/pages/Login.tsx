import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { setGuestMode } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('eleve');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ha' ? 'fr' : 'ha');
  };

  const handleGuestLogin = () => {
    setGuestMode(true);
    navigate('/home');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    // In a real environment, we'd use Supabase Google OAuth
    // supabase.auth.signInWithOAuth({ provider: 'google' })
    
    // For demo/prototype and restricted domain validation logic:
    // We'll simulate the domain check part here since we don't have the real OAuth flow configured
    alert(t('login.google_btn_warning'));
    setLoading(false);
  };

  const roles = [
    { value: 'directeur', label: t('roles.directeur') },
    { value: 'censeur_secondaire', label: t('roles.censeur_secondaire') },
    { value: 'censeur_fondamental', label: t('roles.censeur_fondamental') },
    { value: 'resp_ped_secondaire', label: t('roles.resp_ped_secondaire') },
    { value: 'resp_ped_fondamental', label: t('roles.resp_ped_fondamental') },
    { value: 'resp_discipline', label: t('roles.resp_discipline') },
    { value: 'professeur', label: t('roles.professeur') },
    { value: 'eleve', label: t('roles.eleve') },
  ];

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Watermark Logo */}
      <div className="absolute opacity-5 pointer-events-none transform -rotate-12">
        <div className="w-[400px] h-[400px] bg-primary rounded-full flex items-center justify-center text-8xl font-bold">C</div>
      </div>

      <button 
        onClick={toggleLanguage}
        className="absolute top-6 right-6 px-4 py-1 bg-primary text-white rounded-full text-sm font-bold shadow-md z-10"
      >
        {t('lang_toggle')}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-secondary mb-2 tracking-tighter">CODOSA</h1>
          <p className="text-primary font-medium opacity-70">{t('login.title')}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-primary mb-2">
              {t('login.role_select')}
            </label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary transition-colors font-medium text-primary"
            >
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-opacity-95 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="loader border-t-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>{t('login.google_btn')}</span>
              </>
            )}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">{t('login.or')}</span></div>
          </div>

          <div className="space-y-4">
             <Link to="/register" className="block w-full text-center text-secondary font-bold hover:underline">
               {t('login.register_link')}
             </Link>
             
             <button 
               onClick={handleGuestLogin}
               className="w-full text-center text-primary opacity-60 text-xs font-bold uppercase tracking-widest hover:opacity-100 transition-opacity"
             >
               {t('login.guest_btn')}
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
