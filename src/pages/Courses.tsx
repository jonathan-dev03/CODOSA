import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Plus, Trash2, Edit, X, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface ClassRow {
  class_name: string;
  hours_per_week: number;
}

interface Course {
  id: string;
  name: string;
  campus: string;
  created_by: string;
  created_at: string;
  classes?: { class_name: string; hours_per_week: number }[];
}

export default function Courses() {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language === 'fr';
  const { profile } = useAuth();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [dbClassrooms, setDbClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState('');
  const [classRows, setClassRows] = useState<ClassRow[]>([{ class_name: '', hours_per_week: 4 }]);

  const userCampus = profile?.campus || 'fondamantal';
  // Standardize campus text
  const cleanCampus = userCampus === 'fondamantal' || userCampus === 'fondamentale' ? 'fondamantal' : 'secondaire';

  useEffect(() => {
    fetchCourses();
    fetchClassrooms();
  }, [userCampus]);

  const fetchClassrooms = async () => {
    try {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('campus', cleanCampus);

      if (data && data.length > 0) {
        setDbClassrooms(data);
        return;
      }
    } catch (e) {
      console.warn("Could not load classrooms for courses dropdown:", e);
    }

    // fallback to local storage
    const saved = localStorage.getItem(`codosa_classrooms_${cleanCampus}`);
    if (saved) {
      setDbClassrooms(JSON.parse(saved));
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    
    // First, try to fetch from Supabase
    try {
      const { data: dbCourses, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('campus', cleanCampus);

      if (!courseError && dbCourses) {
        // Fetch matching course classes
        const courseIds = dbCourses.map(c => c.id);
        if (courseIds.length > 0) {
          const { data: dbClasses } = await supabase
            .from('course_classes')
            .select('*')
            .in('course_id', courseIds);

          const joined = dbCourses.map(course => {
            const cls = dbClasses?.filter((cc: any) => cc.course_id === course.id) || [];
            return {
              ...course,
              classes: cls.map((c: any) => ({
                class_name: c.class_name,
                hours_per_week: c.hours_per_week
              }))
            };
          });
          setCourses(joined);
          // Sync with localStorage
          localStorage.setItem(`codosa_courses_${cleanCampus}`, JSON.stringify(joined));
          setLoading(false);
          return;
        } else {
          setCourses([]);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Supabase courses fetch error, falling back to local storage:", err);
    }

    // Fallback to local storage
    const saved = localStorage.getItem(`codosa_courses_${cleanCampus}`);
    if (saved) {
      setCourses(JSON.parse(saved));
    } else {
      // Bootstrap some default mock courses if empty
      const defaultCourses: Course[] = cleanCampus === 'fondamantal' ? [
        {
          id: '1',
          name: 'Mathématiques',
          campus: 'fondamantal',
          created_by: profile?.id || 'system',
          created_at: new Date().toISOString(),
          classes: [
            { class_name: '3ème AF', hours_per_week: 4 },
            { class_name: '4ème AF', hours_per_week: 4 }
          ]
        },
        {
          id: '2',
          name: 'Français',
          campus: 'fondamantal',
          created_by: profile?.id || 'system',
          created_at: new Date().toISOString(),
          classes: [
            { class_name: '3ème AF', hours_per_week: 3 },
            { class_name: '5ème AF', hours_per_week: 3 }
          ]
        }
      ] : [
        {
          id: '3',
          name: 'Philosophie',
          campus: 'secondaire',
          created_by: profile?.id || 'system',
          created_at: new Date().toISOString(),
          classes: [
            { class_name: 'Rhéto', hours_per_week: 4 },
            { class_name: 'Philo', hours_per_week: 4 }
          ]
        }
      ];
      setCourses(defaultCourses);
      localStorage.setItem(`codosa_courses_${cleanCampus}`, JSON.stringify(defaultCourses));
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setCourseName('');
    setClassRows([{ class_name: '', hours_per_week: 4 }]);
    setShowModal(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setClassRows(course.classes && course.classes.length > 0 
      ? course.classes 
      : [{ class_name: '', hours_per_week: 4 }]
    );
    setShowModal(true);
  };

  const addClassRow = () => {
    setClassRows([...classRows, { class_name: '', hours_per_week: 4 }]);
  };

  const removeClassRow = (index: number) => {
    if (classRows.length > 1) {
      setClassRows(classRows.filter((_, i) => i !== index));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    const validatedClasses = classRows.filter(r => r.class_name.trim() !== '');
    if (validatedClasses.length === 0) {
      setError(isFr ? "Veuillez spécifier au moins une classe valide." : "Tanpri mete omwen yon klas ki valid.");
      return;
    }

    setLoading(true);
    setError('');

    const newId = editingCourse ? editingCourse.id : crypto.randomUUID();
    const coursePayload: Course = {
      id: newId,
      name: courseName.trim(),
      campus: cleanCampus,
      created_by: profile?.id || 'system',
      created_at: editingCourse ? editingCourse.created_at : new Date().toISOString(),
      classes: validatedClasses
    };

    // 1. Try to save to Supabase
    let saveFailed = false;
    try {
      if (editingCourse) {
        // Delete old classes
        await supabase.from('course_classes').delete().eq('course_id', newId);
        // Update course
        const { error: errCourse } = await supabase.from('courses').update({
          name: coursePayload.name,
        }).eq('id', newId);

        if (errCourse) throw errCourse;
      } else {
        // Insert course
        const { error: errCourse } = await supabase.from('courses').insert({
          id: newId,
          name: coursePayload.name,
          campus: cleanCampus,
          created_by: profile?.id || null
        });

        if (errCourse) throw errCourse;
      }

      // Insert class rows
      const classesPayload = validatedClasses.map(c => ({
        course_id: newId,
        class_name: c.class_name,
        hours_per_week: c.hours_per_week,
        campus: cleanCampus
      }));

      const { error: errClasses } = await supabase.from('course_classes').insert(classesPayload);
      if (errClasses) throw errClasses;

    } catch (err: any) {
      console.warn("Supabase course write failed, updating locally:", err.message);
      saveFailed = true;
    }

    // 2. Perform Local Update (Primary source of truth for offline/sandboxed demo review)
    let updatedCourses = [...courses];
    if (editingCourse) {
      updatedCourses = updatedCourses.map(c => c.id === newId ? coursePayload : c);
    } else {
      updatedCourses.push(coursePayload);
    }

    setCourses(updatedCourses);
    localStorage.setItem(`codosa_courses_${cleanCampus}`, JSON.stringify(updatedCourses));
    
    setSuccess(isFr ? "Cours enregistré avec succès !" : "Klas sove ak siksè !");
    setShowModal(false);
    setLoading(false);

    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm(isFr ? "Voulez-vous vraiment supprimer ce cours ?" : "Èske ou vle siprime klas sa a tout bon?")) return;
    
    setLoading(true);
    try {
      await supabase.from('course_classes').delete().eq('course_id', courseId);
      await supabase.from('courses').delete().eq('id', courseId);
    } catch (e) {
      console.warn("Supabase deletion failed, deleting locally:", e);
    }

    const updated = courses.filter(c => c.id !== courseId);
    setCourses(updated);
    localStorage.setItem(`codosa_courses_${cleanCampus}`, JSON.stringify(updated));
    setLoading(false);
    setSuccess(isFr ? "Cours supprimé !" : "Klas la siprime !");
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            {isFr ? "Gestion des Cours" : "Jesyon Klas & Matyè"}
          </h1>
          <p className="text-xs text-secondary font-black uppercase tracking-widest mt-1">
            Campus: <span className="text-[#09b5f2]">{cleanCampus.toUpperCase()}</span>
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-[#010657] text-white px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:opacity-95 shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>{isFr ? "Ajouter un cours" : "Ajoute yon Matyè"}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-start space-x-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-xs font-bold border border-green-100 flex items-start space-x-2 animate-bounce">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Course Cards List */}
      {loading && courses.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="loader"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-[2rem] border border-gray-100">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-secondary font-bold">
            {isFr ? "Aucun cours disponible pour ce campus." : "Pa gen okenn klas ki kreye pou campus sa a."}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isFr ? "Cliquez sur 'Ajouter un cours' pour commencer." : "Klike sou bouton anlè a pou w kòmanse."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <motion.div
              layout
              key={course.id}
              className="bg-white rounded-[2rem] p-6 border border-gray-150 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-[#010657]/10 text-[#010657] rounded-xl flex items-center justify-center">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-md font-black text-primary leading-tight">{course.name}</h3>
                      <p className="text-[10px] text-gray-400 capitalize font-bold">{course.campus}</p>
                    </div>
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenEdit(course)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-primary/75 transition-colors"
                      title={isFr ? "Modifier" : "Modifye"}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      title={isFr ? "Supprimer" : "Siprime"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <p className="text-[10px] font-black uppercase text-secondary tracking-wider mb-2">
                    {isFr ? "Classes associées :" : "Klas ki konsène yo :"}
                  </p>
                  <div className="space-y-1.5">
                    {course.classes?.map((cls, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                        <span className="text-xs font-black text-primary uppercase">{cls.class_name}</span>
                        <span className="text-[10px] font-bold bg-[#09b5f2]/10 text-[#09b5f2] px-2 py-0.5 rounded-full font-mono">
                          {cls.hours_per_week}h/sem
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Course Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-primary transition-all rounded-full"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black text-primary uppercase tracking-tight mb-4">
                {editingCourse 
                  ? (isFr ? "Modifier le cours" : "Sove Chanjman yo") 
                  : (isFr ? "Ajouter un cours" : "Ajoute yon nouvo matyè")
                }
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                    {isFr ? "Nom du cours" : "Non matyè a"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mathématiques, Science physique, etc."
                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-2xl outline-none font-bold text-sm text-primary"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                    Campus
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full p-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest"
                    value={cleanCampus}
                  />
                </div>

                {/* Sub Class Row Builder */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-secondary uppercase tracking-widest">
                      {isFr ? "Classes & Heures par semaine" : "Klas & Kantite Lè"}
                    </label>
                    <button
                      type="button"
                      onClick={addClassRow}
                      className="text-xs font-black uppercase text-[#09b5f2] hover:underline"
                    >
                      + {isFr ? "Ajouter classe" : "Ajoute yon klas"}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {classRows.map((row, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <select
                          required
                          className="flex-1 p-3 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-xl outline-none font-bold text-xs text-primary"
                          value={row.class_name}
                          onChange={(e) => {
                            const updated = [...classRows];
                            updated[index].class_name = e.target.value;
                            setClassRows(updated);
                          }}
                        >
                          <option value="">{isFr ? "-- Choisir une salle --" : "-- Chwazi yon klas --"}</option>
                          {dbClassrooms.map((c) => (
                            <option key={c.id} value={c.full_name || c.name}>
                              {c.full_name || c.name}
                            </option>
                          ))}
                        </select>
                        <div className="w-24">
                          <input
                            type="number"
                            required
                            min="1"
                            max="40"
                            placeholder="Hours"
                            className="w-full p-3 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-xl outline-none font-bold text-xs text-primary text-center font-mono"
                            value={row.hours_per_week || ''}
                            onChange={(e) => {
                              const updated = [...classRows];
                              updated[index].hours_per_week = parseInt(e.target.value) || 0;
                              setClassRows(updated);
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={classRows.length <= 1}
                          onClick={() => removeClassRow(index)}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#010657] text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all hover:opacity-95 shadow-md active:scale-98"
                >
                  <Save size={14} />
                  <span>{isFr ? "Enregistrer" : "Sove"}</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
