import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Globe, 
  User, 
  Settings, 
  ShieldCheck, 
  ChevronRight, 
  GraduationCap,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Users,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface Classroom {
  id: string;
  name: string;
  full_name?: string;
  level: string;
  section: string;
  capacity: number;
}

interface Student {
  id: string;
  full_name: string;
  student_code: string;
  classroom_id: string | null;
}

export default function Account() {
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isFr = i18n.language === 'fr';

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ha' ? 'fr' : 'ha');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Visibility constraints
  const canStartNewYear = ['directeur', 'censeur', 'super_admin'].includes(profile?.role || '');
  const isAdmin = ['super_admin', 'directeur'].includes(profile?.role || '');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Checked room IDs -> true to keep, false to delete
  const [checkedRooms, setCheckedRooms] = useState<Record<string, boolean>>({});

  // Step 2: Student decisions for deleted rooms -> studentId -> { action: 'promote' | 'deactivate', targetClassId?: string }
  const [studentDecisions, setStudentDecisions] = useState<Record<string, { action: 'promote' | 'deactivate'; targetClassId?: string }>>({});

  // Step 3: Text input for next academic year
  const [nextYearLabel, setNextYearLabel] = useState('');

  const activeCampus = profile?.campus || 'fondamantal';
  const cleanCampus = activeCampus === 'fondamantal' || activeCampus === 'fondamentale' ? 'fondamantal' : 'secondaire';

  // Open modal and load classrooms + students
  const handleOpenModal = async () => {
    setLoading(true);
    setError('');
    setStep(1);
    setStudentDecisions({});
    setNextYearLabel('');

    try {
      // 1. Load Salles
      let rooms: Classroom[] = [];
      try {
        const { data } = await supabase
          .from('classrooms')
          .select('*')
          .eq('campus', cleanCampus);
        if (data) rooms = data;
      } catch (e) {
        console.warn("Supabase classrooms error inside account, fallback:", e);
      }

      if (rooms.length === 0) {
        const saved = localStorage.getItem(`codosa_classrooms_${cleanCampus}`);
        if (saved) rooms = JSON.parse(saved);
      }
      setClassrooms(rooms);

      // Default all to check (keep)
      const initialChecked: Record<string, boolean> = {};
      rooms.forEach(r => {
        initialChecked[r.id] = true;
      });
      setCheckedRooms(initialChecked);

      // 2. Load Students
      let studs: Student[] = [];
      try {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('campus', cleanCampus);
        if (data) studs = data;
      } catch (e) {
        console.warn("Supabase students error inside account, fallback", e);
      }

      if (studs.length === 0) {
        const saved = localStorage.getItem(`codosa_students_${cleanCampus}`);
        if (saved) studs = JSON.parse(saved);
      }
      setStudents(studs);

      // Guess next logical academic year (e.g. 2025-2026 -> 2026-2027)
      const currentYearStr = localStorage.getItem('codosa_active_academic_year') || '2025-2026';
      const match = currentYearStr.match(/(\d{4})-(\d{4})/);
      if (match) {
        const nextStart = parseInt(match[1]) + 1;
        const nextEnd = parseInt(match[2]) + 1;
        setNextYearLabel(`${nextStart}-${nextEnd}`);
      } else {
        setNextYearLabel('2026-2027');
      }

      setShowModal(true);
    } catch (err: any) {
      setError(err.message || "Failed loading data");
    } finally {
      setLoading(false);
    }
  };

  // Toggle classroom check state
  const handleToggleRoom = (roomId: string) => {
    setCheckedRooms(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  // Unchecked classrooms representing classrooms to be DELETED
  const deletedClassrooms = classrooms.filter(r => !checkedRooms[r.id]);
  const keptClassrooms = classrooms.filter(r => checkedRooms[r.id]);

  // Students directly affected by deleted classrooms
  const affectedStudents = students.filter(s => s.classroom_id && !checkedRooms[s.classroom_id]);

  // Handle student action update
  const handleSetStudentAction = (studentId: string, action: 'promote' | 'deactivate', targetClassId?: string) => {
    setStudentDecisions(prev => ({
      ...prev,
      [studentId]: { action, targetClassId: targetClassId || prev[studentId]?.targetClassId }
    }));
  };

  // Advance step verification
  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (deletedClassrooms.length > 0 && affectedStudents.length > 0) {
        // Prepare default actions for affected students
        const initialActions: Record<string, { action: 'promote' | 'deactivate'; targetClassId?: string }> = { ...studentDecisions };
        affectedStudents.forEach(student => {
          if (!initialActions[student.id]) {
            // Default to promote to first kept classroom if exists, else deactivate
            initialActions[student.id] = keptClassrooms.length > 0 
              ? { action: 'promote', targetClassId: keptClassrooms[0].id }
              : { action: 'deactivate' };
          }
        });
        setStudentDecisions(initialActions);
        setStep(2);
      } else {
        // No students affected, skip directly to step 3
        setStep(3);
      }
    } else if (step === 2) {
      // Validate that each affected student has a decision
      const missing = affectedStudents.some(s => {
        const dec = studentDecisions[s.id];
        return !dec || (dec.action === 'promote' && !dec.targetClassId);
      });

      if (missing) {
        setError(isFr 
          ? "Veuillez spécifier une action et une classe pour chaque élève." 
          : "Tanpri chwazi yon aksyon ak yon nouvo klas pou chak elèv."
        );
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      if (deletedClassrooms.length > 0 && affectedStudents.length > 0) {
        setStep(2);
      } else {
        setStep(1);
      }
    }
  };

  // Execute entire new year transition
  const handleFinalConfirm = async () => {
    if (!nextYearLabel.trim()) {
      setError("Veuillez saisir le label de la nouvelle année académique");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const yearLabel = nextYearLabel.trim();
      const staffName = profile?.full_name || 'Staff Member';

      // 1. DELETE discipline_logs for old year (same as year-end reset)
      try {
        const oldAcademicYear = localStorage.getItem('codosa_active_academic_year') || '2025-2026';
        await supabase
          .from('discipline_logs')
          .delete()
          .eq('campus', cleanCampus)
          .eq('academic_year', oldAcademicYear);
      } catch (err) {
        console.warn("Delete old discipline logs Supabase warning:", err);
      }

      // 2. MOVE students & update student_classroom mappings (for both promoted and deactivated)
      const updatedStudents = [...students];
      const updatedSClassrooms = []; // We will create new active mappings for next academic year!

      for (const student of students) {
        const decision = studentDecisions[student.id];
        let nextClassId: string | null = student.classroom_id;
        let mappingStatus: 'active' | 'inactive' | 'alumni' = 'active';

        if (student.classroom_id && !checkedRooms[student.classroom_id]) {
          // Affected by deletion
          if (decision?.action === 'promote' && decision.targetClassId) {
            nextClassId = decision.targetClassId;
            mappingStatus = 'active';
          } else {
            nextClassId = null;
            mappingStatus = 'alumni'; // deactivate account and mark as alumni
          }
        }

        // Apply changes to supabse
        try {
          if (student.classroom_id !== nextClassId) {
            await supabase
              .from('students')
              .update({ classroom_id: nextClassId })
              .eq('id', student.id);

            const targetClassName = nextClassId 
              ? classrooms.find(c => c.id === nextClassId)?.name || 'N/A'
              : null;
            
            await supabase
              .from('users')
              .update({ classroom: targetClassName })
              .eq('id', student.id);
          }

          // Insert new student_classroom history
          await supabase
            .from('student_classroom')
            .insert({
              student_id: student.id,
              classroom_id: nextClassId,
              academic_year: yearLabel,
              status: mappingStatus
            });
        } catch (err) {
          console.warn("Supabase student move warning:", err);
        }

        // Local State
        if (student.classroom_id !== nextClassId) {
          const sIdx = updatedStudents.findIndex(us => us.id === student.id);
          if (sIdx > -1) {
            updatedStudents[sIdx].classroom_id = nextClassId;
          }
        }

        updatedSClassrooms.push({
          id: crypto.randomUUID(),
          student_id: student.id,
          classroom_id: nextClassId || 'deleted',
          academic_year: yearLabel,
          status: mappingStatus
        });
      }

      // 3. DELETE unchecked classrooms
      const updatedClassrooms = classrooms.filter(r => checkedRooms[r.id]);
      for (const roomToDelete of deletedClassrooms) {
        try {
          await supabase
            .from('classrooms')
            .delete()
            .eq('id', roomToDelete.id);
        } catch (err) {
          console.warn("Classroom delete Supabase warning:", err);
        }
      }

      // 4. Update memory and local storage sources of truth
      setClassrooms(updatedClassrooms);
      localStorage.setItem(`codosa_classrooms_${cleanCampus}`, JSON.stringify(updatedClassrooms));
      
      setStudents(updatedStudents);
      localStorage.setItem(`codosa_students_${cleanCampus}`, JSON.stringify(updatedStudents));

      localStorage.setItem(`codosa_student_classroom_${cleanCampus}`, JSON.stringify(updatedSClassrooms));

      // 5. Update global academic year value
      localStorage.setItem('codosa_active_academic_year', yearLabel);

      // 6. Log transition event
      const logEntry = {
        timestamp: new Date().toISOString(),
        staffName,
        action: `Transition to ${yearLabel}`,
        campus: cleanCampus,
        details: `${keptClassrooms.length} rooms kept, ${deletedClassrooms.length} deleted`
      };
      const existingLogs = JSON.parse(localStorage.getItem('codosa_academic_year_logs') || '[]');
      existingLogs.push(logEntry);
      localStorage.setItem('codosa_academic_year_logs', JSON.stringify(existingLogs));

      setSuccess(isFr 
        ? `L'année académique ${yearLabel} a été lancée avec succès !` 
        : `Nouvo ane akademik ${yearLabel} lan louvri avèk siksè!`
      );
      
      // Close modal
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        window.location.reload(); // Refresh to ensure all tabs and stats update correctly
      }, 3000);

    } catch (e: any) {
      setError(e.message || "Impossible de terminer la transition");
    } finally {
      setLoading(false);
    }
  };

  const currentAcademicYear = localStorage.getItem('codosa_active_academic_year') || '2025-2026';

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
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

      {/* Language, updates, admin actions panel */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-50 space-y-2">
        <button 
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group text-left"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-accent/10 p-3 rounded-xl text-accent"><Globe size={20} /></div>
            <span className="font-bold text-primary opacity-80">{t('lang_toggle')}</span>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-secondary transition-all" />
        </button>

        {profile?.role === 'professeur' && (
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group text-left">
            <div className="flex items-center space-x-4">
              <div className="bg-secondary/10 p-3 rounded-xl text-secondary"><Settings size={20} /></div>
              <span className="font-bold text-primary opacity-80">{t('account.update_profile')}</span>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-secondary transition-all" />
          </button>
        )}

        {isAdmin && (
          <button className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-2xl transition-all shadow-lg active:scale-[0.98] text-left">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl"><ShieldCheck size={20} /></div>
              <span className="font-bold uppercase tracking-widest text-xs">{t('account.admin_panel')}</span>
            </div>
            <ChevronRight size={18} className="opacity-40" />
          </button>
        )}

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition-all group mt-4 text-left"
        >
          <div className="flex items-center space-x-4 text-red-500">
            <div className="bg-red-500/10 p-3 rounded-xl"><LogOut size={20} /></div>
            <span className="font-bold">{t('account.logout')}</span>
          </div>
        </button>
      </div>

      {/* New Academic Year Panel - styled in #fac900 with #010657 text */}
      {canStartNewYear && (
        <section className="bg-[#fac900] p-6 rounded-[2.5rem] shadow-xl border-4 border-white relative overflow-hidden text-left">
          <GraduationCap className="absolute -bottom-4 -right-4 w-24 h-24 text-[#010657] opacity-10" />
          <h3 className="text-[#010657] font-black uppercase text-xs tracking-widest mb-2">{t('account.academic_actions')}</h3>
          <p className="text-[#010657]/80 text-sm font-medium mb-4">
            {isFr 
              ? `Préparez l'année suivante. Configurez les salles conservées et promouvez ou désactivez les élèves, tout en réinitialisant les historiques pour l'année courante (${currentAcademicYear}).` 
              : `Prepare ane ki ap vini lan. Konsève sallen yo epi pwomouvwa oswa dezaktive elèv yo pou ane akademik ${currentAcademicYear} la.`
            }
          </p>
          <button 
            onClick={handleOpenModal}
            className="bg-[#010657] text-[#fac900] w-full py-3.5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] shadow-md hover:opacity-95 active:scale-[0.97] transition-all text-center"
          >
             {t('account.new_academic_year')}
          </button>
        </section>
      )}

      {/* MULTI_STEP TRANSITION ACADEMIC YEAR MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-primary transition-colors rounded-full"
              >
                <X size={18} />
              </button>

              {/* Title & Step Header */}
              <div className="border-b border-gray-100 pb-4 mb-6">
                <span className="text-[10px] font-black uppercase text-[#09b5f2] tracking-widest">
                  Assistant Année Académique • Étape {step}/3
                </span>
                <h2 className="text-xl font-black text-primary uppercase mt-1">
                  {isFr ? "Changement d'Année Académique" : "Tranzisyon Ane Akademik"}
                </h2>
              </div>

              {/* Error and Success notifications inside modal */}
              {error && (
                <div className="mb-4 bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-bold border border-red-100 flex items-start space-x-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 bg-green-50 text-green-700 p-3.5 rounded-xl text-xs font-bold border border-green-100 flex items-start space-x-2 animate-bounce">
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* STEP 1: REVIEW CLASSROOMS TO CONSERVE */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <h3 className="font-extrabold text-sm text-[#010657] uppercase mb-1">Sélectionnez les classes à conserver</h3>
                      <p className="text-xs text-gray-500 leading-normal">
                        Cochez les salles de classe physiques qui resteront actives d'un point de vue logistique pour la nouvelle année. 
                        Les salles décochées seront supprimées et leurs élèves devront être relocalisés à l'étape suivante.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {classrooms.map((room) => {
                        const isChecked = !!checkedRooms[room.id];
                        const studCount = students.filter(s => s.classroom_id === room.id).length;
                        return (
                          <div 
                            key={room.id}
                            onClick={() => handleToggleRoom(room.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between select-none ${
                              isChecked 
                                ? 'bg-secondary/5 border-secondary ring-2 ring-secondary/5' 
                                : 'bg-white border-gray-200 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-extrabold text-sm text-[#010657] uppercase leading-none">{room.name || room.full_name}</p>
                              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Niveau: {room.level} • {studCount} élèves</p>
                            </div>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // toggled by parent div click
                              className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary cursor-pointer shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2: RELOCATE STUDENTS FROM DELETED ROOMS */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                      <h3 className="font-bold text-orange-700 text-sm uppercase mb-1">
                        Élèves à affecter ({affectedStudents.length})
                      </h3>
                      <p className="text-xs text-orange-600 leading-normal">
                        Les salles d'origine de ces élèves ont été décochées pour la suppression. 
                        Indiquez s'ils doivent être promus dans une autre salle existante ou s'ils ont quitté l'école.
                      </p>
                    </div>

                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 divide-y divide-gray-100">
                      {deletedClassrooms.map((room) => {
                        const roomStudents = students.filter(s => s.classroom_id === room.id);
                        if (roomStudents.length === 0) return null;
                        
                        return (
                          <div key={room.id} className="pt-4 first:pt-0 space-y-3">
                            <h4 className="font-black text-xs uppercase text-red-500">
                              Salle supprimée : {room.name || room.full_name}
                            </h4>
                            
                            <div className="space-y-3 pl-2">
                              {roomStudents.map((stud) => {
                                const decision = studentDecisions[stud.id] || { action: 'deactivate' };
                                return (
                                  <div key={stud.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                                    <div>
                                      <p className="font-extrabold text-sm text-primary uppercase leading-tight">{stud.full_name}</p>
                                      <p className="font-mono text-[9px] text-gray-400 mt-0.5">Code: {stud.student_code}</p>
                                    </div>

                                    {/* Action Selectors */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                                      <label className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name={`action_${stud.id}`}
                                          checked={decision.action === 'promote'}
                                          onChange={() => handleSetStudentAction(stud.id, 'promote', keptClassrooms[0]?.id || '')}
                                          className="text-[#010657] focus:ring-[#010657] w-4 h-4"
                                        />
                                        <span className="text-xs font-bold text-primary">Promouvoir</span>
                                      </label>

                                      <label className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name={`action_${stud.id}`}
                                          checked={decision.action === 'deactivate'}
                                          onChange={() => handleSetStudentAction(stud.id, 'deactivate', '')}
                                          className="text-[#010657] focus:ring-[#010657] w-4 h-4"
                                        />
                                        <span className="text-xs font-bold text-red-500">N'est plus à l'école</span>
                                      </label>

                                      {/* Dropdown if promoted */}
                                      {decision.action === 'promote' && keptClassrooms.length > 0 && (
                                        <select
                                          value={decision.targetClassId || ''}
                                          onChange={(e) => handleSetStudentAction(stud.id, 'promote', e.target.value)}
                                          className="p-1 px-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                                        >
                                          {keptClassrooms.map(kRoom => (
                                            <option key={kRoom.id} value={kRoom.id}>{kRoom.name || kRoom.full_name}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: REVIEW SUMMARY & CONFIRM LABEL */}
                {step === 3 && (
                  <div className="space-y-5 text-left">
                    <div className="bg-[#010657]/5 border border-[#010657]/10 p-5 rounded-2xl space-y-3">
                      <h3 className="font-extrabold text-[#010657] uppercase text-sm flex items-center gap-1">
                        📊 Résumé de la transition
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 pt-1.5 text-xs text-primary font-bold">
                        <div className="bg-white p-3.5 border border-gray-150 rounded-xl space-y-1">
                          <p className="text-green-600 font-black text-lg">{keptClassrooms.length}</p>
                          <p className="text-gray-400 font-medium">Classes conservées</p>
                        </div>

                        <div className="bg-white p-3.5 border border-gray-150 rounded-xl space-y-1">
                          <p className="text-red-500 font-black text-lg">{deletedClassrooms.length}</p>
                          <p className="text-gray-400 font-medium">Classes supprimées</p>
                        </div>

                        <div className="bg-white p-3.5 border border-gray-150 rounded-xl space-y-1">
                          <p className="text-indigo-600 font-black text-lg">
                            {Object.values(studentDecisions).filter((d: any) => d.action === 'promote').length}
                          </p>
                          <p className="text-gray-400 font-medium font-bold">Élèves promus</p>
                        </div>

                        <div className="bg-white p-3.5 border border-gray-150 rounded-xl space-y-1">
                          <p className="text-orange-500 font-black text-lg">
                            {Object.values(studentDecisions).filter((d: any) => d.action === 'deactivate').length}
                          </p>
                          <p className="text-gray-400 font-medium">Élèves sortis de l'école (devenus Alumnis)</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                        Label de la Nouvelle Année Académique (ex: 2026-2027)
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: 2026-2027"
                        className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-2xl outline-none font-black text-sm text-primary uppercase"
                        value={nextYearLabel}
                        onChange={(e) => setNextYearLabel(e.target.value)}
                      />
                      <span className="text-[10px] text-gray-400 block leading-normal">
                        La validation de cette étape réinitialisera l'historique des relevés d'exclusion et d'indiscipline pour l'année précédente, créera l'année académique, et affectera de manière définitive les élèves à leurs nouvelles classes.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation Actions Bar */}
              <div className="border-t border-gray-150 pt-5 mt-6 flex justify-between items-center bg-white z-10 shrink-0">
                {step > 1 ? (
                  <button
                    onClick={handlePrevStep}
                    disabled={loading}
                    className="flex items-center space-x-1 p-3 px-5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-bold uppercase transition"
                  >
                    <ChevronLeft size={16} />
                    <span>Retour</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-3 px-5 rounded-xl border border-gray-150 text-gray-400 hover:bg-gray-50 text-xs font-bold uppercase transition"
                  >
                    Annuler
                  </button>
                )}

                {step < 3 ? (
                  <button
                    onClick={handleNextStep}
                    className="bg-[#010657] text-white p-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow"
                  >
                    Suivant
                  </button>
                ) : (
                  <button
                    onClick={handleFinalConfirm}
                    disabled={loading}
                    className="bg-[#010657] text-white p-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow flex items-center space-x-2"
                  >
                    <span>Lancer la Nouvelle Année</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="text-center pt-8 pb-4">
         <p className="text-[10px] font-black text-primary opacity-20 uppercase tracking-[0.3em]">CODOSA v1.0.0 • AI Powered</p>
      </footer>
    </div>
  );
}
