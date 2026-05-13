import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'eleve',
    campus: 'fondamantal'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ha' ? 'fr' : 'ha');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!formData.email.endsWith('@codosapv.com')) {
      setError(t('login.error_domain'));
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        campus: formData.campus,
        is_approved: false
      });

      if (profileError) {
        setError(profileError.message);
      } else {
        setMessage(t('login.pending_approval'));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute opacity-5 pointer-events-none">
        <div className="w-[400px] h-[400px] bg-primary rounded-full flex items-center justify-center text-8xl font-bold">C</div>
      </div>

      <button onClick={toggleLanguage} className="absolute top-6 right-6 px-4 py-1 bg-primary text-white rounded-full text-sm font-bold shadow-md z-10">
        {t('lang_toggle')}
      </button>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl z-10">
        <h1 className="text-3xl font-bold text-secondary mb-6 text-center">{t('register.title')}</h1>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">{error}</div>}
        {message && <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm mb-6 border border-green-100 font-medium">{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder={t('register.full_name')}
              required
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
            />
            <input
              type="email"
              placeholder="imel@codosapv.com"
              required
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password"
              placeholder={t('register.password')}
              required
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-primary mb-1 uppercase opacity-60">{t('register.role')}</label>
                <select 
                  className="w-full p-3 bg-gray-100 rounded-xl outline-none"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="eleve">{t('roles.eleve')}</option>
                  <option value="professeur">{t('roles.professeur')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1 uppercase opacity-60">{t('register.campus_select')}</label>
                <select 
                  className="w-full p-3 bg-gray-100 rounded-xl outline-none"
                  value={formData.campus}
                  onChange={e => setFormData({ ...formData, campus: e.target.value })}
                >
                  <option value="fondamantal">{t('campus.fondamental')}</option>
                  <option value="secondaire">{t('campus.secondaire')}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary text-white p-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? <div className="loader mx-auto"></div> : t('register.submit')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-primary opacity-60 text-sm font-medium hover:underline">
            {t('register.login_link')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
