import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Shield, Mail, Lock, User, Check, AppWindow } from 'lucide-react';

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isFr = i18n.language === 'fr';

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'eleve',
    campus: 'fondamentale',
  });

  // Student specific class selection states
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [classLevels, setClassLevels] = useState<string[]>([]);
  
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<any>(null); // Classroom object that has selected level and code

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);

  useEffect(() => {
    const fetchExistingAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role, campus, status')
          .neq('status', 'deactivated');
        if (!error && data) {
          setExistingAccounts(data);
        }
      } catch (err) {
        console.error("Error loaded accounts:", err);
      }
    };
    fetchExistingAccounts();
  }, []);

  const isSameCampus = (c1: string, c2: string) => {
    const norm1 = (c1 || '').toLowerCase().trim();
    const norm2 = (c2 || '').toLowerCase().trim();
    const base1 = norm1 === 'fondamantal' ? 'fondamentale' : norm1;
    const base2 = norm2 === 'fondamantal' ? 'fondamentale' : norm2;
    return base1 === base2;
  };

  const getAvailableRoles = () => {
    const currentCampus = formData.campus;
    const roles = [
      { value: 'eleve', label: isFr ? "Élève" : "Elèv" },
      { value: 'professeur', label: isFr ? "Professeur" : "Pwofesè" },
    ];

    // CAPPED ROLES checks

    // DIRECTEUR: max 1 per campus
    const dirCount = existingAccounts.filter(a => a.role === 'directeur' && isSameCampus(a.campus, currentCampus)).length;
    if (dirCount < 1) {
      roles.push({ value: 'directeur', label: isFr ? "Directeur" : "Direktè" });
    }

    // CENSEUR: max 1 per campus
    const cenCount = existingAccounts.filter(a => a.role === 'censeur' && isSameCampus(a.campus, currentCampus)).length;
    if (cenCount < 1) {
      roles.push({ value: 'censeur', label: isFr ? "Censeur" : "Sansè" });
    }

    // RESP_PEDAGOGIQUE: max 1 per campus
    const rpCount = existingAccounts.filter(a => a.role === 'resp_pedagogique' && isSameCampus(a.campus, currentCampus)).length;
    if (rpCount < 1) {
      roles.push({ value: 'resp_pedagogique', label: isFr ? "Responsable Pédagogique" : "Resp. Pedagojik" });
    }

    // SECRETAIRE: max 1 total (covers both campuses)
    const secCount = existingAccounts.filter(a => a.role === 'secretaire').length;
    if (secCount < 1) {
      roles.push({ value: 'secretaire', label: isFr ? "Secrétaire" : "Sekretè" });
    }

    // RESP_DISCIPLINE: campus: fondamental only initially (max 2 total)
    if (isSameCampus(currentCampus, 'fondamentale')) {
      const rdCount = existingAccounts.filter(a => a.role === 'resp_discipline' && isSameCampus(a.campus, 'fondamentale')).length;
      if (rdCount < 2) {
        roles.push({ value: 'resp_discipline', label: isFr ? "Responsable Discipline" : "Resp. Disiplin" });
      }
    } else {
      const rdCount = existingAccounts.filter(a => a.role === 'resp_discipline' && isSameCampus(a.campus, 'secondaire')).length;
      if (rdCount < 2) {
        roles.push({ value: 'resp_discipline', label: isFr ? "Responsable Discipline" : "Resp. Disiplin" });
      }
    }

    return roles;
  };

  useEffect(() => {
    const avail = getAvailableRoles();
    const isSelectedRoleAvailable = avail.some(r => r.value === formData.role);
    if (!isSelectedRoleAvailable) {
      setFormData(prev => ({ ...prev, role: 'eleve' }));
    }
  }, [formData.campus, existingAccounts]);


  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fr' ? 'ha' : 'fr';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('i18nextLng', nextLang);
  };

  // Pre-load classrooms to allow student setup
  useEffect(() => {
    const loadClassrooms = async () => {
      try {
        const { data, error } = await supabase
          .from('classrooms')
          .select('*');
        if (!error && data) {
          setClassrooms(data);
        } else {
          // Fallback static classrooms in case DB is unprovisioned
          const mockClassrooms = [
            { id: 'c1', class_level: '9è AF', room_code: 'A', full_name: '9è AF-A', campus: 'fondamentale', max_capacity: 40 },
            { id: 'c2', class_level: '9è AF', room_code: 'B', full_name: '9è AF-B', campus: 'fondamentale', max_capacity: 40 },
            { id: 'c3', class_level: 'NS1', room_code: 'A', full_name: 'NS1-A', campus: 'secondaire', max_capacity: 35 },
            { id: 'c4', class_level: 'NS2', room_code: 'A', full_name: 'NS2-A', campus: 'secondaire', max_capacity: 35 },
            { id: 'c5', class_level: 'NS2', room_code: 'B', full_name: 'NS2-B', campus: 'secondaire', max_capacity: 35 }
          ];
          setClassrooms(mockClassrooms);
        }
      } catch (err) {
        console.error("Error loading classrooms:", err);
      }
    };
    loadClassrooms();
  }, []);

  // Compute distinct class levels for the selected campus
  useEffect(() => {
    const normalizedCampus = formData.campus === 'fondamantal' ? 'fondamentale' : formData.campus;
    const campusClassrooms = classrooms.filter(c => {
      const cCampus = c.campus === 'fondamantal' ? 'fondamentale' : c.campus;
      return cCampus === normalizedCampus;
    });
    
    // Get distinct levels
    const levels = Array.from(new Set(campusClassrooms.map(c => c.class_level))) as string[];
    setClassLevels(levels);
    setSelectedLevel('');
    setSelectedRoom(null);
  }, [formData.campus, formData.role, classrooms]);

  // Compute available chips of room code for the selected level
  const roomChips = classrooms.filter(c => {
    const nCampus = formData.campus === 'fondamantal' ? 'fondamentale' : formData.campus;
    const cCampus = c.campus === 'fondamantal' ? 'fondamentale' : c.campus;
    return cCampus === nCampus && c.class_level === selectedLevel;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Mail validation
    const emailLower = formData.email.trim().toLowerCase();
    if (!emailLower.endsWith('@codosapv.com')) {
      setError(isFr 
        ? "Seuls les emails @codosapv.com peuvent créer un compte" 
        : "Seuls les emails @codosapv.com peuvent créer un compte" // Exactly matches translation constraints
      );
      return;
    }

    if (formData.role === 'eleve' && !selectedRoom) {
      setError(isFr
        ? "Veuillez sélectionner votre classe et salle d'études."
        : "Tanpri chwazi klas ak sal ou a."
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Supabase Auth Sign Up
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: emailLower,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role,
            campus: formData.role === 'secretaire' ? 'both' : formData.campus
          }
        }
      });

      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError(isFr ? "Erreur lors de l'inscription." : "Erreur.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const finalCampus = formData.role === 'secretaire' ? 'both' : formData.campus;

      // 2. Insert into users table with 'pending' status
      const { error: userTableErr } = await supabase.from('users').insert({
        id: userId,
        email: emailLower,
        full_name: formData.full_name,
        role: formData.role,
        campus: finalCampus,
        language_preference: i18n.language === 'ha' ? 'ha' : 'fr',
        status: 'pending',
        created_at: new Date().toISOString()
      });

      if (userTableErr) {
        setError(userTableErr.message);
        setLoading(false);
        return;
      }

      // 3. If student, insert into students and student_classroom enrollment
      if (formData.role === 'eleve' && selectedRoom) {
        const studentId = userId; // student PK is user UUID or newly generated. Let's use user UUID directly or create a row in students linked by user_id
        const customCode = "STU-" + Math.floor(100000 + Math.random() * 900000);

        // check schema: students table has (id, user_id, full_name, student_id, campus). Wait, we match with users.id for students.id or users.id for user_id. Let's populate both!
        const { data: stuData, error: stuErr } = await supabase.from('students').insert({
          user_id: userId,
          full_name: formData.full_name,
          student_id: customCode,
          campus: finalCampus
        }).select().single();

        if (!stuErr && stuData) {
          // insert enrollment
          await supabase.from('student_classroom').insert({
            student_id: stuData.id,
            classroom_id: selectedRoom.id,
            academic_year: '2025-2026',
            status: 'active'
          });
        } else if (stuErr) {
          // Let's also do a direct student row insertion if students.id is FK
          await supabase.from('students').insert({
            id: userId,
            user_id: userId,
            full_name: formData.full_name,
            student_id: customCode,
            campus: finalCampus
          }).then(async r => {
            if (!r.error) {
              await supabase.from('student_classroom').insert({
                student_id: userId,
                classroom_id: selectedRoom.id,
                academic_year: '2025-2026',
                status: 'active'
              });
            }
          });
        }
      }

      setSuccess(isFr 
        ? "Votre compte est en attente de confirmation" 
        : "Votre compte est en attente de confirmation" // Matches specification perfectly
      );

    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFEFE] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Watermark */}
      <div 
        className="absolute pointer-events-none z-0 flex items-center justify-center"
        style={{ opacity: 0.10 }}
      >
        <img 
          src="/images/logo-circle.png" 
          alt="Watermark Logo" 
          className="w-[280px] h-[280px] object-contain select-none"
        />
      </div>

      {/* Language Toggle (Top Right) */}
      <button 
        onClick={toggleLanguage}
        className="absolute top-6 right-6 px-4 py-2 bg-[#010657] hover:bg-[#010657]/90 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md z-10 transition-all"
      >
        {i18n.language === 'fr' ? 'Kreyòl' : 'Français'}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl z-10 border border-gray-150"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-[#010657] mb-1 tracking-tighter">CODOSA</h1>
          <p className="text-[#09b5f2] font-black text-xs uppercase tracking-widest">
            {isFr ? "Créer un Compte" : "Kreye yon Kont"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-lg font-black text-[#010657] uppercase">
              {isFr ? "Inscription Réussie !" : "Enskripsyon Reysi !"}
            </h3>
            <p className="text-sm font-bold text-gray-600 px-2 leading-relaxed">
              {success}
            </p>
            <div className="pt-4">
              <Link 
                to="/login" 
                className="inline-block px-6 py-2.5 bg-[#010657] text-white text-xs font-black uppercase tracking-widest rounded-full hover:opacity-90 transition-all shadow-md"
              >
                {isFr ? "Retour à la connexion" : "Tounen nan koneksyon"}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Name */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                placeholder={isFr ? "Nom complet..." : "Non konplè..."}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-[#09b5f2] transition-colors rounded-2xl outline-none font-bold text-sm text-[#010657]"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            {/* Input Email */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                placeholder="Exemple: jean@codosapv.com"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-[#09b5f2] transition-colors rounded-2xl outline-none font-bold text-sm text-[#010657]"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Input Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                placeholder={isFr ? "Mot de passe..." : "Modpas..."}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-[#09b5f2] transition-colors rounded-2xl outline-none font-bold text-sm text-[#010657]"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {/* Dropdowns role and campus */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-[#010657] mb-1 uppercase opacity-60">
                  {isFr ? "Rôle" : "Wòl"}
                </label>
                <select
                  className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-xs text-[#010657] cursor-pointer"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  {getAvailableRoles().map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campus dropdown - hidden/auto-set for Secrétaire */}
              {formData.role !== 'secretaire' && (
                <div>
                  <label className="block text-[10px] font-black text-[#010657] mb-1 uppercase opacity-60">
                    {isFr ? "Campus" : "Kanpous"}
                  </label>
                  <select
                    className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-xs text-[#010657] cursor-pointer"
                    value={formData.campus}
                    onChange={e => setFormData({ ...formData, campus: e.target.value })}
                  >
                    <option value="fondamentale">{isFr ? "Fondamental" : "Fondamantal"}</option>
                    <option value="secondaire">{isFr ? "Secondaire" : "Segondè"}</option>
                  </select>
                </div>
              )}
            </div>

            {/* IF role == Client student: step-by-step classroom selector */}
            {formData.role === 'eleve' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="space-y-4 border-t border-gray-100 pt-4"
              >
                <h3 className="text-xs font-black text-[#010657] uppercase tracking-wide">
                  {isFr ? "Informations de Classe" : "Enfòmasyon sou Klas"}
                </h3>

                {/* Step 1: DISTINCT class level dropdown */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">
                    {isFr ? "Étape 1 — Sélectionner le niveau" : "Etap 1 — Chwazi nivo a"}
                  </label>
                  <select
                    className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-xs text-[#010657] cursor-pointer"
                    value={selectedLevel}
                    onChange={e => {
                      setSelectedLevel(e.target.value);
                      setSelectedRoom(null); // Reset room selection
                    }}
                  >
                    <option value="">-- {isFr ? "Niveau de classe" : "Nivo Klas"} --</option>
                    {classLevels.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Available chips of room_code only */}
                {selectedLevel && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="space-y-2"
                  >
                    <label className="block text-[10px] font-black text-gray-500 uppercase">
                      {isFr ? "Étape 2 — Choisir la Salle" : "Etap 2 — Chwazi Seksyon / Sal"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {roomChips.map((c) => {
                        const isChipSelected = selectedRoom?.id === c.id;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => setSelectedRoom(c)}
                            className={`px-4 py-2 hover:scale-[1.03] transition-all rounded-full text-xs font-black tracking-wide border cursor-pointer ${
                              isChipSelected 
                                ? 'bg-[#010657] border-[#010657] text-white shadow-sm'
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-[#010657]'
                            }`}
                          >
                            Section {c.room_code}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Real-time classroom name auto-preview */}
                {selectedRoom && (
                  <div className="bg-[#09b5f2]/10 border border-[#09b5f2]/20 text-[#010657] p-3 rounded-2xl text-xs font-bold text-center">
                    {isFr ? "Classe affectée : " : "Klas ou : "}
                    <span className="font-mono text-[#010657] text-sm bg-white px-2 py-0.5 rounded-lg border border-gray-100 shadow-xs ml-1">
                      {selectedRoom.class_level}-{selectedRoom.room_code}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#010657] text-white p-4 rounded-xl font-bold font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#010657]/95 transition-all disabled:opacity-50 select-none cursor-pointer"
            >
              {loading ? (
                <div className="loader border-t-white mx-auto"></div>
              ) : (
                isFr ? "S'inscrire" : "Kreye Kont"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-secondary hover:underline text-xs font-black uppercase tracking-wider">
            {isFr ? "Déjà inscrit ? Connectez-vous" : "Gen Kont Deja ? Konekte"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
