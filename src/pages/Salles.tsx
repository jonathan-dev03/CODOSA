import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  FolderMinus, 
  X, 
  ArrowLeftRight, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  GraduationCap
} from 'lucide-react';

interface Classroom {
  id: string;
  name: string; // compatibility
  level: string; // compatibility
  section: string; // compatibility
  capacity: number; // compatibility
  
  // New specific fields
  class_level: string;
  room_code: string;
  full_name: string;
  max_capacity: number;
  campus: string;
  created_at?: string;
}

interface Student {
  id: string;
  full_name: string;
  student_code: string;
  classroom_id: string | null;
  campus: string;
}

interface StudentClassroom {
  id: string;
  student_id: string;
  classroom_id: string;
  academic_year: string;
  status: 'active' | 'inactive' | 'alumni';
  created_at?: string;
}

export default function Salles() {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language === 'fr';
  const { profile } = useAuth();

  const userRole = profile?.role || 'visiteur';
  const isStaff = !['eleve', 'professeur'].includes(userRole);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentClassrooms, setStudentClassrooms] = useState<StudentClassroom[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active view states
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  // Form states (create/edit model)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classLevel, setClassLevel] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number>(40);

  // Modals for student actions
  const [studentToChange, setStudentToChange] = useState<Student | null>(null);
  const [newClassroomIdForTransfer, setNewClassroomIdForTransfer] = useState('');

  const activeCampus = profile?.campus || 'fondamantal';
  const cleanCampus = activeCampus === 'fondamantal' || activeCampus === 'fondamentale' ? 'fondamantal' : 'secondaire';
  const currentAcademicYear = localStorage.getItem('codosa_active_academic_year') || '2025-2026';

  useEffect(() => {
    loadAllData();
  }, [cleanCampus]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Classrooms
      let fetchedRooms: Classroom[] = [];
      try {
        const { data: roomsData, error: dbErr1 } = await supabase
          .from('classrooms')
          .select('*')
          .eq('campus', cleanCampus);

        if (!dbErr1 && roomsData) {
          fetchedRooms = roomsData.map((r: any) => ({
            id: r.id,
            name: r.name || r.full_name,
            level: r.level || r.class_level,
            section: r.section || r.room_code,
            capacity: r.capacity || r.max_capacity || 40,
            class_level: r.class_level || r.level || '',
            room_code: r.room_code || r.section || '',
            full_name: r.full_name || r.name,
            max_capacity: r.max_capacity || r.capacity || 40,
            campus: r.campus || cleanCampus,
            created_at: r.created_at
          }));
        }
      } catch (err) {
        console.warn("Classrooms Supabase load fallback:", err);
      }

      if (fetchedRooms.length === 0) {
        const saved = localStorage.getItem(`codosa_classrooms_${cleanCampus}`);
        if (saved) {
          fetchedRooms = JSON.parse(saved);
        } else {
          // Defaults if empty
          fetchedRooms = cleanCampus === 'fondamantal' ? [
            {
              id: '1', name: '7èA', level: '7è Ane', section: 'A', capacity: 40,
              class_level: '7è Ane', room_code: 'A', full_name: '7èA', max_capacity: 40, campus: 'fondamantal'
            },
            {
              id: '2', name: '7èB', level: '7è Ane', section: 'B', capacity: 40,
              class_level: '7è Ane', room_code: 'B', full_name: '7èB', max_capacity: 40, campus: 'fondamantal'
            }
          ] : [
            {
              id: '3', name: 'NS1A', level: 'NS1', section: 'A', capacity: 35,
              class_level: 'NS1', room_code: 'A', full_name: 'NS1A', max_capacity: 35, campus: 'secondaire'
            }
          ];
          localStorage.setItem(`codosa_classrooms_${cleanCampus}`, JSON.stringify(fetchedRooms));
        }
      }
      setClassrooms(fetchedRooms);

      // 2. Fetch Students
      let fetchedStudents: Student[] = [];
      try {
        const { data: studentsData, error: dbErr2 } = await supabase
          .from('students')
          .select('*')
          .eq('campus', cleanCampus);

        if (!dbErr2 && studentsData) {
          fetchedStudents = studentsData;
        }
      } catch (err) {
        console.warn("Students Supabase load fallback:", err);
      }

      if (fetchedStudents.length === 0) {
        const saved = localStorage.getItem(`codosa_students_${cleanCampus}`);
        if (saved) {
          fetchedStudents = JSON.parse(saved);
        } else {
          // Defaults
          fetchedStudents = [
            { id: 'st1', full_name: 'Jean Jacques', student_code: 'COD-134', classroom_id: '1', campus: cleanCampus },
            { id: 'st2', full_name: 'Marie Rose Lamy', student_code: 'COD-789', classroom_id: '1', campus: cleanCampus },
            { id: 'st3', full_name: 'Steven Paul', student_code: 'COD-221', classroom_id: '2', campus: cleanCampus }
          ];
          localStorage.setItem(`codosa_students_${cleanCampus}`, JSON.stringify(fetchedStudents));
        }
      }
      setStudents(fetchedStudents);

      // 3. Fetch StudentClassrooms mappings
      let fetchedMappings: StudentClassroom[] = [];
      try {
        const { data: mapData } = await supabase
          .from('student_classroom')
          .select('*')
          .eq('academic_year', currentAcademicYear);
        if (mapData) fetchedMappings = mapData;
      } catch (err) {
        console.warn("StudentClassrooms schema fallback", err);
      }
      if (fetchedMappings.length === 0) {
        const saved = localStorage.getItem(`codosa_student_classroom_${cleanCampus}`);
        if (saved) {
          fetchedMappings = JSON.parse(saved);
        } else {
          // Default mapping
          fetchedMappings = [
            { id: 'm1', student_id: 'st1', classroom_id: '1', academic_year: currentAcademicYear, status: 'active' },
            { id: 'm2', student_id: 'st2', classroom_id: '1', academic_year: currentAcademicYear, status: 'active' },
            { id: 'm3', student_id: 'st3', classroom_id: '2', academic_year: currentAcademicYear, status: 'active' }
          ];
          localStorage.setItem(`codosa_student_classroom_${cleanCampus}`, JSON.stringify(fetchedMappings));
        }
      }
      setStudentClassrooms(fetchedMappings);

    } catch (err: any) {
      setError(err.message || "Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingClassroom(null);
    setClassLevel('');
    setRoomCode('');
    setMaxCapacity(40);
    setShowFormModal(true);
  };

  const handleOpenEdit = (room: Classroom, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    setEditingClassroom(room);
    setClassLevel(room.class_level || room.level);
    setRoomCode(room.room_code || room.section);
    setMaxCapacity(room.max_capacity || room.capacity);
    setShowFormModal(true);
  };

  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classLevel.trim() || !roomCode.trim()) return;

    setLoading(true);
    setError('');

    const generatedFullName = `${classLevel.trim()}-${roomCode.trim()}`;
    const newId = editingClassroom ? editingClassroom.id : crypto.randomUUID();

    const payloadClassroom: Classroom = {
      id: newId,
      class_level: classLevel.trim(),
      room_code: roomCode.trim(),
      full_name: generatedFullName,
      max_capacity: maxCapacity,
      campus: cleanCampus,
      
      // compatibility fields
      name: generatedFullName,
      level: classLevel.trim(),
      section: roomCode.trim(),
      capacity: maxCapacity,
      created_at: editingClassroom ? editingClassroom.created_at : new Date().toISOString()
    };

    // 1. Try to persist to Supabase
    try {
      if (editingClassroom) {
        const { error: dbErr } = await supabase
          .from('classrooms')
          .update({
            class_level: payloadClassroom.class_level,
            room_code: payloadClassroom.room_code,
            full_name: payloadClassroom.full_name,
            max_capacity: payloadClassroom.max_capacity,
            name: payloadClassroom.name,
            level: payloadClassroom.level,
            section: payloadClassroom.section,
            capacity: payloadClassroom.capacity
          })
          .eq('id', newId);

        if (dbErr) throw dbErr;
      } else {
        const { error: dbErr } = await supabase
          .from('classrooms')
          .insert({
            id: newId,
            class_level: payloadClassroom.class_level,
            room_code: payloadClassroom.room_code,
            full_name: payloadClassroom.full_name,
            max_capacity: payloadClassroom.max_capacity,
            name: payloadClassroom.name,
            level: payloadClassroom.level,
            section: payloadClassroom.section,
            capacity: payloadClassroom.capacity,
            campus: cleanCampus
          });

        if (dbErr) throw dbErr;
      }
    } catch (err: any) {
      console.warn("Persisting classroom to Supabase failed, fallback locally:", err);
    }

    // 2. Perform Local memory & localStorage sync
    let nextClassrooms = [...classrooms];
    if (editingClassroom) {
      nextClassrooms = nextClassrooms.map(c => c.id === newId ? payloadClassroom : c);
    } else {
      nextClassrooms.push(payloadClassroom);
    }

    setClassrooms(nextClassrooms);
    localStorage.setItem(`codosa_classrooms_${cleanCampus}`, JSON.stringify(nextClassrooms));

    // Update selected classroom card details if active
    if (selectedClassroom && selectedClassroom.id === newId) {
      setSelectedClassroom(payloadClassroom);
    }

    setSuccess(isFr ? "Salle de classe enregistrée !" : "Klas sove avèk siksè !");
    setShowFormModal(false);
    setLoading(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteClassroom = async (classId: string, className: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(isFr 
      ? `Voulez-vous vraiment supprimer la salle de classe ${className} ?` 
      : `Èske ou vle siprime klas ${className} lan tout bon vre ?`)) return;

    setLoading(true);
    try {
      // 1. Delete from Supabase
      await supabase.from('classrooms').delete().eq('id', classId);
    } catch (err) {
      console.warn("Supabase classroom delete failed, fallback locally", err);
    }

    // 2. Local fallback
    const nextClassrooms = classrooms.filter(c => c.id !== classId);
    setClassrooms(nextClassrooms);
    localStorage.setItem(`codosa_classrooms_${cleanCampus}`, JSON.stringify(nextClassrooms));

    // Deselect if active
    if (selectedClassroom && selectedClassroom.id === classId) {
      setSelectedClassroom(null);
    }

    setSuccess(isFr ? "Salle de classe supprimée !" : "Salle sa a siprime !");
    setLoading(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleOpenTransfer = (student: Student) => {
    setStudentToChange(student);
    setNewClassroomIdForTransfer(student.classroom_id || '');
  };

  const handleTransferStudent = async () => {
    if (!studentToChange || !newClassroomIdForTransfer) return;

    setLoading(true);
    try {
      const targetClassroom = classrooms.find(c => c.id === newClassroomIdForTransfer);
      const targetClassName = targetClassroom ? targetClassroom.full_name : '';

      // 1. Update students table (classroom_id and classroom column)
      try {
        await supabase
          .from('students')
          .update({ classroom_id: newClassroomIdForTransfer })
          .eq('id', studentToChange.id);
        
        // sync main users as well
        await supabase
          .from('users')
          .update({ classroom: targetClassName })
          .eq('id', studentToChange.id);
      } catch (err) {
        console.warn("Supabase transfer student warning:", err);
      }

      // 2. Update student_classroom table
      try {
        const { data: existing } = await supabase
          .from('student_classroom')
          .select('*')
          .eq('student_id', studentToChange.id)
          .eq('academic_year', currentAcademicYear)
          .single();

        if (existing) {
          await supabase
            .from('student_classroom')
            .update({ classroom_id: newClassroomIdForTransfer, status: 'active' })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('student_classroom')
            .insert({
              student_id: studentToChange.id,
              classroom_id: newClassroomIdForTransfer,
              academic_year: currentAcademicYear,
              status: 'active'
            });
        }
      } catch (err) {
        console.warn("Supabase student_classroom link warning:", err);
      }

      // 3. Local sync
      const nextStudents = students.map(s => {
        if (s.id === studentToChange.id) {
          return { ...s, classroom_id: newClassroomIdForTransfer };
        }
        return s;
      });
      setStudents(nextStudents);
      localStorage.setItem(`codosa_students_${cleanCampus}`, JSON.stringify(nextStudents));

      const existingIndex = studentClassrooms.findIndex(sc => 
        sc.student_id === studentToChange.id && sc.academic_year === currentAcademicYear
      );
      let nextMappings = [...studentClassrooms];
      if (existingIndex > -1) {
        nextMappings[existingIndex] = { 
          ...nextMappings[existingIndex], 
          classroom_id: newClassroomIdForTransfer,
          status: 'active'
        };
      } else {
        nextMappings.push({
          id: crypto.randomUUID(),
          student_id: studentToChange.id,
          classroom_id: newClassroomIdForTransfer,
          academic_year: currentAcademicYear,
          status: 'active'
        });
      }
      setStudentClassrooms(nextMappings);
      localStorage.setItem(`codosa_student_classroom_${cleanCampus}`, JSON.stringify(nextMappings));

      setSuccess(isFr ? "Transfert d'élève réussi !" : "Elèv la transfere avèk siksè !");
      setStudentToChange(null);
    } catch (e: any) {
      setError(e.message || "Failed transfer");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleRemoveStudentFromClass = async (student: Student) => {
    if (!confirm(isFr
      ? `Voulez-vous vraiment retirer l'élève ${student.full_name} de cette classe ? L'élève sera désactivé sans supprimer son historique.`
      : `Èske ou vle retire elèv ${student.full_name} nan klas sa a? L ap vin inaktif san pèdi istwa li.`
    )) return;

    setLoading(true);
    try {
      // 1. Update students table (set classroom_id to null)
      try {
        await supabase
          .from('students')
          .update({ classroom_id: null })
          .eq('id', student.id);

        await supabase
          .from('users')
          .update({ classroom: null })
          .eq('id', student.id);
      } catch (err) {
        console.warn("Supabase remove student warning:", err);
      }

      // 2. Mark as inactive in student_classroom
      try {
        await supabase
          .from('student_classroom')
          .update({ status: 'inactive' })
          .eq('student_id', student.id)
          .eq('academic_year', currentAcademicYear);
      } catch (err) {
        console.warn("Supabase inactive link warning:", err);
      }

      // 3. Local sync
      const nextStudents = students.map(s => s.id === student.id ? { ...s, classroom_id: null } : s);
      setStudents(nextStudents);
      localStorage.setItem(`codosa_students_${cleanCampus}`, JSON.stringify(nextStudents));

      const nextMappings = studentClassrooms.map(sc => 
        (sc.student_id === student.id && sc.academic_year === currentAcademicYear)
          ? { ...sc, status: 'inactive' as const }
          : sc
      );
      setStudentClassrooms(nextMappings);
      localStorage.setItem(`codosa_student_classroom_${cleanCampus}`, JSON.stringify(nextMappings));

      setSuccess(isFr ? "Élève retiré et désactivé !" : "Retire elèv la ak siksè !");
    } catch (e: any) {
      setError(e.message || "Removal failed");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  if (!isStaff) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-gray-100">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-primary uppercase">Katye Refize</h2>
        <p className="text-orange-500 font-bold text-[10px] uppercase tracking-wider mb-2">Aksè Refize / Accès Refusé</p>
        <p className="text-gray-500 font-medium text-xs">Se sèlman Direktè oswa Censeur ki ka jere salles de classe yo.</p>
      </div>
    );
  }

  // Live Concatenation Preview helper
  const isFieldsFilled = classLevel.trim() !== '' && roomCode.trim() !== '';
  const concatenatedPreview = isFieldsFilled ? `${classLevel.trim()}-${roomCode.trim()}` : '';

  // Filter students enrolled in active room
  const getEnrolledCount = (roomId: string) => {
    // A student is currently active in a room if their classroom_id is equal or active state mappings matches
    return students.filter(s => s.classroom_id === roomId).length;
  };

  const getEnrolledStudents = (roomId: string) => {
    return students.filter(s => s.classroom_id === roomId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            {isFr ? "Gestion des Salles de Classe" : "Jesyon Salles de Classe"}
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
          <span>{isFr ? "Créer une Salle" : "Kreye yon nouvo klas"}</span>
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

      {/* Main Layout Grid (Room cards vs Student list sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Salles cards list */}
        <div className={`${selectedClassroom ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-primary">
              🏫 {isFr ? "Les Salles Actives" : "Lis klas pou campus sa a"}
            </h3>
            <span className="text-xs font-mono font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{classrooms.length} Salles</span>
          </div>

          {loading && classrooms.length === 0 ? (
            <div className="flex justify-center py-12"><div className="loader" /></div>
          ) : classrooms.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-bold bg-gray-50 rounded-[2rem] border border-gray-150">
              <Plus size={48} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm">{isFr ? "Aucune salle de classe" : "Pa gen okenn salle de classe"}</p>
              <button onClick={handleOpenAdd} className="text-xs text-secondary underline mt-1 font-black uppercase hover:opacity-85">Créer une salle maintenant</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classrooms.map((room) => {
                const count = getEnrolledCount(room.id);
                const isSelected = selectedClassroom?.id === room.id;
                return (
                  <motion.div
                    layout
                    key={room.id}
                    onClick={() => setSelectedClassroom(room)}
                    className={`cursor-pointer p-6 rounded-[2rem] border ${isSelected ? 'border-secondary bg-secondary/5 ring-2 ring-secondary/15' : 'border-gray-150 bg-white hover:bg-gray-50/50'} relative shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
                  >
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-secondary tracking-wider">
                          Niveau: {room.class_level || room.level}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleOpenEdit(room, e)}
                            className="p-1.5 hover:bg-gray-200/50 rounded-lg text-primary transition-colors"
                            title={isFr ? "Modifier" : "Deziyen"}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClassroom(room.id, room.full_name || room.name, e)}
                            className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                            title={isFr ? "Supprimer" : "Siprime"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h2 className="text-3xl font-black text-[#010657] leading-none">
                        {room.full_name || room.name}
                      </h2>

                      <div className="flex justify-between items-center text-xs text-gray-500 font-bold pt-1">
                        <span className="flex items-center space-x-1.5 font-mono text-xs">
                          <Users size={14} className="text-secondary opacity-70" />
                          <span>{count} / {room.max_capacity || room.capacity || 40} élèves</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-50 rounded px-2">code: {room.room_code || room.section || 'A'}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Students Drill-down (conditional) */}
        {selectedClassroom && (
          <div className="lg:col-span-5 bg-white p-6 rounded-[2.5rem] border border-gray-150 shadow-sm space-y-4 animate-in slide-in-from-right-2 duration-300">
            <div className="flex items-start justify-between border-b border-gray-150 pb-4">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#09b5f2]">Salle active / Drill-down</span>
                <h3 className="text-2xl font-black text-[#010657] uppercase leading-none mt-1">
                  {selectedClassroom.full_name || selectedClassroom.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedClassroom(null)}
                className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 justify-between items-center bg-gray-50 px-4 py-3 rounded-2xl text-xs font-bold text-primary">
              <span>Capacité Salle: {selectedClassroom.max_capacity || selectedClassroom.capacity || 40} élèves</span>
              <span>Inscrits: {getEnrolledCount(selectedClassroom.id)} élèves</span>
            </div>

            {/* Students List in selected room */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-secondary text-left">
                👨‍🎓 {isFr ? "Élèves inscrits" : "Lis elèv yo"}
              </h4>

              {getEnrolledStudents(selectedClassroom.id).length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-bold text-xs bg-gray-50 rounded-2xl border border-dashed">
                  {isFr ? "Aucun élève n'est encore inscrit dans cette classe." : "Okenn elèv poko asiyen nan klas sa a."}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-1">
                  {getEnrolledStudents(selectedClassroom.id).map((student) => (
                    <div key={student.id} className="py-3.5 flex items-center justify-between group">
                      <div className="min-w-0 text-left">
                        <p className="font-extrabold text-sm text-primary truncate uppercase">{student.full_name}</p>
                        <p className="font-mono text-[10px] text-gray-400 mt-0.5">Code: {student.student_code || student.id.slice(0, 8)}</p>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenTransfer(student)}
                          className="px-3 py-1.5 bg-[#010657]/5 hover:bg-[#010657]/10 text-[#010657] text-[10px] font-black uppercase tracking-wide rounded-xl flex items-center space-x-1 transition-all"
                          title="Changer de classe"
                        >
                          <ArrowLeftRight size={12} />
                          <span>Changer</span>
                        </button>
                        <button
                          onClick={() => handleRemoveStudentFromClass(student)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retirer"
                        >
                          <FolderMinus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE / EDIT CLASSROOM FORM */}
      <AnimatePresence>
        {showFormModal && (
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
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setShowFormModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-primary transition-all rounded-full"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black text-[#010657] uppercase tracking-tight mb-4">
                {editingClassroom ? (isFr ? "Modifier la Salle" : "Modifye klas la") : (isFr ? "Créer une Salle de Classe" : "Kreye yon nouvo klas")}
              </h2>

              <form onSubmit={handleSaveClassroom} className="space-y-5">
                {/* Field 1: Classe */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                    Classe (Niveau d'études)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: S2, S3, NS1, NS4, Terminale..."
                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-2xl outline-none font-bold text-sm text-primary"
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                  />
                  <span className="text-[10px] text-gray-400 block font-medium">Saisissez le niveau d'études sans la section.</span>
                </div>

                {/* Field 2: Salle */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                    Salle / Section (Identifiant unique)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: A, B, C, Rouge..."
                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-2xl outline-none font-bold text-sm text-primary"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                  />
                  <span className="text-[10px] text-gray-400 block font-medium">Saisissez l'identifiant physique de la salle.</span>
                </div>

                {/* Live Name Preview */}
                {isFieldsFilled && (
                  <div className="bg-secondary/10 border border-secondary/20 p-4 rounded-2xl text-xs space-y-1 animate-pulse">
                    <p className="font-extrabold uppercase text-secondary">Aperçu du nom généré :</p>
                    <p className="font-black text-[#010657] text-md">Nom de la salle: <strong className="font-bold underline">{concatenatedPreview}</strong></p>
                  </div>
                )}

                {/* Field 3: Capacité */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                    Capacité maximale (Élèves)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    placeholder="40"
                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-secondary transition-colors rounded-2xl outline-none font-bold text-sm text-primary"
                    value={maxCapacity || ''}
                    onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Campus Auto-filled */}
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Campus assigné
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full p-3.5 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest"
                    value={`${cleanCampus} (Détecté)`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#010657] text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all hover:opacity-95 shadow-md active:scale-95 disabled:opacity-50"
                >
                  <span>{isFr ? "Enregistrer" : "Sove"}</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: TRANSFER STUDENT (CHANGER DE CLASSE) */}
      <AnimatePresence>
        {studentToChange && (
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
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setStudentToChange(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-primary rounded-full transition-colors"
              >
                <X size={18} />
              </button>

              <h2 className="text-lg font-black text-primary uppercase tracking-tight mb-4">
                🔄 {isFr ? "Transférer l'élève" : "Chanje Klas Elèv la"}
              </h2>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-1">
                  <p className="text-gray-400 uppercase font-black tracking-wide">Élève sélectionné :</p>
                  <p className="font-extrabold text-sm text-[#010657] uppercase">{studentToChange.full_name}</p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                    Choisir la nouvelle classe :
                  </label>
                  <select
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-secondary/25 transition-all text-sm font-bold border-none"
                    value={newClassroomIdForTransfer}
                    onChange={(e) => setNewClassroomIdForTransfer(e.target.value)}
                  >
                    <option value="">-- Sélectionnez une Salle --</option>
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    onClick={() => setStudentToChange(null)}
                    className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-xs uppercase text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleTransferStudent}
                    disabled={loading || !newClassroomIdForTransfer}
                    className="flex-1 bg-[#010657] text-white p-3 rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
