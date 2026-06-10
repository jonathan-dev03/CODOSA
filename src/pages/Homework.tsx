import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Book, 
  Calendar, 
  ChevronRight, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Filter, 
  Check, 
  X, 
  User, 
  BookOpen, 
  Clock, 
  Search,
  MessageSquare,
  Award,
  ClipboardList
} from 'lucide-react';
import clsx from 'clsx';

export default function Homework() {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language === 'fr';
  const { profile } = useAuth();
  
  // Dynamic alerts/reminders state
  const [alertMessage, setAlertMessage] = useState('');

  // Primary Lists
  const [homework, setHomework] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for pedagogical leader
  const [teacherFilter, setTeacherFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');

  // "Ajouter Devoir" Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSubject, setNewSubject] = useState('Mathématiques');
  const [newClassId, setNewClassId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // "Marquer" Scoring/Grading Dashboard States
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any | null>(null);
  const [scoringStudents, setScoringStudents] = useState<any[]>([]);
  const [scoringLoading, setScoringLoading] = useState(false);
  
  // Scaffold grade ratings & comments map
  // Key: studentId, Value: { is_completed: boolean, grade_or_remarks: string }
  const [scoringData, setScoringData] = useState<Record<string, { is_completed: boolean, grade_or_remarks: string }>>({});
  const [scoringSuccess, setScoringSuccess] = useState('');

  const isProfessor = profile?.role === 'professeur';
  const isPedagogique = profile?.role === 'resp_pedagogique';
  const isStudent = profile?.role === 'eleve';

  // Request browser push notification on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const triggerBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/icon.png' });
      } catch (e) {
        console.warn("Could not trigger native browser check:", e);
      }
    }
  };

  useEffect(() => {
    fetchClassrooms();
    fetchTeachers();
  }, [profile]);

  useEffect(() => {
    fetchHomework();
  }, [profile, teacherFilter, classFilter, dateFilter]);

  const fetchClassrooms = async () => {
    try {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .order('name');
      if (data) setClassrooms(data);
    } catch (e) {
      console.error("Error loaded classrooms", e);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'professeur');
      if (data) setTeachers(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHomework = async () => {
    setLoading(true);
    try {
      let query = supabase.from('homework').select('*, classrooms(id, name), professor:users!homework_professor_id_fkey(full_name)');
      
      const userCampus = profile?.campus || 'fondamantal';
      const cleanCampus = userCampus === 'fondamantal' || userCampus === 'fondamentale' ? 'fondamantal' : 'secondaire';

      // 1. Role-based constraints
      if (isProfessor) {
        query = query.eq('professor_id', profile.id);
      } else if (isStudent) {
        // Find Student classroom matching the profile’s classroom parameter
        const studentRoom = classrooms.find(c => c.name.toLowerCase() === (profile?.classroom || '').toLowerCase());
        if (studentRoom) {
          query = query.eq('classroom_id', studentRoom.id);
        } else {
          query = query.eq('campus', cleanCampus);
        }
      } else {
        // Pedago or Admins see campus-wide homework
        query = query.eq('campus', cleanCampus);
      }

      // 2. Filter criteria for leaders
      if (isPedagogique) {
        if (teacherFilter) {
          query = query.eq('professor_id', teacherFilter);
        }
        if (classFilter) {
          query = query.eq('classroom_id', classFilter);
        }
      }

      // 3. Execution & Sorting
      const { data: hwData, error } = await query.order('due_date', { ascending: true });
      if (hwData) {
        // Filter by Date limit clientside if needed
        let filtered = hwData;
        const now = new Date();
        if (dateFilter === 'week') {
          const sevenDays = new Date();
          sevenDays.setDate(now.getDate() + 7);
          filtered = hwData.filter(h => new Date(h.due_date) <= sevenDays);
        } else if (dateFilter === 'month') {
          const thirtyDays = new Date();
          thirtyDays.setDate(now.getDate() + 30);
          filtered = hwData.filter(h => new Date(h.due_date) <= thirtyDays);
        }

        setHomework(filtered);

        // Fetch completional entries
        const { data: compData } = await supabase
          .from('homework_completions')
          .select('*');
        
        const comps = compData || [];
        setCompletions(comps);

        // Run alert/reminder checking
        checkNotificationsAndAlerts(filtered, comps);
      }
    } catch (e) {
      console.error("Error loaded homeworks:", e);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationsAndAlerts = (hwList: any[], comps: any[]) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find any homework due tomorrow on user’s view
    const urgentHw = hwList.filter(h => h.due_date === tomorrowStr);
    
    if (urgentHw.length > 0) {
      let title = "";
      let body = "";
      
      if (isStudent) {
        // Fetch current active student completions to check if uncompleted
        const uncompletedUrgent = urgentHw.filter(h => {
          const comp = comps.find(c => c.homework_id === h.id);
          return !comp || !comp.is_completed;
        });

        if (uncompletedUrgent.length > 0) {
          title = "Rappel Devoir Urgent";
          body = `Vous avez le devoir "${uncompletedUrgent[0].title}" en ${uncompletedUrgent[0].subject} à rendre demain !`;
          setAlertMessage(`⚠️ Rappel de devoir urgent à rendre demain : [${uncompletedUrgent[0].subject}] "${uncompletedUrgent[0].title}"`);
        }
      } else if (isProfessor) {
        title = "Rappel écheance de devoir";
        body = `Votre devoir "${urgentHw[0].title}" pour class "${urgentHw[0].classrooms?.name || 'classe'}" arrive à échéance demain.`;
        setAlertMessage(`📌 Votre devoir "${urgentHw[0].title}" pour la classe ${urgentHw[0].classrooms?.name || ''} expire demain !`);
      } else if (isPedagogique) {
        title = "Unified Campus Alert";
        body = `Il y a ${urgentHw.length} devoirs programmés sur le campus pour demain.`;
        setAlertMessage(`📢 Surveillance : Il y a ${urgentHw.length} devoirs d'enseignants à rendre pour demain sur le campus.`);
      }

      // Fire HTML5 push notification once a day per logged-in session
      const dateKey = today.toISOString().split('T')[0];
      const notifiedKey = `codosa_homework_notify_${profile?.id}_${dateKey}`;
      if (title && body && !localStorage.getItem(notifiedKey)) {
        triggerBrowserNotification(title, body);
        localStorage.setItem(notifiedKey, 'true');
      }
    } else {
      setAlertMessage('');
    }
  };

  // Submit new Homework
  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newClassId || !newDueDate) {
      setFormError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const userCampus = profile?.campus || 'fondamantal';
      const cleanCampus = userCampus === 'fondamantal' || userCampus === 'fondamentale' ? 'fondamantal' : 'secondaire';

      const { error } = await supabase
        .from('homework')
        .insert({
          title: newTitle,
          description: newDescription,
          subject: newSubject,
          classroom_id: newClassId,
          due_date: newDueDate,
          professor_id: profile?.id,
          campus: cleanCampus
        });

      if (error) throw error;

      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      
      // Reload lists
      fetchHomework();
    } catch (err: any) {
      setFormError("Erreur lors de la création : " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Load Scoring Panel for Homework
  const handleOpenMarkDashboard = async (item: any) => {
    setSelectedHomework(item);
    setShowMarkModal(true);
    setScoringLoading(true);
    setScoringSuccess('');
    setScoringData({});

    try {
      // Fetch students for classroom
      const { data: dbStudents } = await supabase
        .from('students')
        .select('*')
        .eq('classroom_id', item.classroom_id)
        .order('full_name');

      let list = dbStudents || [];
      
      // Fallback for empty class list in demo workspace
      if (list.length === 0) {
        list = [
          { id: 'mock-s1', full_name: 'Jean Gabriel', student_code: 'COD-102' },
          { id: 'mock-s2', full_name: 'Daphney Lamy', student_code: 'COD-115' },
          { id: 'mock-s3', full_name: 'Samuel Etienne', student_code: 'COD-221' },
          { id: 'mock-s4', full_name: 'Naïka Joseph', student_code: 'COD-105' }
        ];
      }
      setScoringStudents(list);

      // Fetch existing completions
      const { data: dbComps } = await supabase
        .from('homework_completions')
        .select('*')
        .eq('homework_id', item.id);

      const mapping: Record<string, { is_completed: boolean, grade_or_remarks: string }> = {};
      list.forEach((s: any) => {
        const found = dbComps?.find((c: any) => c.student_id === s.id);
        mapping[s.id] = {
          is_completed: found ? found.is_completed : false,
          grade_or_remarks: found ? found.grade_or_remarks || '' : ''
        };
      });

      setScoringData(mapping);
    } catch (e) {
      console.error(e);
    } finally {
      setScoringLoading(false);
    }
  };

  // Save Scoring Results
  const handleSaveScoring = async () => {
    if (!selectedHomework) return;
    setScoringLoading(true);
    setScoringSuccess('');

    try {
      const promises = Object.entries(scoringData).map(async ([studentId, data]: [string, any]) => {
        // Query if completion row already exists
        const { data: existing } = await supabase
          .from('homework_completions')
          .select('id')
          .eq('homework_id', selectedHomework.id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (existing?.id) {
          return supabase
            .from('homework_completions')
            .update({
              is_completed: data.is_completed,
              status: data.is_completed ? 'completed' : 'pending',
              grade_or_remarks: data.grade_or_remarks,
              completed_by_student_or_teacher_id: profile?.id,
              completed_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          return supabase
            .from('homework_completions')
            .insert({
              homework_id: selectedHomework.id,
              student_id: studentId,
              is_completed: data.is_completed,
              status: data.is_completed ? 'completed' : 'pending',
              grade_or_remarks: data.grade_or_remarks,
              completed_by_student_or_teacher_id: profile?.id,
              completed_at: new Date().toISOString()
            });
        }
      });

      await Promise.all(promises);
      setScoringSuccess("Notes et évaluations sauvegardées avec succès !");
      
      // Refresh completions list
      await fetchHomework();

      setTimeout(() => {
        setShowMarkModal(false);
        setSelectedHomework(null);
      }, 1500);

    } catch (err) {
      console.error(err);
      setScoringSuccess("Erreur durant la sauvegarde.");
    } finally {
      setScoringLoading(false);
    }
  };

  // Helper: check completion of homework for current user role or mock students
  const getCompletionStatus = (hwId: string) => {
    // If student, we find their completion log
    if (isStudent) {
      const studentMatch = scoringStudents.find(s => s.full_name === profile?.full_name);
      const sId = studentMatch?.id || 'mock-s1';
      return completions.find(c => c.homework_id === hwId && c.student_id === sId);
    }
    return null;
  };

  // Spot Teachers who forgets to assign work
  const getTeachersWithoutHomework = () => {
    const assignedTeacherIds = Array.from(new Set(homework.map(h => h.professor_id)));
    return teachers.filter(t => !assignedTeacherIds.includes(t.id));
  };

  const teachersWithoutHw = getTeachersWithoutHomework();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* Alert Notification Bar */}
      {alertMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 text-yellow-800">
            <AlertTriangle className="shrink-0" size={20} />
            <span className="text-sm font-bold">{alertMessage}</span>
          </div>
          <button onClick={() => setAlertMessage('')} className="text-yellow-600 hover:text-yellow-900 font-extrabold text-xs">
            <X size={18} />
          </button>
        </motion.div>
      )}

      {/* Main Header Container */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight uppercase flex items-center space-x-2">
            <ClipboardList className="text-secondary" size={32} />
            <span>{isFr ? "Cahier de Devoir" : "Kaye Devwa"}</span>
          </h2>
          <p className="text-xs text-primary/60 font-bold uppercase mt-1">
            {profile?.role} | {isFr ? "Collège Dominique Savio" : "Kolèj Dominique Savio"}
          </p>
        </div>

        {isProfessor && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-secondary text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg scale-hover active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Assigner un Devoir</span>
          </button>
        )}
      </header>

      {/* Filters for pedagogical list */}
      {isPedagogique && (
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-50">
            <Filter size={16} className="text-secondary" />
            <h4 className="text-[10px] uppercase tracking-widest font-black text-primary">Panneau de Contrôle & Surveillance</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Teacher filter */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Filtrer par Enseignant :</label>
              <select 
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="p-3 bg-gray-50 border border-transparent hover:border-gray-100 font-bold text-xs rounded-xl text-primary outline-none focus:border-secondary transition-all"
              >
                <option value="">Tous les professeurs</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            {/* Class filter */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Filtrer par Classe :</label>
              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="p-3 bg-gray-50 border border-transparent hover:border-gray-100 font-bold text-xs rounded-xl text-primary outline-none focus:border-secondary transition-all"
              >
                <option value="">Toutes les classes</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date filter */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Échéance :</label>
              <div className="flex bg-gray-50 p-1.5 rounded-xl border border-transparent">
                {(['all', 'week', 'month'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDateFilter(opt)}
                    className={clsx(
                      "flex-1 py-1.5 text-[9px] uppercase font-black tracking-widest rounded-lg transition-all",
                      dateFilter === opt ? "bg-white text-secondary shadow-smScale" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {opt === 'all' ? "Tout" : opt === 'week' ? "7 Jours" : "30 Jours"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* spot forgetting teachers alarm */}
          {!teacherFilter && teachersWithoutHw.length > 0 && (
            <div className="bg-red-50 p-4 rounded-xl border-l-4 border-red-500">
              <h5 className="text-[10px] uppercase tracking-widest font-black text-red-700">⚠️ Enseignants sans devoir assigné cette semaine :</h5>
              <div className="flex flex-wrap gap-2 mt-2">
                {teachersWithoutHw.map(t => (
                  <span key={t.id} className="text-[9px] font-bold bg-white text-red-700 border border-red-200 px-2 py-0.5 rounded-md uppercase">
                    {t.full_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Homework Grid Layout */}
      <main className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="loader"></div></div>
        ) : homework.length === 0 ? (
          <div className="bg-white p-16 rounded-[2rem] border border-gray-100 text-center shadow-sm">
            <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-400 uppercase font-black tracking-widest text-xs">Pa gen okenn devwa ki pwograme.</p>
            <p className="text-xs text-gray-300 font-semibold mt-1">Aucun travail enregistré pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homework.map((item) => {
              const comp = getCompletionStatus(item.id);
              const isCompleted = comp ? comp.is_completed : false;
              
              const todayStr = new Date().toISOString().split('T')[0];
              const isOverdue = new Date(item.due_date) < new Date(todayStr) && !isCompleted;

              return (
                <motion.article 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={clsx(
                    "bg-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between transition-all relative border",
                    isOverdue ? "border-red-500 border-2 shadow-red-50" : "border-gray-100 hover:border-secondary/30"
                  )}
                >
                  <div>
                    {/* Header Details */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black uppercase text-secondary bg-secondary/10 px-2.5 py-1 rounded-full tracking-widest">
                        {item.subject}
                      </span>
                      
                      <div className={clsx(
                        "flex items-center space-x-1 font-black uppercase text-[10px]",
                        isOverdue ? "text-red-600 animate-pulse" : "text-gray-500"
                      )}>
                        <Calendar size={13} />
                        <span>{new Date(item.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-black text-primary leading-tight uppercase mb-2">
                      {item.title}
                    </h3>
                    
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-6 font-medium">
                      {item.description || "Aucune description fournie par le professeur pour ce devoir."}
                    </p>
                  </div>

                  {/* Actions & Footers */}
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 block uppercase">CLASSE :</span>
                      <span className="text-xs font-black text-primary uppercase">{item.classrooms?.name || "Tout Klas"}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Checkmarks / Badging for students */}
                      {isStudent && (
                        isCompleted ? (
                          <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center space-x-1">
                            <Check size={12} />
                            <span>Remis</span>
                          </span>
                        ) : (
                          isOverdue ? (
                            <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center space-x-1">
                              <X size={12} />
                              <span>En retard</span>
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center space-x-1">
                              <Clock size={12} />
                              <span>À faire</span>
                            </span>
                          )
                        )
                      )}

                      {/* Score display if graded */}
                      {comp?.grade_or_remarks && (
                        <div className="bg-primary/5 p-2 rounded-xl text-right">
                          <span className="text-[8px] font-extrabold uppercase block text-primary/40">ÉVALUATION</span>
                          <span className="text-[10px] font-black text-primary uppercase">{comp.grade_or_remarks}</span>
                        </div>
                      )}

                      {/* Marking dashboard call helper for teachers */}
                      {(isProfessor || isPedagogique) && (
                        <button 
                          onClick={() => handleOpenMarkDashboard(item)}
                          className="bg-primary hover:bg-secondary text-white px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                          Marquer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Teacher Name footnote for leaders */}
                  {isPedagogique && item.professor?.full_name && (
                    <div className="mt-3 bg-gray-50 p-2 rounded-xl flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-gray-400">PROFESSEUR :</span>
                      <span className="text-[9px] font-black text-primary uppercase">{item.professor.full_name}</span>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL 1: ADD HOMEWORK (Professor only) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 overflow-hidden shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <h3 className="font-black uppercase text-md text-primary flex items-center space-x-2">
                  <BookOpen size={20} className="text-secondary" />
                  <span>Programmer un Nouveau Devoir</span>
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 p-3 rounded-xl flex items-center space-x-2 text-red-600 font-bold text-xs uppercase">
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddHomework} className="space-y-4">
                {/* Title */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-400 px-1">Sujet / Titre du Devoir :</label>
                  <input 
                    type="text"
                    required
                    placeholder="ex: Exercices d'Algèbre p. 45..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-secondary/20 outline-none rounded-xl text-xs font-bold text-primary transition-all border border-transparent focus:border-secondary"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-400 px-1">Description / Consignes :</label>
                  <textarea 
                    rows={3}
                    placeholder="Entrez les exercices à faire par les élèves..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-secondary/20 outline-none rounded-xl text-xs font-bold text-primary transition-all border border-transparent focus:border-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Subject Dropdown */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[9px] font-bold uppercase text-gray-400 px-1">Matière :</label>
                    <select 
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="p-4 bg-gray-50 focus:bg-white outline-none rounded-xl text-xs font-bold text-primary border border-transparent focus:border-secondary transition-all"
                    >
                      <option value="Mathématiques">Mathématiques</option>
                      <option value="Français">Français</option>
                      <option value="Physique">Physique</option>
                      <option value="Chimie">Chimie</option>
                      <option value="Sciences">Sciences</option>
                      <option value="Anglais">Anglais</option>
                      <option value="Histoire">Histoire</option>
                      <option value="Créole">Créole</option>
                    </select>
                  </div>

                  {/* Class Selection */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[9px] font-bold uppercase text-gray-400 px-1">Classe concernée :</label>
                    <select 
                      required
                      value={newClassId}
                      onChange={(e) => setNewClassId(e.target.value)}
                      className="p-4 bg-gray-50 focus:bg-white outline-none rounded-xl text-xs font-bold text-primary border border-transparent focus:border-secondary transition-all"
                    >
                      <option value="">Sélectionner la classe</option>
                      {classrooms.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-400 px-1">Date d'Échéance (Due Date) :</label>
                  <input 
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-secondary/20 outline-none rounded-xl text-xs font-bold text-primary transition-all border border-transparent focus:border-secondary"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-4 flex space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 p-3.5 bg-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-primary"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={formLoading}
                    className="flex-1 p-3.5 bg-secondary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {formLoading ? "Enregistrement..." : "Créer le Devoir"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: "MARQUER" scoring sheet (Teachers and Pedagogical surveillance only) */}
      <AnimatePresence>
        {showMarkModal && selectedHomework && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-6 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              {/* scoring header */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 shrink-0">
                <div>
                  <h3 className="font-black uppercase text-sm text-primary flex items-center space-x-2">
                    <Award size={20} className="text-secondary" />
                    <span>Évaluation Disciplinaire Devoir</span>
                  </h3>
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 mt-1">
                    Devoir : "{selectedHomework.title}" | Salle : {selectedHomework.classrooms?.name || 'Inconnue'}
                  </p>
                </div>
                <button onClick={() => setShowMarkModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {scoringSuccess && (
                <div className="bg-green-50 p-3 my-2 rounded-xl text-green-700 font-extrabold text-xs uppercase mb-4 shrink-0 transition-all">
                  {scoringSuccess}
                </div>
              )}

              {/* Scoring spreadsheet scroll zone */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {scoringLoading ? (
                  <div className="flex justify-center py-12"><div className="loader"></div></div>
                ) : scoringStudents.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 font-bold uppercase text-xs">Aucun élève enregistré dans cette classe.</p>
                ) : (
                  <div className="space-y-3">
                    {scoringStudents.map((stud) => {
                      const state = scoringData[stud.id] || { is_completed: false, grade_or_remarks: '' };
                      return (
                        <div 
                          key={stud.id} 
                          className="bg-gray-50/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-100"
                        >
                          {/* Student identity details */}
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center uppercase">
                              {stud.full_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-xs text-primary uppercase">{stud.full_name}</p>
                              <span className="text-[9px] font-semibold text-gray-400 uppercase">{stud.student_code}</span>
                            </div>
                          </div>

                          {/* grading controls */}
                          <div className="flex items-center space-x-3 sm:justify-end">
                            {/* Complete checklist button toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                setScoringData({
                                  ...scoringData,
                                  [stud.id]: {
                                    ...state,
                                    is_completed: !state.is_completed
                                  }
                                });
                              }}
                              className={clsx(
                                "py-2 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border flex items-center space-x-1.5",
                                state.is_completed 
                                  ? "bg-green-100 text-green-800 border-green-200" 
                                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                              )}
                            >
                              {state.is_completed ? <Check size={12} /> : null}
                              <span>{state.is_completed ? "Remis" : "Non rendu"}</span>
                            </button>

                            {/* Scoring notes input */}
                            <div className="flex items-center space-x-1">
                              <MessageSquare size={13} className="text-gray-300" />
                              <input 
                                type="text"
                                placeholder="Note ou remarque..."
                                value={state.grade_or_remarks}
                                onChange={(e) => {
                                  setScoringData({
                                    ...scoringData,
                                    [stud.id]: {
                                      ...state,
                                      grade_or_remarks: e.target.value
                                    }
                                  });
                                }}
                                className="p-2 bg-white outline-none rounded-xl text-xs font-bold text-primary w-36 focus:ring-1 focus:ring-secondary border border-gray-200"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* save footer bar */}
              <div className="pt-4 border-t border-gray-100 flex space-x-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowMarkModal(false)}
                  className="flex-1 p-3.5 bg-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-primary"
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveScoring}
                  disabled={scoringLoading}
                  className="flex-1 p-3.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {scoringLoading ? "Sauvegarde..." : "Valider les Évaluations"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
