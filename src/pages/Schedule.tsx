import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Plus, 
  BookOpen, 
  User, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Layers,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface CustomSlot {
  name: string;
  prof: string;
  color: string;
  iconBg: string;
}

export default function Schedule() {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language === 'fr';
  const { profile } = useAuth();
  
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const isFundamentalStaff = ['censeur_fondamental', 'resp_ped_fondamental'].includes(profile?.role || '');
  const isSecondaryStaff = ['censeur_secondaire', 'resp_ped_secondaire'].includes(profile?.role || '');
  const isAdminOrStaff = ['super_admin', 'directeur', 'censeur_fondamental', 'censeur_secondaire', 'resp_ped_fondamental', 'resp_ped_secondaire'].includes(profile?.role || '');

  // Campus view logic matching role restrictions
  const initialCampus = isFundamentalStaff ? 'fondamantal' : (isSecondaryStaff ? 'secondaire' : (profile?.campus === 'both' ? 'fondamantal' : profile?.campus || 'fondamantal'));
  const [campusView, setCampusView] = useState(initialCampus);
  
  // Selected class for Staff & Guest Students
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // Day view index (1 to 5)
  const [activeDayId, setActiveDayId] = useState<number>(1);

  // Tab switcher for Admin
  const [activeTab, setActiveTab] = useState<'schedules' | 'classrooms'>('schedules');

  // Custom slots edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editProf, setEditProf] = useState('');
  const [editStyleVal, setEditStyleVal] = useState('border-l-indigo-600 bg-indigo-50/40 text-indigo-900||bg-indigo-100 text-indigo-600');

  // Add Classroom Modal States
  const [showAddClassroomModal, setShowAddClassroomModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('');
  const [newClassSection, setNewClassSection] = useState('A');
  const [newClassCapacity, setNewClassCapacity] = useState('40');
  const [newStartTime, setNewStartTime] = useState('07:30');
  const [newEndTime, setNewEndTime] = useState('13:30');
  const [classSubmitting, setClassSubmitting] = useState(false);

  // Load custom slots state
  const [customSlots, setCustomSlots] = useState<Record<string, CustomSlot>>(() => {
    const saved = localStorage.getItem('codosa_custom_slots_v3');
    return saved ? JSON.parse(saved) : {};
  });

  // Load published classes state
  const [publishedClasses, setPublishedClasses] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('codosa_published_classes_v3');
    return saved ? JSON.parse(saved) : {};
  });

  const allowCampusToggle = profile?.campus === 'both' && !isFundamentalStaff && !isSecondaryStaff;

  const days = [
    { id: 1, label: isFr ? 'Lundi' : 'Lendi', color: '#010657' },
    { id: 2, label: isFr ? 'Mardi' : 'Madi', color: '#09b5f2' },
    { id: 3, label: isFr ? 'Mercredi' : 'Mèkredi', color: '#fac900' },
    { id: 4, label: isFr ? 'Jeudi' : 'Jedi', color: 'orange' },
    { id: 5, label: isFr ? 'Vendredi' : 'Vandredi', color: 'green' },
  ];

  const colorPresets = [
    { name: 'Ble / Indigo', val: 'border-l-indigo-600 bg-indigo-50/40 text-indigo-900||bg-indigo-100 text-indigo-600' },
    { name: 'Woz / Rose', val: 'border-l-rose-600 bg-rose-50/40 text-rose-900||bg-rose-100 text-rose-600' },
    { name: 'Vè / Green', val: 'border-l-emerald-600 bg-emerald-50/40 text-emerald-950||bg-emerald-100 text-emerald-600' },
    { name: 'Jòn / Amber', val: 'border-l-amber-600 bg-amber-50/40 text-amber-900||bg-amber-100 text-amber-600' },
    { name: 'Cyan / Syany', val: 'border-l-cyan-600 bg-cyan-50/40 text-cyan-900||bg-cyan-100 text-cyan-600' },
    { name: 'Violèt / Purple', val: 'border-l-purple-600 bg-purple-50/40 text-purple-900||bg-purple-100 text-purple-600' },
    { name: 'Zoranj / Orange', val: 'border-l-orange-600 bg-orange-50/40 text-orange-950||bg-orange-100 text-orange-600' }
  ];

  useEffect(() => {
    fetchClassrooms();
    fetchTeachers();
  }, [campusView]);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('campus', campusView)
        .order('name');
        
      if (data && data.length > 0) {
        setClassrooms(data);
        // Only trigger initial selected class if we have custom view or are staff
        if (!selectedClass || !data.some(c => c.id === selectedClass)) {
          setSelectedClass(data[0].id);
        }
      } else {
        setClassrooms([]);
        setSelectedClass('');
      }
    } catch (e) {
      console.error("Error loading classrooms:", e);
      setClassrooms([]);
    }
    setLoading(false);
  };

  const fetchTeachers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'professeur')
        .order('full_name');
        
      if (!error && usersData && usersData.length > 0) {
        setTeachers(usersData);
        return;
      }
    } catch (e) {
      console.warn("Could not query 'users' for teachers, trying 'profiles':", e);
    }

    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'professeur')
        .order('full_name');
        
      if (profilesData) {
        setTeachers(profilesData);
      }
    } catch (e) {
      console.error("Error querying 'profiles' as well:", e);
    }
  };

  const getClassNameForId = (id: string) => {
    const room = classrooms.find(c => c.id === id);
    return room ? room.name : '';
  };

  // Helper check if schedule is generated for a classroom
  const isClassGenerated = (classId: string) => {
    if (!classId) return false;
    return Object.keys(customSlots).some(k => k.startsWith(`${classId}_`));
  };

  // Helper to publish/unpublish class schedules
  const isPublished = (classId: string) => {
    return !!publishedClasses[classId];
  };

  const togglePublication = (classId: string) => {
    if (!classId) return;
    const currentPublishState = isPublished(classId);
    const nextState = !currentPublishState;
    const updated = {
      ...publishedClasses,
      [classId]: nextState
    };
    setPublishedClasses(updated);
    localStorage.setItem('codosa_published_classes_v3', JSON.stringify(updated));
    if (nextState) {
      alert(`Orè pou klas ${getClassNameForId(classId)} la pibliye avèk siksè! Kounye a elèv yo ka wè li nan espas pa yo.`);
    } else {
      alert(`Piblikasyon orè pou klas ${getClassNameForId(classId)} la anile kounye a.`);
    }
  };

  // Populate/Generate blank template classes of 5 slots for Lundi - Vendredi for selected classroom
  const handleGenerateScheduleGrid = (classId: string) => {
    if (!classId) return;

    if (customSlots && isClassGenerated(classId)) {
      if (!confirm("Gen yon orè ki deja pwodwi pou klas sa a. Èske ou vle efase li pou w re-générer yon lòt vid?")) {
        return;
      }
    }

    const defaultColorPresets = [
      'border-l-indigo-600 bg-indigo-50/40 text-indigo-900||bg-indigo-100 text-indigo-600',
      'border-l-rose-600 bg-rose-50/40 text-rose-900||bg-rose-100 text-rose-600',
      'border-l-emerald-600 bg-emerald-50/40 text-emerald-950||bg-emerald-100 text-emerald-600',
      'border-l-amber-600 bg-amber-50/40 text-amber-900||bg-amber-100 text-amber-600'
    ];

    const standardTimeSlots = [
      { time: "07:00 - 08:30", isBreak: false, title: "Kou pou Chwazi" },
      { time: "08:30 - 10:00", isBreak: false, title: "Kou pou Chwazi" },
      { time: "10:00 - 10:30", isBreak: true, title: "RÉCRÉATION (PAUSE)" },
      { time: "10:30 - 12:00", isBreak: false, title: "Kou pou Chwazi" },
      { time: "12:00 - 13:30", isBreak: false, title: "Kou pou Chwazi" }
    ];

    const newSlots = { ...customSlots };

    // Set initial values
    for (let dayId = 1; dayId <= 5; dayId++) {
      standardTimeSlots.forEach((slot, idx) => {
        const slotKey = `${classId}_${dayId}_${idx}`;
        if (slot.isBreak) {
          newSlots[slotKey] = {
            name: "RÉCRÉATION (PAUSE)",
            prof: "Pas d'enseignant",
            color: "border-l-gray-400 bg-gray-50 text-gray-400 border-dashed border-2",
            iconBg: 'bg-gray-100 text-gray-500'
          };
        } else {
          const style = defaultColorPresets[idx % defaultColorPresets.length];
          const styles = style.split('||');
          newSlots[slotKey] = {
            name: "Matière à définir",
            prof: teachers.length > 0 ? teachers[0].full_name : "Okenn Pwofesè",
            color: styles[0],
            iconBg: styles[1] || 'bg-indigo-100 text-indigo-600'
          };
        }
      });
    }

    setCustomSlots(newSlots);
    localStorage.setItem('codosa_custom_slots_v3', JSON.stringify(newSlots));
    alert('Orè a kreye avèk siksè! Kounye a ou ka modifye chak peryòd jan ou vle kòm responsab.');
  };

  // Erase/Clear generated schedule for a selected classroom
  const handleClearScheduleGrid = (classId: string) => {
    if (!classId) return;
    if (!confirm(`Èske ou vle efase nèt orè sa a pou klas "${getClassNameForId(classId)}" la ? Tout chanjman yo ap pèdi.`)) return;

    const updatedSlots = { ...customSlots };
    Object.keys(updatedSlots).forEach(key => {
      if (key.startsWith(`${classId}_`)) {
        delete updatedSlots[key];
      }
    });

    // Also unpublish if deleted
    const updatedPub = { ...publishedClasses };
    delete updatedPub[classId];

    setCustomSlots(updatedSlots);
    setPublishedClasses(updatedPub);
    localStorage.setItem('codosa_custom_slots_v3', JSON.stringify(updatedSlots));
    localStorage.setItem('codosa_published_classes_v3', JSON.stringify(updatedPub));
    alert('Orè a efase avèk siksè.');
  };

  const getCoursesForClassAndDay = (classId: string, dayId: number) => {
    if (!classId) return [];

    const standardTimeSlots = [
      { time: "07:00 - 08:30", isBreak: false },
      { time: "08:30 - 10:00", isBreak: false },
      { time: "10:00 - 10:30", isBreak: true },
      { time: "10:30 - 12:00", isBreak: false },
      { time: "12:00 - 13:30", isBreak: false }
    ];

    if (!isClassGenerated(classId)) {
      return [];
    }

    return standardTimeSlots.map((s, idx) => {
      const slotKey = `${classId}_${dayId}_${idx}`;
      if (customSlots[slotKey]) {
        return {
          id: idx,
          time: s.time,
          isBreak: s.isBreak,
          name: customSlots[slotKey].name,
          prof: customSlots[slotKey].prof,
          color: customSlots[slotKey].color,
          iconBg: customSlots[slotKey].iconBg
        };
      }

      if (s.isBreak) {
        return {
          id: idx,
          time: s.time,
          isBreak: true,
          name: 'RÉCRÉATION (PAUSE)',
          prof: "Pas d'enseignant",
          color: 'border-l-gray-400 bg-gray-50 text-gray-400 border-dashed border-2',
          iconBg: 'bg-gray-100 text-gray-500'
        };
      }

      return {
        id: idx,
        time: s.time,
        isBreak: false,
        name: 'Matière à définir',
        prof: 'À attribuer',
        color: 'border-l-indigo-600 bg-indigo-50/40 text-indigo-900',
        iconBg: 'bg-indigo-100 text-indigo-600'
      };
    });
  };

  const activeCourses = selectedClass ? getCoursesForClassAndDay(selectedClass, activeDayId) : [];

  // Edit Course Slot Handler
  const openEditSlotModal = (slotId: number, course: any) => {
    setSelectedSlotIndex(slotId);
    setEditSubject(course.name);
    setEditProf(course.prof);
    
    // Find matching preset
    const joinedStyle = `${course.color}||${course.iconBg}`;
    const matchesPreset = colorPresets.some(cp => cp.val === joinedStyle);
    setEditStyleVal(matchesPreset ? joinedStyle : colorPresets[0].val);

    setShowEditModal(true);
  };

  const saveEditedCourse = () => {
    if (selectedSlotIndex === null) return;
    
    const styles = editStyleVal.split('||');
    const color = styles[0];
    const iconBg = styles[1] || 'bg-indigo-100 text-indigo-600';

    const slotKey = `${selectedClass}_${activeDayId}_${selectedSlotIndex}`;
    const updatedCustomSlots = {
      ...customSlots,
      [slotKey]: {
        name: editSubject || 'Matière à définir',
        prof: editProf || 'Pas d\'enseignant',
        color,
        iconBg
      }
    };

    setCustomSlots(updatedCustomSlots);
    localStorage.setItem('codosa_custom_slots_v3', JSON.stringify(updatedCustomSlots));
    setShowEditModal(false);
    alert('Orè a modifye avè siksè / L\'horaire a été mis à jour avec succès !');
  };

  // Add Classroom Database Handler
  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassLevel.trim()) {
      alert('Tanpri ranpli tout enfòmasyon yo!');
      return;
    }
    setClassSubmitting(true);
    const complexLevel = `${newClassLevel.trim()} |hours:${newStartTime}-${newEndTime}`;
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          name: newClassName.trim().toUpperCase(),
          level: complexLevel,
          section: newClassSection,
          campus: campusView,
          capacity: parseInt(newClassCapacity) || 40
        })
        .select();

      if (error) {
        console.warn("DB insert error, adding locally fallback:", error);
        alert('Klas sa a pa ka ajoute nan Supabase - N ap anrejistre li lokalman.');
        const fallbackRoom = {
          id: 'temp_' + Date.now(),
          name: newClassName.trim().toUpperCase(),
          level: complexLevel,
          section: newClassSection,
          campus: campusView,
          capacity: parseInt(newClassCapacity) || 40
        };
        setClassrooms(prev => [...prev, fallbackRoom]);
        if (!selectedClass) setSelectedClass(fallbackRoom.id);
      } else {
        alert('Klas la ajoute avèk siksè nan baz done a !');
      }
      
      setShowAddClassroomModal(false);
      setNewClassName('');
      setNewClassLevel('');
      setNewClassSection('A');
      setNewClassCapacity('40');
      setNewStartTime('07:30');
      setNewEndTime('13:30');
      fetchClassrooms();
    } catch (err) {
      console.error(err);
    } finally {
      setClassSubmitting(false);
    }
  };

  // Delete Classroom Database Handler
  const handleDeleteClassroom = async (classId: string, className: string) => {
    if (!confirm(`Èske ou vle efase klas "${className}" la nèt ? Sa ap retire orphelins yo tou.`)) return;
    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classId);

      if (error) {
        console.warn("DB delete error, removing locally:", error);
      }
      
      // Clear Slots for this classroom
      const updatedSlots = { ...customSlots };
      Object.keys(updatedSlots).forEach(key => {
        if (key.startsWith(`${classId}_`)) {
          delete updatedSlots[key];
        }
      });
      setCustomSlots(updatedSlots);
      localStorage.setItem('codosa_custom_slots_v3', JSON.stringify(updatedSlots));

      setClassrooms(prev => prev.filter(c => c.id !== classId));
      alert('Klas la efase avè siksè.');
      fetchClassrooms();
    } catch (error) {
      console.error(error);
    }
  };

  // ----------------------------------------------------
  // INTERACTIVE VIEWS DEPENDING ON USER ROLE
  // ----------------------------------------------------

  // 1. STUDENT VIEW ('eleve')
  if (profile?.role === 'eleve') {
    // Find matching classroom name from database
    const studentRoom = classrooms.find(c => c.name.toLowerCase() === (profile?.classroom || '').toLowerCase());
    const isStudentRoomPublished = studentRoom ? isPublished(studentRoom.id) : false;
    const studentRoomCourses = studentRoom ? getCoursesForClassAndDay(studentRoom.id, activeDayId) : [];

    return (
      <div className="p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
              <CalendarIcon size={32} className="text-secondary shrink-0" />
              <span>{isFr ? "Mon Horaire" : "Orè Pa m"}</span>
            </h2>
            <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-1">
              {profile?.full_name} — {isFr ? `Classe: ${profile?.classroom || 'Aucune classe spécifiée'}` : `Klas: ${profile?.classroom || 'Okenn Klas fòmalize'}`}
            </p>
          </div>
        </header>

        {/* If student has no classroom specified in their profile */}
        {!profile?.classroom ? (
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-150 text-center space-y-4 shadow-xl max-w-lg mx-auto my-12">
            <div className="w-16 h-16 bg-yellow-500/15 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-black text-primary uppercase">Mete klas ou a sou kont ou</h3>
            <p className="text-xs font-medium text-gray-500">
              Ou poko gen yon klas ki deklare sou pwofil la. Tanpri ale sou tab <strong className="text-primary hover:underline cursor-pointer">Kont (Mon Compte)</strong> pou chwazi klas ou, oswa chwazi yon klas tanporè anba la a pou wè orè pibliye:
            </p>

            <div className="pt-4">
              <select 
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-black text-primary border border-gray-200 uppercase"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                }}
              >
                <option value="">-- Chwazi yon Klas pou wè (orè pibliye sèlman) --</option>
                {classrooms.filter(c => isPublished(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                ))}
              </select>
            </div>
            
            {selectedClass && isPublished(selectedClass) && (
              <div className="mt-8 text-left border-t border-gray-100 pt-6">
                {/* Days selector */}
                <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide mb-4">
                  {days.map(day => (
                    <button 
                      key={day.id}
                      onClick={() => setActiveDayId(day.id)}
                      className={clsx(
                        "flex-shrink-0 px-4 py-2.5 rounded-[1.2rem] transition-all text-xs font-bold border",
                        activeDayId === day.id 
                          ? "bg-primary text-white border-primary shadow-sm" 
                          : "bg-white border-gray-100 text-primary"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {getCoursesForClassAndDay(selectedClass, activeDayId).map((course: any, idx) => (
                    <div key={idx} className={clsx("p-4 rounded-2xl border border-l-4 shadow-sm flex items-center justify-between", course.color)}>
                      <div>
                        <h4 className="font-extrabold text-xs uppercase text-primary">{course.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{course.prof}</p>
                      </div>
                      <span className="font-mono text-[10px] font-black">{course.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !studentRoom ? (
          // Student is set to a classroom that does not exist in the database
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-150 text-center space-y-4 shadow-xl max-w-lg mx-auto my-12">
            <div className="w-16 h-16 bg-red-500/15 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-black text-primary uppercase">Klas pa jwenn</h3>
            <p className="text-xs font-medium text-gray-500">
              Klas ou chwazi a (<strong>{profile?.classroom}</strong>) poko anrejistre oswa te efase pa responsab yo. Censeur yo dwe ajoute klas sa a pou w ka wè orè a.
            </p>
          </div>
        ) : !isStudentRoomPublished ? (
          // Student's classroom is found, but NOT published yet
          <div className="bg-white p-12 rounded-[2.8rem] border border-gray-150 text-center space-y-6 shadow-xl max-w-lg mx-auto my-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-3 bg-red-500"></div>
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <X size={40} className="stroke-2" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-primary uppercase">{isFr ? "Horaire non publié" : "Orè poko pibliye"}</h3>
              <p className="text-red-550 font-black text-[10px] uppercase tracking-widest mt-1">{isFr ? "ACCÈS LIMITÉ" : "Katye Jeneral Restriksyon"}</p>
              <p className="text-xs font-medium text-gray-500 leading-relaxed mt-3">
                {isFr 
                  ? `Les censeurs ou le responsable pédagogique n'ont pas encore publié l'horaire des cours pour la classe ${studentRoom.name} pour cette semaine.`
                  : `Censeur yo oswa Responsab Pedagogik la poko pibliye orè kou yo pou klas ${studentRoom.name} la pou semèn sa a.`}
              </p>
            </div>
          </div>
        ) : (
          // Student's classroom schedule is PUBLISHED! Let's display it beautifully!
          <div className="space-y-6">
            <div className="bg-emerald-500 text-white p-5 rounded-[2.2rem] flex items-center gap-4 shadow-md">
              <CheckCircle size={28} className="shrink-0 text-white" />
              <div>
                <h4 className="font-black text-xs uppercase tracking-wide">{isFr ? "Horaire de classe publié et validé" : "Orè Klas ou a Pibliye e Valide"}</h4>
                <p className="text-[10px] font-bold opacity-90 mt-0.5">{isFr ? `Classe : ${studentRoom.name} — Campus ${studentRoom.campus === 'fondamantal' ? 'Fondamental' : 'Secondaire'}` : `Klas: ${studentRoom.name} — Campus ${studentRoom.campus === 'fondamantal' ? 'Fondamental' : 'Secondaire'}`}</p>
              </div>
            </div>

            {/* Days selector */}
            <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
              {days.map(day => (
                <button 
                  key={day.id}
                  onClick={() => setActiveDayId(day.id)}
                  className={clsx(
                    "flex-shrink-0 px-6 py-4 rounded-[1.8rem] transition-all flex flex-col items-center min-w-[110px] border",
                    activeDayId === day.id 
                      ? "bg-primary text-white border-primary shadow-lg scale-105" 
                      : "bg-white border-gray-100 hover:border-secondary/40 text-primary shadow-sm"
                  )}
                >
                  <span className={clsx("text-[9px] font-black uppercase tracking-wider mb-1", activeDayId === day.id ? "text-yellow-300" : "opacity-40")}>
                    {day.label.slice(0, 3)}
                  </span>
                  <span className="text-sm font-extrabold">{day.label}</span>
                  <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: activeDayId === day.id ? '#fac900' : day.color }}></div>
                </button>
              ))}
            </div>

            {/* Schedule View Grid */}
            <div className="space-y-4">
              {studentRoomCourses.map(course => (
                <div 
                  key={course.id}
                  className={clsx(
                    "p-5 rounded-[2rem] border border-l-[6px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group",
                    course.color
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner", course.iconBg)}>
                       {course.isBreak ? "☕" : "📚"}
                    </div>
                    <div>
                      <h4 className="font-black text-base uppercase leading-tight text-primary">
                        {course.name}
                      </h4>
                      {!course.isBreak && (
                        <p className="text-xs font-bold text-gray-500 mt-1 flex items-center space-x-1.5">
                          <span className="font-extrabold uppercase tracking-widest text-[8px] text-primary bg-primary/5 px-2 py-0.5 rounded-md">Pwofesè</span>
                          <span>{course.prof}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-white/70 p-2.5 px-4 rounded-2xl border border-gray-200/20 self-start sm:self-auto shrink-0">
                     <Clock size={14} className="text-primary opacity-60" />
                     <span className="font-mono text-xs font-black text-primary/80">{course.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. PROFESSOR VIEW ('professeur')
  if (profile?.role === 'professeur') {
    // Collect all teaching sessions from every published classroom for the professor
    const getProfessorSessionsForDay = (dayId: number) => {
      const sessions: any[] = [];
      const standardTimeSlots = [
        { time: "07:00 - 08:30" },
        { time: "08:30 - 10:00" },
        { time: "10:00 - 10:30", isBreak: true },
        { time: "10:30 - 12:00" },
        { time: "12:00 - 13:30" }
      ];

      classrooms.forEach(c => {
        // Must be published!
        if (!isPublished(c.id)) return;

        standardTimeSlots.forEach((slot, idx) => {
          if (slot.isBreak) return;
          const slotKey = `${c.id}_${dayId}_${idx}`;
          const custom = customSlots[slotKey];
          // Check if this professor teaches this course
          if (custom && custom.prof && custom.prof.toLowerCase() === (profile?.full_name || '').toLowerCase()) {
            sessions.push({
              classroomId: c.id,
              classroomName: c.name,
              level: c.level,
              subject: custom.name,
              time: slot.time,
              color: custom.color,
              iconBg: custom.iconBg
            });
          }
        });
      });

      // Sort by start time of course
      return sessions.sort((a, b) => a.time.localeCompare(b.time));
    };

    const profSessions = getProfessorSessionsForDay(activeDayId);

    return (
      <div className="p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
              <GraduationCap size={32} className="text-secondary shrink-0" />
              <span>{isFr ? "Mes Enseignements" : "Kou M ap Bay"}</span>
            </h2>
            <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-1">
              {isFr ? `Enseignant : ${profile?.full_name} — Horaires consolidés des classes publiées` : `Pwofesè: {profile?.full_name} — Orè konpile nan klas ki pibliye yo`}
            </p>
          </div>
        </header>

        {/* Days selector */}
        <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
          {days.map(day => (
            <button 
              key={day.id}
              onClick={() => setActiveDayId(day.id)}
              className={clsx(
                "flex-shrink-0 px-6 py-4 rounded-[1.8rem] transition-all flex flex-col items-center min-w-[110px] border",
                activeDayId === day.id 
                  ? "bg-primary text-white border-primary shadow-lg scale-105" 
                  : "bg-white border-gray-100 hover:border-secondary/40 text-primary shadow-sm"
              )}
            >
              <span className={clsx("text-[9px] font-black uppercase tracking-wider mb-1", activeDayId === day.id ? "text-yellow-300" : "opacity-40")}>
                {day.label.slice(0, 3)}
              </span>
              <span className="text-sm font-extrabold">{day.label}</span>
              <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: activeDayId === day.id ? '#fac900' : day.color }}></div>
            </button>
          ))}
        </div>

        {/* Grid display of teaching slots for this day */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-primary/40 tracking-wider">
            Kou planifye pou {days.find(d => d.id === activeDayId)?.label} :
          </h3>

          {profSessions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-gray-150 shadow-sm text-gray-500">
              <BookOpen className="mx-auto mb-4 opacity-30" size={48} />
              <p className="font-black uppercase text-xs">Ou pa gen okenn klas planifye pou jou sa a.</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Sèlman orè ki pibliye pa direksyon an parèt isit la</p>
            </div>
          ) : (
            profSessions.map((session, idx) => (
              <div 
                key={idx}
                className={clsx(
                  "p-5 rounded-[2rem] border border-l-[6px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md",
                  session.color
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner", session.iconBg)}>
                     🏫
                  </div>
                  <div>
                    <h4 className="font-black text-base uppercase leading-tight text-primary">
                      {session.subject}
                    </h4>
                    <p className="text-xs font-bold text-gray-500 mt-1 flex items-center space-x-1.5">
                      <span className="font-extrabold uppercase tracking-widest text-[8px] text-white bg-secondary px-2 py-0.5 rounded-md leading-none">Klas / Salle</span>
                      <span className="font-black text-secondary">{session.classroomName} ({session.level})</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white/70 p-2.5 px-4 rounded-2xl border border-gray-200/20 self-start sm:self-auto shrink-0">
                   <Clock size={14} className="text-primary opacity-60" />
                   <span className="font-mono text-xs font-black text-primary/80">{session.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 3. STAFF / ADMIN VIEW (Censeurs, pedagogical representatives, directeurs, super_admin)
  return (
    <div className="p-4 md:p-8 space-y-6">
      
      {/* Title Header with Admin mode identifier */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
            <CalendarIcon size={32} className="text-secondary shrink-0" />
            <span>{t('schedule.title')}</span>
          </h2>
          <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-1">
            {isFr ? `Plus de ${classrooms.length} Salles de Classe & Horaires` : `Plis pase ${classrooms.length} Salles de Classe & Orè Codosien`}
          </p>
        </div>

        {/* Admin Section Tabs Toggler */}
        {isAdminOrStaff && (
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start md:self-auto shrink-0 shadow-sm">
            <button 
              onClick={() => setActiveTab('schedules')}
              className={clsx(
                "px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center space-x-2",
                activeTab === 'schedules' ? "bg-primary text-white shadow-md scale-105" : "text-gray-500 hover:text-primary"
              )}
            >
              <Clock size={14} />
              <span>{isFr ? "Horaires" : "Orè"}</span>
            </button>
            <button 
              onClick={() => setActiveTab('classrooms')}
              className={clsx(
                "px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center space-x-2",
                activeTab === 'classrooms' ? "bg-primary text-white shadow-md scale-105" : "text-gray-500 hover:text-primary"
              )}
            >
              <Layers size={14} />
              <span>Klas / Salles de classe</span>
            </button>
          </div>
        )}
      </header>

      {/* Campus Switcher Toggles */}
      {allowCampusToggle && (
        <div className="flex bg-gray-100 p-1 rounded-2xl max-w-xs border border-gray-200">
          <button 
            onClick={() => setCampusView('fondamantal')} 
            className={clsx("flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all", campusView === 'fondamantal' ? "bg-white text-primary shadow-sm" : "text-gray-400")}
          >
            {t('campus.fondamental')}
          </button>
          <button 
            onClick={() => setCampusView('secondaire')} 
            className={clsx("flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all", campusView === 'secondaire' ? "bg-white text-primary shadow-sm" : "text-gray-400")}
          >
            {t('campus.secondaire')}
          </button>
        </div>
      )}

      {/* 1. SCHEDULES ACTIVE VIEW */}
      {activeTab === 'schedules' ? (
        <div className="space-y-6">
          
          {classrooms.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-gray-150 shadow-sm text-gray-500 space-y-4">
              <Layers className="mx-auto mb-2 opacity-30 text-primary" size={60} />
              <h3 className="text-xl font-black text-primary uppercase">Pa gen okenn klas yo jwenn</h3>
              <p className="text-xs font-bold text-gray-500">
                Poko gen okenn klas ki anrejistre pou campus <strong>{campusView === 'secondaire' ? 'Secondaire' : 'Fondamental'}</strong> sa a.
              </p>
              <button 
                onClick={() => setActiveTab('classrooms')}
                className="bg-primary text-white py-3 px-6 rounded-xl font-black uppercase text-xs tracking-wider shadow-md"
              >
                Kreye yon Klas an premye
              </button>
            </div>
          ) : (
            <>
              {/* Class selection bar with Publish status toggle */}
              <div className="bg-white p-5 rounded-[2.2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest px-1">Chwazi yon klas pou manipile orè li :</label>
                    <select 
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-black text-primary focus:border-secondary border border-transparent transition-all uppercase"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                    >
                       {classrooms.map(c => (
                         <option key={c.id} value={c.id}>
                           {c.name} - {c.level || (campusView === 'secondaire' ? 'Secondaire' : 'Fondamental')}
                         </option>
                       ))}
                    </select>
                 </div>
                 
                 {selectedClass && (
                   <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 self-start md:self-auto font-black">
                     {/* Room Identifier */}
                     <div className="bg-secondary/10 p-3 px-6 rounded-2xl flex flex-col justify-center text-center">
                       <span className="text-[8px] uppercase tracking-widest text-secondary">Klas Seleksyone</span>
                       <span className="font-black text-base text-primary uppercase mt-0.5">
                         {getClassNameForId(selectedClass)}
                       </span>
                     </div>

                     {/* Publish Switcher Button */}
                     {isClassGenerated(selectedClass) && (
                       <button
                         onClick={() => togglePublication(selectedClass)}
                         className={clsx(
                           "py-3 px-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2",
                           isPublished(selectedClass) 
                             ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                             : "bg-orange-500 text-white hover:bg-orange-600"
                         )}
                       >
                         {isPublished(selectedClass) ? (
                           <>
                             <Eye size={14} />
                             <span>Pibliye (Publié 🟢)</span>
                           </>
                         ) : (
                           <>
                             <EyeOff size={14} />
                             <span>Poko Pibliye / Brouillon ⚪</span>
                           </>
                         )}
                       </button>
                     )}
                   </div>
                 )}
              </div>

              {selectedClass && !isClassGenerated(selectedClass) ? (
                // NOT GENERATED DASHBOARD FOR STAFF
                <div className="bg-white p-12 rounded-[2.8rem] border border-gray-150 text-center space-y-6 max-w-xl mx-auto shadow-md">
                   <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
                     <CalendarIcon size={32} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-primary uppercase">Matières & Horaires non initialisés</h3>
                     <p className="text-xs font-bold text-gray-500 mt-1">Klas {getClassNameForId(selectedClass)} la poko gen yon orè nan sistèm nan.</p>
                     <p className="text-xs font-medium text-gray-400 leading-relaxed mt-3">
                       Kòm responsab lekòl (Censeur, Direktè oswa Resp Pedagogik), ou dwe lanse jenerasyon kad kadriyaj orè a. 
                       Sa a pral kreye otomatikman peryòd estanda yo pou chak jou (Lundi - Vendredi) pou w ka tou dousman plasche sijè ak pwofesè yo.
                     </p>
                   </div>
                   <button
                     onClick={() => handleGenerateScheduleGrid(selectedClass)}
                     className="bg-secondary text-white py-4 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-secondary/95 active:scale-95 transition-all inline-flex items-center space-x-2"
                   >
                     ⚡ <span>Lanse Jenerasyon Orè a</span>
                   </button>
                </div>
              ) : (
                // GENERATED ACTIVE TIMETABLE FOR STAFF
                <div className="space-y-6">
                  {/* Days selector */}
                  <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
                    {days.map(day => (
                      <button 
                        key={day.id}
                        onClick={() => setActiveDayId(day.id)}
                        className={clsx(
                          "flex-shrink-0 px-6 py-4 rounded-[1.8rem] transition-all flex flex-col items-center min-w-[110px] border",
                          activeDayId === day.id 
                            ? "bg-primary text-white border-primary shadow-lg scale-105" 
                            : "bg-white border-gray-100 hover:border-secondary/40 text-primary shadow-sm"
                        )}
                      >
                        <span className={clsx("text-[9px] font-black uppercase tracking-wider mb-1", activeDayId === day.id ? "text-yellow-300" : "opacity-40")}>
                          {day.label.slice(0, 3)}
                        </span>
                        <span className="text-sm font-extrabold">{day.label}</span>
                        <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: activeDayId === day.id ? '#fac900' : day.color }}></div>
                      </button>
                    ))}
                  </div>

                  {/* Timetable grid layout */}
                  <div className="space-y-4 relative pl-4 md:pl-8 border-l-2 border-gray-100">
                    <div className="flex items-center justify-between px-1 mb-4 gap-2">
                      <h3 className="text-xs font-black uppercase text-primary/40 tracking-wider">
                        Kadriyaj Orè pou {days.find(d => d.id === activeDayId)?.label} :
                      </h3>
                      {selectedClass && (
                        <button 
                          onClick={() => handleClearScheduleGrid(selectedClass)}
                          className="text-[10px] font-black uppercase text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Efase Orè sa a nèt
                        </button>
                      )}
                    </div>
                    
                    {activeCourses.map((course) => (
                       <motion.div 
                         key={course.id}
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         className={clsx(
                           "relative p-5 rounded-[2rem] border border-l-[6px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group hover:shadow-md",
                           course.color
                         )}
                       >
                          {/* Connector dot */}
                          <div className="absolute -left-[27px] md:-left-[43px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-4 border-primary z-12 shadow-sm shrink-0"></div>

                          <div className="flex items-center space-x-4">
                            <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner", course.iconBg)}>
                               {course.isBreak ? "☕" : "📚"}
                            </div>
                            <div>
                              <h4 className="font-black text-base uppercase leading-tight group-hover:text-secondary transition-all text-primary">
                                {course.name}
                              </h4>
                              {!course.isBreak && (
                                <p className="text-xs font-bold text-gray-500 mt-1 flex items-center space-x-1.5">
                                  <span className="font-extrabold uppercase tracking-widest text-[8px] text-primary bg-primary/5 px-2 py-0.5 rounded-md leading-none">Pwofesè</span>
                                  <span>{course.prof}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 shrink-0 self-start sm:self-auto">
                             <div className="flex items-center space-x-2 bg-white/70 p-2.5 px-4 rounded-2xl border border-gray-200/20">
                                <Clock size={14} className="text-primary opacity-60" />
                                <span className="font-mono text-xs font-black text-primary/80">{course.time}</span>
                             </div>

                             {/* Edit course button for Admin */}
                             {!course.isBreak && (
                               <button
                                 onClick={() => openEditSlotModal(course.id, course)}
                                 className="p-3 bg-white/85 hover:bg-secondary hover:text-white rounded-xl border border-gray-200 text-gray-500 active:scale-95 transition-all shadow-sm"
                                 title="Modifier ce cours"
                               >
                                 <Edit size={16} />
                               </button>
                             )}
                          </div>
                       </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // 2. CLASSROOMS MANAGER VIEW (STAFF ONLY)
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-primary uppercase">Gestion des Salles de Classe</h3>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Ajoutez ou supprimez des salles de cours et gérez leurs capacités.</p>
            </div>
            <button
              onClick={() => setShowAddClassroomModal(true)}
              className="bg-secondary text-white px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-secondary/95 active:scale-95 transition-all flex items-center space-x-2 self-start"
            >
              <Plus size={16} />
              <span>Ajouter une Salle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center py-12"><div className="loader"></div></div>
            ) : classrooms.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500 font-bold uppercase text-xs bg-white rounded-3xl border border-dotted border-gray-200">
                Poko gen okenn klas ki kreye nan campus sa a. Klas yo dwe kreye nan fòm sa a.
              </div>
            ) : (
              classrooms.map((room) => (
                <div 
                  key={room.id}
                  className="bg-white p-6 rounded-[2.2rem] border border-gray-150 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase px-3 py-1 bg-primary/10 rounded-full text-primary tracking-widest leading-none">
                        {room.level ? room.level.split(' |hours:')[0] : 'Classe'}
                      </span>
                      <span className="text-[10px] font-black uppercase text-secondary tracking-widest">
                        Campus {room.campus === 'fondamantal' ? 'Fondamental' : 'Secondaire'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-2xl font-black text-primary uppercase">{room.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Section : {room.section || 'A'}</p>
                    </div>

                    <div className="pt-2 space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-gray-500 font-black">
                        <Users size={14} className="text-secondary shrink-0" />
                        <span>{room.capacity || 40} Elèves max</span>
                      </div>
                      
                      {room.level && room.level.includes(' |hours:') && (
                        <div className="flex items-center space-x-2 text-xs text-indigo-600 font-bold">
                          <Clock size={14} className="shrink-0" />
                          <span>Orè: {room.level.split(' |hours:')[1].replace('-', ' - ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 mt-6 pt-4 flex justify-between items-center">
                    <div className="text-[8px] font-bold uppercase text-gray-400">CODOSA Salle ID: {String(room.id).slice(0, 8)}...</div>
                    <button
                      onClick={() => handleDeleteClassroom(room.id, room.name)}
                      className="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                      title="Supprimer cette salle de classe"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* EDIT STUDY SLOT COURSE MODAL (ADMIN ONLY) */}
      <AnimatePresence>
        {showEditModal && selectedSlotIndex !== null && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden max-w-lg w-full p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-secondary/15 p-3 rounded-2xl text-secondary">
                    <Edit size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-primary uppercase leading-none">Modifier le Cours</h3>
                    <p className="text-[9px] font-black uppercase text-secondary tracking-widest mt-1">
                      {getClassNameForId(selectedClass)} - {days.find(d => d.id === activeDayId)?.label}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-primary transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Subject Name Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Matière / Sijè :</label>
                  <input
                    type="text"
                    required
                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none"
                    placeholder="Matière (ex: Mathématiques, Créole, Physique...)"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                  />
                </div>

                {/* Professor Selection Input (Strict Database only!) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Enseignant / Pwofesè :</label>
                  
                  {teachers.length === 0 ? (
                    <div className="p-3 bg-red-50 text-red-500 border border-red-200 rounded-xl text-xs font-medium">
                      ⚠️ Pa gen okenn pwofesè anrejistre oswa apwouve poko nan sistèm nan. 
                      Yo dwe kreye yon kont pwofesè sou tab 'Enskripsyon' an premye.
                    </div>
                  ) : (
                    <select
                      className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none capitalize"
                      value={editProf}
                      onChange={(e) => setEditProf(e.target.value)}
                      required
                    >
                      <option value="">-- Chwazi Pwofesè nan lis la --</option>
                      {teachers.map((prof) => (
                        <option key={prof.id} value={prof.full_name}>{prof.full_name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Style Presets Switcher */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Style visuel du bloc :</label>
                  <div className="grid grid-cols-2 gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setEditStyleVal(preset.val)}
                        className={clsx(
                          "p-3 rounded-xl border-2 text-[10px] uppercase font-black tracking-normal transition-all text-left flex items-center justify-between",
                          editStyleVal === preset.val ? "border-primary bg-primary/5 shadow-inner" : "border-gray-100 hover:border-gray-300"
                        )}
                      >
                        <span>{preset.name}</span>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.val.split('||')[1]?.includes('indigo') ? '#4f46e5' : preset.val.split('||')[1]?.includes('rose') ? '#e11d48' : preset.val.split('||')[1]?.includes('emerald') ? '#059669' : '#d97706' }}></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-black uppercase text-xs tracking-widest text-primary transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveEditedCourse}
                  className="flex-1 py-4 bg-secondary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-secondary/95 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Save size={16} />
                  <span>Confirmer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CLASSROOM MODAL (ADMIN ONLY) */}
      <AnimatePresence>
        {showAddClassroomModal && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden max-w-lg w-full p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-secondary/15 p-3 rounded-2xl text-secondary">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-primary uppercase leading-none">Nouvelle Salle de classe</h3>
                    <p className="text-[9px] font-black uppercase text-secondary tracking-widest mt-1">Ajouter une classe au campus {campusView === 'secondaire' ? 'Secondaire' : 'Fondamental'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddClassroomModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-primary transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddClassroom} className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Code / Nom de la classe (ex: 8èC, NS3B) :</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 10èA"
                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                </div>

                {/* Level */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Niveau Académique / Cycle scolaire :</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 10è Année, NS3, NS4"
                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none"
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                  />
                </div>

                {/* Section & Capacity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Section (ex: A, B, C) :</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none"
                      placeholder="A"
                      value={newClassSection}
                      onChange={(e) => setNewClassSection(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Capacité (Elèves max) :</label>
                    <input
                      type="number"
                      className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none"
                      placeholder="40"
                      value={newClassCapacity}
                      onChange={(e) => setNewClassCapacity(e.target.value)}
                    />
                  </div>
                </div>

                {/* School Day Hours Interval (Start & End) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Heure Début Classe :</label>
                    <input
                      type="time"
                      required
                      className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none font-mono"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Heure Fin Classe :</label>
                    <input
                      type="time"
                      required
                      className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary rounded-2xl text-sm font-bold text-primary outline-none font-mono"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={classSubmitting}
                    onClick={() => setShowAddClassroomModal(false)}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-black uppercase text-xs tracking-widest text-primary transition-all disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={classSubmitting}
                    className="flex-1 py-4 bg-secondary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-secondary/95 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {classSubmitting ? <span>Enregistrement...</span> : <>
                      <Save size={16} />
                      <span>Ajouter</span>
                    </>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
