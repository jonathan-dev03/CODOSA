import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { setGuestMode } = useAuth();
  const navigate = useNavigate();
  const isFr = i18n.language === 'fr';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuestRoles, setShowGuestRoles] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ha' ? 'fr' : 'ha');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isFr ? "Veuillez remplir tous les champs." : "Tanpri ranpli tout vid yo.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
      } else {
        // Successful login - role detection is handled automatically by AuthContext profile fetch
        navigate('/home');
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de la connexion.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/home'
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de connexion Google.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert(isFr ? "Veuillez saisir votre adresse email pour réinitialiser votre mot de passe." : "Tanpri tape adrès imèl ou an premye.");
      return;
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (resetError) {
        alert("Erreur: " + resetError.message);
      } else {
        alert(isFr ? "Un email de réinitialisation a été envoyé !" : "Yo voye yon imèl pou chanje modpas ou !");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  const handleGuestLogin = (val: string) => {
    const [role, campus] = val.split(':');
    setGuestMode(role, campus || 'fondamantal');
    navigate('/home');
  };

  const guestRoles = [
    { value: 'directeur:secondaire', label: isFr ? 'Directeur' : 'Direktè' },
    { value: 'censeur:secondaire', label: isFr ? 'Censeur — Secondaire' : 'Sansè — Segondè' },
    { value: 'censeur:fondamantal', label: isFr ? 'Censeur — Fondamental' : 'Sansè — Fondamantal' },
    { value: 'resp_pedagogique:secondaire', label: isFr ? 'Resp. Pédagogique — Secondaire' : 'Resp. Pedajojik — Segondè' },
    { value: 'resp_pedagogique:fondamantal', label: isFr ? 'Resp. Pédagogique — Fondamental' : 'Resp. Pedajojik — Fondamantal' },
    { value: 'professeur:secondaire', label: isFr ? 'Professeur' : 'Pwofesè' },
    { value: 'eleve:fondamantal', label: isFr ? 'Élève / Étudiant' : 'Elèv' },
  ];

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Watermark Logo */}
      <div 
        className="absolute pointer-events-none z-0 flex items-center justify-center" 
        style={{ opacity: 0.10 }}
      >
        <img 
          src="/logo-circle.png" 
          alt="CODOSA Watermark" 
          className="w-[280px] h-[280px] object-contain select-none"
        />
      </div>

      {/* Language Toggle (Top Right) */}
      <button 
        onClick={toggleLanguage}
        className="absolute top-6 right-6 px-4 py-2 bg-primary hover:bg-[#010657]/90 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md z-10 transition-all active:scale-95"
      >
        {t('lang_toggle')}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl z-10 border border-gray-150 relative"
      >
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-primary mb-1 tracking-tighter">CODOSA</h1>
          <p className="text-secondary font-black text-xs uppercase tracking-widest">{t('school_name')}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100 flex items-start space-x-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* OPTION 1 — Email + Password */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <h2 className="text-xs font-black uppercase text-secondary tracking-widest mb-1">
              {isFr ? "Option 1 — Email & Mot de Passe" : "Opsyon 1 — Imèl & Modpas"}
            </h2>
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                placeholder={isFr ? "Saisir votre adresse email..." : "Antre adrès imèl ou..."}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-2xl outline-none font-bold text-sm text-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                placeholder={isFr ? "Saisir votre mot de passe..." : "Antre modpas ou..."}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-2xl outline-none font-bold text-sm text-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end pr-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-bold hover:underline text-[#09b5f2]"
              >
                {isFr ? "Mot de passe oublié ?" : "Modpas bliye ?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#010657] text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all hover:opacity-95 shadow-md active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <div className="loader border-t-white"></div>
              ) : (
                <>
                  <span>{isFr ? "Se connecter" : "Konekte"}</span>
                  <ArrowRight size={14} className="stroke-3" />
                </>
              )}
            </button>
          </form>

          {/* DIVIDER LAYOUT: "ou" */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-150"></div>
            </div>
            <div className="relative flex justify-center text-xs font-black uppercase">
              <span className="bg-white px-3 text-gray-400">
                {isFr ? "ou" : "oswa / ou"}
              </span>
            </div>
          </div>

          {/* OPTION 2 — Google Sign-In */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase text-secondary tracking-widest mb-1">
              {isFr ? "Option 2 — Authentification Google" : "Opsyon 2 — Otantifikasyon Google"}
            </h2>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 text-primary border border-gray-200 p-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-3 transition-all active:scale-98 shadow-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{isFr ? "Continuer avec Google" : "Kontinye ak Google"}</span>
            </button>
          </div>

          {/* GUEST & REGISTER LINKS */}
          <div className="space-y-4 pt-4 border-t border-gray-100 text-center">
            <button 
              type="button"
              onClick={() => setShowGuestRoles(true)}
              className="w-full text-center text-primary/70 hover:text-primary text-xs font-black uppercase tracking-widest transition-colors"
            >
              {isFr ? "Continuer en tant qu'invité" : "Kontinye kòm envite"}
            </button>

            <div className="text-xs text-gray-500 font-bold">
              {isFr ? "Pas encore de compte ?" : "Pa gen kont ?"}{' '}
              <Link to="/register" className="text-secondary font-black uppercase hover:underline">
                {isFr ? "Créer un compte" : "Kreye yon kont"}
              </Link>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Guest Role Simulation Modal */}
      <AnimatePresence>
        {showGuestRoles && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-gray-100 relative"
            >
              <h3 className="text-lg font-black text-primary uppercase text-center mb-2">
                {isFr ? "Mode Invité" : "Mòd Envite"}
              </h3>
              <p className="text-center text-xs text-secondary font-bold uppercase tracking-wider mb-6">
                {isFr ? "Choisissez votre rôle de démonstration" : "Chwazi wòl ou pou tès la"}
              </p>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {guestRoles.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => handleGuestLogin(g.value)}
                    className="w-full p-3 text-left bg-gray-50 hover:bg-secondary hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between"
                  >
                    <span>{g.label}</span>
                    <UserCheck size={14} className="opacity-70" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowGuestRoles(false)}
                className="w-full mt-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-xs font-black uppercase tracking-widest text-primary/85 transition-colors"
              >
                {isFr ? "Annuler" : "Anile"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
