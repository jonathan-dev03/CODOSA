import React, { useState, useEffect } from 'react';
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
    campus: 'fondamantal',
    classroom: '',
    start_year: '2025-2026'
  });
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [availability, setAvailability] = useState<Record<string, { available: boolean; startTime: string; endTime: string }>>({
    Lundi: { available: false, startTime: '07:30', endTime: '13:30' },
    Mardi: { available: false, startTime: '07:30', endTime: '13:30' },
    Mercredi: { available: false, startTime: '07:30', endTime: '13:30' },
    Jeudi: { available: false, startTime: '07:30', endTime: '13:30' },
    Vendredi: { available: false, startTime: '07:30', endTime: '13:30' },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ha' ? 'fr' : 'ha');
  };

  useEffect(() => {
    const fetchClassrooms = async () => {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('campus', formData.campus)
        .order('name');
      setClassrooms(data || []);
    };
    fetchClassrooms();
  }, [formData.campus]);

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

    let finalFullName = formData.full_name;
    const isCenseurOrDirector = ['censeur_fondamental', 'censeur_secondaire', 'directeur'].includes(formData.role);
    if (isCenseurOrDirector) {
      finalFullName = `${formData.full_name} |start_year:${formData.start_year || '2025-2026'}`;
    } else if (formData.role === 'professeur') {
      finalFullName = `${formData.full_name} |availability:${JSON.stringify(availability)}`;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: finalFullName,
          role: formData.role,
          campus: formData.campus,
          start_year: formData.start_year || '2025-2026'
        }
      }
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
        full_name: finalFullName,
        role: formData.role,
        campus: formData.campus,
        classroom: formData.classroom || null,
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
                  className="w-full p-3 bg-gray-100 rounded-xl outline-none text-xs font-bold text-primary"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="eleve">{t('roles.eleve')}</option>
                  <option value="professeur">{t('roles.professeur')}</option>
                  <option value="directeur">{t('roles.directeur')}</option>
                  <option value="censeur_fondamental">{t('roles.censeur_fondamental')}</option>
                  <option value="censeur_secondaire">{t('roles.censeur_secondaire')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1 uppercase opacity-60">{t('register.campus_select')}</label>
                <select 
                  className="w-full p-3 bg-gray-100 rounded-xl outline-none text-xs font-bold text-primary"
                  value={formData.campus}
                  onChange={e => setFormData({ ...formData, campus: e.target.value })}
                >
                  <option value="fondamantal">{t('campus.fondamental')}</option>
                  <option value="secondaire">{t('campus.secondaire')}</option>
                </select>
              </div>
            </div>

            {['censeur_fondamental', 'censeur_secondaire', 'directeur'].includes(formData.role) && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                <label className="block text-xs font-bold text-primary mb-1 uppercase opacity-60">
                  Année de début d'utilisation (ex: 2025-2026)
                </label>
                <input
                  type="text"
                  placeholder="2025-2026"
                  required
                  pattern="\d{4}-\d{4}"
                  title="Format requis : AAAA-AAAA (ex: 2025-2026)"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary font-bold text-xs"
                  value={formData.start_year || ''}
                  onChange={e => setFormData({ ...formData, start_year: e.target.value })}
                />
              </motion.div>
            )}

            {formData.role === 'eleve' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-xs font-bold text-primary mb-1 uppercase opacity-60">{t('register.classroom_select')}</label>
                <select 
                  required
                  className="w-full p-4 bg-gray-100 rounded-2xl outline-none focus:border-secondary border border-transparent uppercase font-bold"
                  value={formData.classroom}
                  onChange={e => setFormData({ ...formData, classroom: e.target.value })}
                >
                  <option value="">-- Chwazi Klas Ou / Sélectionner Classe --</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.level.split(' |hours:')[0]})</option>
                  ))}
                </select>
                {classrooms.length === 0 && (
                  <p className="text-[10px] text-orange-600 font-bold mt-1">
                    {i18n.language === 'fr' 
                      ? "Aucune classe n'est encore créée sur le système pour ce campus. Veuillez contacter le censeur ou le directeur." 
                      : "Pa gen okenn klas ki kreye sou sistèm nan pou campus sa a. Tanpri kontakte sansè a oswa direktè a."}
                  </p>
                )}
              </motion.div>
            )}

            {formData.role === 'professeur' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 border-t border-gray-100 pt-4 max-h-[300px] overflow-y-auto pr-1">
                <h3 className="text-xs font-black text-secondary uppercase tracking-widest">
                  {i18n.language === 'fr' ? "Disponibilité de l'enseignant" : "Disponibilite Pwofesè a"}
                </h3>
                <p className="text-[10px] text-gray-500 leading-normal">
                  {i18n.language === 'fr' 
                    ? "Cochez vos jours d'enseignement et spécifiez vos heures disponibles séparément pour chaque jour afin de nous permettre de valider votre compte." 
                    : "Koche jou ou disponib pou anseye yo epi mete lè ou disponib pou chak jou pou nou ka valide kont ou."}
                </p>

                {classrooms.length > 0 && (
                  <div className="bg-primary/5 p-3 rounded-xl text-[9px] text-primary space-y-1 font-medium">
                    <p className="font-extrabold underline">{i18n.language === 'fr' ? "Horaires de classe enregistrés :" : "Lè pou chak klas yo :"}</p>
                    {classrooms.map(c => {
                      const cleanLevel = c.level.split(' |hours:')[0];
                      const hours = c.level.includes(' |hours:') ? c.level.split(' |hours:')[1] : '07:30-13:30';
                      return (
                        <div key={c.id} className="flex justify-between font-mono">
                          <span>{c.name} ({cleanLevel}):</span>
                          <span className="font-bold">{hours.replace('-', ' - ')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map((day) => {
                  const currentDayVal = availability[day] || { available: false, startTime: '07:30', endTime: '13:30' };
                  return (
                    <div key={day} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-secondary accent-secondary rounded"
                          checked={currentDayVal.available}
                          onChange={(e) => setAvailability({
                            ...availability,
                            [day]: { ...currentDayVal, available: e.target.checked }
                          })}
                        />
                        <span className="text-xs font-black text-primary capitalize">{day}</span>
                      </label>

                      {currentDayVal.available && (
                        <div className="grid grid-cols-2 gap-2 pl-7 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-[8px] text-gray-400 font-bold uppercase">{i18n.language === 'fr' ? "De" : "Depi"}</label>
                            <input
                              type="time"
                              className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                              value={currentDayVal.startTime}
                              onChange={(e) => setAvailability({
                                ...availability,
                                [day]: { ...currentDayVal, startTime: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] text-gray-400 font-bold uppercase">{i18n.language === 'fr' ? "À" : "Jiska"}</label>
                            <input
                              type="time"
                              className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                              value={currentDayVal.endTime}
                              onChange={(e) => setAvailability({
                                ...availability,
                                [day]: { ...currentDayVal, endTime: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

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
