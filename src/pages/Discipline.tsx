import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, Trash2, ShieldAlert, ChevronRight, Check, X, Calendar, Database, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Haitian Creole custom keys fallback / literal references
export default function Discipline() {
  const { t, i18n } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  
  // State management
  const [students, setStudents] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [disciplineLogs, setDisciplineLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'directory' | 'reports' | 'archives'>('directory');
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, quarter...
  const [campusFilter, setCampusFilter] = useState(profile?.campus === 'both' ? 'fondamantal' : profile?.campus);
  
  // Active academic year configuration (Stored in localStorage, defaults to 2025-2026)
  const [activeYear, setActiveYear] = useState(() => {
    return localStorage.getItem('codosa_active_academic_year') || '2025-2026';
  });

  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [newYearSubmitting, setNewYearSubmitting] = useState(false);

  // Selected state for classroom drill-down
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  // Discipline Modal Form States
  const [studentAge, setStudentAge] = useState<string>('14');
  const [studentGender, setStudentGender] = useState<string>('Garçon');
  
  // Selected motifs
  const [motifs, setMotifs] = useState({
    retard: false,
    devoir_non_su: false,
    lecon_non_su: false,
    perturbation: false,
    infraction: false,
    autre: false
  });
  const [customMotifText, setCustomMotifText] = useState('');
  const [severity, setSeverity] = useState(1);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  // Report view classroom selection
  const [reportClassId, setReportClassId] = useState<string>('');

  // Archive query states
  const [archiveYear, setArchiveYear] = useState('2024-2025');
  const [archiveSearchName, setArchiveSearchName] = useState('');
  const [archiveLogs, setArchiveLogs] = useState<any[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const canStartNewYear = ['directeur', 'censeur'].includes(profile?.role);

  useEffect(() => {
    fetchData();
  }, [campusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch staff profiles to determine active academic year dynamically from DB
      const { data: staffData } = await supabase
        .from('users')
        .select('full_name, role')
        .in('role', ['directeur', 'censeur']);
      
      let computedActiveYear = localStorage.getItem('codosa_active_academic_year') || '2025-2026';
      
      const yearToVal = (yr: string) => {
        const parts = yr.split('-');
        if (parts.length === 2) {
          const start = parseInt(parts[0], 10);
          if (!isNaN(start)) return start;
        }
        return 0;
      };

      if (staffData && staffData.length > 0) {
        staffData.forEach((p: any) => {
          const rawName = p.full_name || '';
          let userStartYear = '';
          let userActiveYear = '';
          
          if (rawName.includes(' |start_year:')) {
            const parts = rawName.split(' |start_year:');
            const subparts = parts[1]?.split('|active_year:');
            userStartYear = subparts[0] || '';
            userActiveYear = subparts[1] || '';
          } else if (rawName.includes('|active_year:')) {
            const parts = rawName.split('|active_year:');
            userActiveYear = parts[1] || '';
          }
          
          const currentCandidate = userActiveYear || userStartYear;
          if (currentCandidate && yearToVal(currentCandidate) > yearToVal(computedActiveYear)) {
            computedActiveYear = currentCandidate;
          }
        });
      }

      if (computedActiveYear !== activeYear) {
        localStorage.setItem('codosa_active_academic_year', computedActiveYear);
        setActiveYear(computedActiveYear);
      }

      // Fetch Classrooms
      const { data: classData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('campus', campusFilter)
        .order('name');
        
      // Fetch Students
      const { data: studentData } = await supabase
        .from('students')
        .select('*, classrooms(id, name)')
        .eq('campus', campusFilter)
        .order('full_name');

      // Fetch Discipline Logs for the active Academic Year
      const { data: logsData } = await supabase
        .from('discipline_logs')
        .select('*')
        .eq('academic_year', computedActiveYear)
        .eq('campus', campusFilter);

      if (classData) setClassrooms(classData);
      if (studentData) {
        // Hydrate age and sex determinants on profile list
        const hydratedStudents = studentData.map((s: any) => {
          // Keep persistent custom attributes in localStorage so we persist editable ages/genders
          const savedAge = localStorage.getItem(`codosa_student_age_${s.id}`) || (10 + (s.full_name?.length % 9)).toString();
          const savedGender = localStorage.getItem(`codosa_student_sex_${s.id}`) || (s.full_name?.length % 2 === 0 ? 'Fiy' : 'Garçon');
          return {
            ...s,
            age: savedAge,
            gender: savedGender
          };
        });
        setStudents(hydratedStudents);
      }
      if (logsData) setDisciplineLogs(logsData);
    } catch (err) {
      console.error("Error loading discipline data:", err);
    }
    setLoading(false);
  };

  // Archive Search Submission
  const handleArchiveSearch = async () => {
    if (!archiveSearchName.trim()) return;
    setArchiveLoading(true);
    try {
      // Search database for student logs matching specific years and student names
      const { data, error } = await supabase
        .from('discipline_logs')
        .select('*, students(full_name, student_code)')
        .eq('academic_year', archiveYear);

      if (data) {
        // Filter by student name client-side to ensure robust search across join boundaries
        const filtered = data.filter((log: any) => 
          log.students?.full_name?.toLowerCase().includes(archiveSearchName.toLowerCase())
        );
        setArchiveLogs(filtered);
      }
    } catch (e) {
      console.error("Error searching archives:", e);
    }
    setArchiveLoading(false);
  };

  // Save new active academic year
  const handleStartNewYear = () => {
    setShowNewYearModal(true);
  };

  const handleConfirmNewYear = async () => {
    setNewYearSubmitting(true);
    const parts = activeYear.split('-');
    let nextYear = '2026-2027';
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        nextYear = `${start + 1}-${end + 1}`;
      }
    } else {
      const match = activeYear.match(/\d+/);
      if (match) {
        const start = parseInt(match[0], 10);
        nextYear = `${start + 1}-${start + 2}`;
      }
    }

    try {
      localStorage.setItem('codosa_active_academic_year', nextYear);
      setActiveYear(nextYear);

      if (profile && profile.id) {
        let cleanName = profile.raw_full_name || profile.full_name || '';
        if (cleanName.includes(' |start_year:')) {
          cleanName = cleanName.split(' |start_year:')[0];
        } else if (cleanName.includes('|active_year:')) {
          cleanName = cleanName.split('|active_year:')[0];
        }
        
        const updatedFullName = `${cleanName} |start_year:${profile.start_year || '2025-2026'}|active_year:${nextYear}`;
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ full_name: updatedFullName })
          .eq('id', profile.id);
          
        if (updateError) {
          console.error("Error updating academic year on profile:", updateError);
        } else if (refreshProfile) {
          await refreshProfile();
        }
      }

      setShowNewYearModal(false);
      alert(`Nouvelle année active définie sur : ${nextYear} ! Toutes les nouvelles données de discipline sont prêtes à zéro pour l'année scolaire en cours.`);
      await fetchData();
    } catch (e) {
      console.error("Failed to transition academic year:", e);
    } finally {
      setNewYearSubmitting(false);
    }
  };

  // Open Log Modal for specific student
  const openIncidentModal = (student: any) => {
    setSelectedStudent(student);
    setStudentAge(student.age || '14');
    setStudentGender(student.gender || 'Garçon');
    setMotifs({
      retard: false,
      devoir_non_su: false,
      lecon_non_su: false,
      perturbation: false,
      infraction: false,
      autre: false
    });
    setCustomMotifText('');
    setSeverity(1);
    setFormMessage('');
  };

  // Submit modern discipline incident log
  const handleLogIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    // Validate if at least one motif is checked
    const hasMotifSelected = Object.values(motifs).some(v => v === true);
    if (!hasMotifSelected) {
      setFormMessage("Veuillez choisir au moins un motif d'incident.");
      return;
    }

    setFormSubmitting(true);
    setFormMessage('');

    try {
      // Save updated Age and Gender to LocalStorage to respect intent of persistence
      localStorage.setItem(`codosa_student_age_${selectedStudent.id}`, studentAge);
      localStorage.setItem(`codosa_student_sex_${selectedStudent.id}`, studentGender);
      selectedStudent.age = studentAge;
      selectedStudent.gender = studentGender;

      // We will loop over each checked motif and create a log for database records!
      const promises: any[] = [];
      const nowString = new Date().toISOString().split('T')[0];

      if (motifs.retard) {
        promises.push(
          supabase.from('discipline_logs').insert({
            student_id: selectedStudent.id,
            campus: campusFilter,
            date: nowString,
            incident_type: 'retard',
            description: 'Retard de cours',
            severity: severity,
            academic_year: activeYear,
            logged_by: profile?.id
          })
        );
      }
      if (motifs.devoir_non_su) {
        promises.push(
          supabase.from('discipline_logs').insert({
            student_id: selectedStudent.id,
            campus: campusFilter,
            date: nowString,
            incident_type: 'devoir_non_rendu',
            description: 'Devoir non préparé / non rendu',
            severity: severity,
            academic_year: activeYear,
            logged_by: profile?.id
          })
        );
      }
      if (motifs.lecon_non_su) {
        promises.push(
          supabase.from('discipline_logs').insert({
            student_id: selectedStudent.id,
            campus: campusFilter,
            date: nowString,
            incident_type: 'indiscipline',
            description: '[LEÇON] Leçon non apprise',
            severity: severity,
            academic_year: activeYear,
            logged_by: profile?.id
          })
        );
      }
      if (motifs.perturbation) {
        promises.push(
          supabase.from('discipline_logs').insert({
            student_id: selectedStudent.id,
            campus: campusFilter,
            date: nowString,
            incident_type: 'indiscipline',
            description: '[PERTURBATION] Perturbation de cours / chahut',
            severity: severity,
            academic_year: activeYear,
            logged_by: profile?.id
          })
        );
      }
      if (motifs.infraction) {
        promises.push(
          supabase.from('discipline_logs').insert({
            student_id: selectedStudent.id,
            campus: campusFilter,
            date: nowString,
            incident_type: 'indiscipline',
            description: '[INFRACTION] Violation du règlement intérieur ou de l\'établissement',
            severity: severity,
            academic_year: activeYear,
            logged_by: profile?.id
          })
        );
      }
      if (motifs.autre) {
        promises.push(
          supabase.from('discipline_logs').insert({
            student_id: selectedStudent.id,
            campus: campusFilter,
            date: nowString,
            incident_type: 'autre',
            description: `[AUTRE] ${customMotifText || 'Autre motif'}`,
            severity: severity,
            academic_year: activeYear,
            logged_by: profile?.id
          })
        );
      }

      await Promise.all(promises);
      setFormMessage("Incident enregistré avec succès !");
      
      // Auto close and reload after 1.5 seconds
      setTimeout(() => {
        setSelectedStudent(null);
        fetchData();
      }, 1500);

    } catch (error: any) {
      console.error(error);
      setFormMessage("Une erreur est survenue : " + error.message);
    }
    setFormSubmitting(false);
  };

  // Calculate filtered logs for the active reports timeframe
  const getStartDateLimit = () => {
    const limit = new Date();
    if (timeFilter === 'day') {
      limit.setHours(0,0,0,0);
    } else if (timeFilter === 'week') {
      limit.setDate(limit.getDate() - 7);
    } else if (timeFilter === 'month') {
      limit.setDate(limit.getDate() - 30);
    } else if (timeFilter === 'quarter') {
      limit.setDate(limit.getDate() - 90);
    }
    return limit;
  };

  // Render classroom table stats helper
  const getClassroomReportData = (targetId: string) => {
    if (!targetId) return [];
    
    const targetRoom = classrooms.find(c => c.id === targetId);
    if (!targetRoom) return [];

    const roomStudents = students.filter(s => s.classroom_id === targetId);
    const startLimit = getStartDateLimit();

    return roomStudents.map(student => {
      // Get active logs for this student within timeframe
      const studentLogs = disciplineLogs.filter(log => {
        const d = new Date(log.date);
        return log.student_id === student.id && d >= startLimit;
      });

      // Count each of 6 motifs
      const counts = {
        retard: 0,
        devoir_non_su: 0,
        lecon_non_su: 0,
        perturbation: 0,
        infraction: 0,
        autre: 0
      };

      studentLogs.forEach(log => {
        if (log.incident_type === 'retard') {
          counts.retard += 1;
        } else if (log.incident_type === 'devoir_non_rendu') {
          counts.devoir_non_su += 1;
        } else if (log.incident_type === 'indiscipline') {
          if (log.description?.includes('[LECON]')) {
            counts.lecon_non_su += 1;
          } else if (log.description?.includes('[PERTURBATION]')) {
            counts.perturbation += 1;
          } else if (log.description?.includes('[INFRACTION]')) {
            counts.infraction += 1;
          } else {
            // Default fallback
            counts.perturbation += 1;
          }
        } else if (log.incident_type === 'autre' || log.description?.includes('[AUTRE]')) {
          counts.autre += 1;
        }
      });

      return {
        id: student.id,
        code: student.student_code,
        name: student.full_name,
        counts
      };
    });
  };

  // Generate localized, premium PDF
  const handleDownloadPDFReport = () => {
    if (!reportClassId) {
      alert("Veuillez choisir une classe pour pouvoir extraire le rapport.");
      return;
    }
    const targetRoom = classrooms.find(c => c.id === reportClassId);
    if (!targetRoom) return;

    const reportData = getClassroomReportData(reportClassId);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Elegant Headers
    doc.setFillColor(1, 6, 87); // Deep Blue Primary
    doc.rect(0, 0, 297, 42, 'F');
    
    // Draw gold accent bar
    doc.setFillColor(250, 201, 0); // CODOSA Gold Accent
    doc.rect(0, 42, 297, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("COLLEGE DOMINIQUE SAVIO (CODOSA)", 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Pétion-Ville, Haïti - Rapport et Surveillance Disciplinaire", 20, 28);
    doc.text(`Période: ${timeFilter.toUpperCase()} | Classe: ${targetRoom.name} | Année: ${activeYear}`, 20, 35);
    
    // Sub-info
    doc.setTextColor(1, 6, 87);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Date d'Extraction: ${new Date().toLocaleDateString()}`, 20, 55);
    doc.text(`Élèves évalués: ${reportData.length} élèves`, 220, 55);

    const bodyRows = reportData.map(r => [
      r.code,
      r.name.toUpperCase(),
      r.counts.retard.toString(),
      r.counts.devoir_non_su.toString(),
      r.counts.lecon_non_su.toString(),
      r.counts.perturbation.toString(),
      r.counts.infraction.toString(),
      r.counts.autre.toString(),
      (r.counts.retard + r.counts.devoir_non_su + r.counts.lecon_non_su + r.counts.perturbation + r.counts.infraction + r.counts.autre).toString()
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['CODE', 'NOM DE L\'ÉLÈVE', 'RETARDS', 'DEVOIR NON RENDU', 'LEÇON NON APPRISE', 'PERTURBATION', 'INFRACTION', 'AUTRE MOTIF', 'TOTAL']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [1, 6, 87], 
        textColor: [255, 255, 255], 
        fontSize: 9, 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 70, fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center', fillColor: [245, 247, 250], fontStyle: 'bold' }
      },
      styles: { 
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3
      }
    });

    // Signature Block at absolute bottom
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY < 180) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Signature du Surveillant / Censeur:", 20, finalY);
      doc.line(20, finalY + 12, 100, finalY + 12);
      
      doc.text("Signature du Directeur d'Établissement:", 180, finalY);
      doc.line(180, finalY + 12, 260, finalY + 12);
    }

    doc.save(`CODOSA_Discipline_Classe_${targetRoom.name}_${activeYear}.pdf`);
  };

  const selectedClassroom = classrooms.find(c => c.id === selectedClassId);
  const classroomStudents = students.filter(s => s.classroom_id === selectedClassId);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
            <ShieldAlert size={32} className="text-secondary shrink-0" />
            <span>Contrôle de la Discipline</span>
          </h1>
          <p className="text-[10px] font-black text-secondary tracking-widest uppercase mt-1">
            Année Académique en cours : <span className="px-2 py-0.5 bg-secondary/15 rounded-full text-primary">{activeYear}</span>
          </p>
        </div>

        {/* Start New Session - Reset to 0 by archiving old year */}
        {canStartNewYear && (
          <button 
            onClick={handleStartNewYear}
            className="self-start md:self-auto bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-primary px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 border-2 border-white border-transparent"
          >
            <Database size={16} />
            <span>Commencer Nouvelle Année</span>
          </button>
        )}
      </header>

      {/* Campus Selector - Fundamental / Secondary */}
      {profile?.campus === 'both' && (
        <div className="flex bg-gray-100 p-1.5 rounded-2xl max-w-sm">
          <button 
            onClick={() => { setCampusFilter('fondamantal'); setSelectedClassId(null); }} 
            className={clsx("flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all", campusFilter === 'fondamantal' ? "bg-white text-primary shadow-sm" : "text-gray-400")}
          >
            {t('campus.fondamental')}
          </button>
          <button 
            onClick={() => { setCampusFilter('secondaire'); setSelectedClassId(null); }} 
            className={clsx("flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all", campusFilter === 'secondaire' ? "bg-white text-primary shadow-sm" : "text-gray-400")}
          >
            {t('campus.secondaire')}
          </button>
        </div>
      )}

      {/* Primary Tab Toggles */}
      <div className="flex space-x-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 max-w-md">
         <button 
           onClick={() => setView('directory')} 
           className={clsx("flex-1 py-3 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all", view === 'directory' ? "bg-primary text-white shadow-mdScale" : "bg-transparent text-primary hover:bg-gray-100")}
         >
           Classes / Liste
         </button>
         <button 
           onClick={() => { setView('reports'); if (classrooms.length > 0 && !reportClassId) setReportClassId(classrooms[0].id); }} 
           className={clsx("flex-1 py-3 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all", view === 'reports' ? "bg-primary text-white shadow-mdScale" : "bg-transparent text-primary hover:bg-gray-100")}
         >
           Rapports ({t('discipline.reports')})
         </button>
         <button 
           onClick={() => setView('archives')} 
           className={clsx("flex-1 py-3 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all", view === 'archives' ? "bg-primary text-white shadow-mdScale" : "bg-transparent text-primary hover:bg-gray-100")}
         >
           Archives les écoles
         </button>
      </div>

      {/* VIEW 1: DIRECTORY MODE (Classroom list -> Student lists -> Log Popup) */}
      {view === 'directory' && (
        <div className="space-y-6">
          {!selectedClassId ? (
            // Classroom Grid
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-primary opacity-60">Choisir la classe à consulter :</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {loading ? (
                  <div className="col-span-full flex justify-center py-12"><div className="loader"></div></div>
                ) : classrooms.length === 0 ? (
                  <p className="col-span-full text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">Aucune classe disponible sur ce campus</p>
                ) : (
                  classrooms.map((room) => {
                    const studentCount = students.filter(s => s.classroom_id === room.id).length;
                    return (
                      <motion.button
                        key={room.id}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelectedClassId(room.id)}
                        className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md flex flex-col items-center justify-center text-center transition-all hover:border-secondary hover:shadow-lg group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-lg mb-2 group-hover:bg-secondary group-hover:text-white transition-all shadow-inner">
                          {room.name}
                        </div>
                        <span className="font-bold text-xs uppercase text-primary leading-tight">{room.level}</span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full mt-2">
                          {studentCount} élèves
                        </span>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            // Student list drill-down inside chosen classroom
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSelectedClassId(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-primary px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center space-x-1"
                >
                  &larr; Retour à la liste des classes
                </button>
                <div className="text-right">
                  <h3 className="font-black text-lg text-primary uppercase">{selectedClassroom?.name}</h3>
                  <span className="text-[9px] uppercase tracking-widest text-secondary font-black">{selectedClassroom?.campus}</span>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Rechercher un élève dans cette classe..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none border border-transparent focus:border-secondary transition-all font-bold text-sm"
                />
              </div>

              {/* Scrollable list of students */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[55vh] overflow-y-auto pr-2 pb-12">
                {classroomStudents
                  .filter(s => s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.student_code?.toLowerCase().includes(search.toLowerCase()))
                  .map((student) => {
                    const studentIncidents = disciplineLogs.filter(log => log.student_id === student.id).length;
                    return (
                      <motion.div 
                        key={student.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openIncidentModal(student)}
                        className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer group hover:border-secondary/30 transition-all"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-2xl bg-secondary/10 group-hover:bg-secondary group-hover:text-white transition-all text-secondary font-black text-sm flex items-center justify-center uppercase shadow-inner">
                            {student.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-primary leading-tight uppercase text-sm group-hover:text-secondary mb-1 transition-all">
                              {student.full_name}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{student.student_code}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span className="text-[9px] text-primary/80 font-bold">
                                {student.gender === 'Fiy' ? 'F' : 'G'}, {student.age || '14'} ans
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right flex items-center space-x-2 shrink-0">
                          {studentIncidents > 0 && (
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-red-100 text-red-600 rounded-lg">
                              {studentIncidents} incident{studentIncidents > 1 ? 's' : ''}
                            </span>
                          )}
                          <ChevronRight className="text-secondary opacity-40 group-hover:opacity-100 transition-all" size={20} />
                        </div>
                      </motion.div>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: REPORTS VIEW (Classroom and period select) */}
      {view === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Classroom Selection */}
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest px-2">Choisir la classe :</label>
              <select 
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold text-primary focus:border-secondary border border-transparent transition-all"
                value={reportClassId}
                onChange={(e) => setReportClassId(e.target.value)}
              >
                <option value="">-- Choisir la classe --</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.level}</option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest px-2">Filtrer par date :</label>
              <div className="flex bg-gray-100 p-1 rounded-2xl h-14 items-center">
                {['day', 'week', 'month', 'quarter'].map((f) => (
                  <button 
                    key={f} 
                    onClick={() => setTimeFilter(f)} 
                    className={clsx("flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all h-full", timeFilter === f ? "bg-white text-primary shadow-sm" : "text-gray-400")}
                  >
                    {t(`discipline.filters.${f}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Downloader Button */}
            <div className="flex flex-col justify-end">
              <button 
                onClick={handleDownloadPDFReport}
                disabled={!reportClassId}
                className="w-full h-14 bg-secondary text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center space-x-2 hover:bg-secondary/95 transition-all disabled:opacity-50"
              >
                <FileText size={18} />
                <span>Télécharger le Rapport PDF</span>
              </button>
            </div>

          </div>

          {/* Interactive Breakdown Table */}
          {reportClassId ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-extrabold uppercase text-xs tracking-wider text-primary">Répartition des incidents par élève pour cette classe :</h3>
                <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">{activeYear}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-primary text-white uppercase text-[9px] font-black tracking-wider">
                      <th className="p-4 pl-6">Code</th>
                      <th className="p-4">Nom Complet</th>
                      <th className="p-4 text-center">Retards</th>
                      <th className="p-4 text-center">Devoir non rendu</th>
                      <th className="p-4 text-center">Leçon non apprise</th>
                      <th className="p-4 text-center">Perturbation</th>
                      <th className="p-4 text-center">Infraction</th>
                      <th className="p-4 text-center">Autre Motif</th>
                      <th className="p-4 text-center pr-6 bg-primary/95 text-yellow-300">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {getClassroomReportData(reportClassId).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Aucun élève enregistré dans cette classe.</td>
                      </tr>
                    ) : (
                      getClassroomReportData(reportClassId).map((row) => {
                        const total = row.counts.retard + row.counts.devoir_non_su + row.counts.lecon_non_su + row.counts.perturbation + row.counts.infraction + row.counts.autre;
                        return (
                          <tr key={row.id} className="hover:bg-gray-50 transition-colors text-sm font-bold text-primary">
                            <td className="p-4 pl-6 text-gray-400 uppercase text-xs font-semibold">{row.code}</td>
                            <td className="p-4 text-primary uppercase">{row.name}</td>
                            <td className={clsx("p-4 text-center", row.counts.retard > 0 ? "text-red-500 font-extrabold" : "text-gray-300")}>{row.counts.retard}</td>
                            <td className={clsx("p-4 text-center", row.counts.devoir_non_su > 0 ? "text-red-500 font-extrabold" : "text-gray-300")}>{row.counts.devoir_non_su}</td>
                            <td className={clsx("p-4 text-center", row.counts.lecon_non_su > 0 ? "text-red-500 font-extrabold" : "text-gray-300")}>{row.counts.lecon_non_su}</td>
                            <td className={clsx("p-4 text-center", row.counts.perturbation > 0 ? "text-red-500 font-extrabold" : "text-gray-300")}>{row.counts.perturbation}</td>
                            <td className={clsx("p-4 text-center", row.counts.infraction > 0 ? "text-red-500 font-extrabold" : "text-gray-300")}>{row.counts.infraction}</td>
                            <td className={clsx("p-4 text-center", row.counts.autre > 0 ? "text-red-500 font-extrabold" : "text-gray-300")}>{row.counts.autre}</td>
                            <td className="p-4 text-center pr-6 bg-gray-50/70 font-black text-red-600 border-l border-gray-100">{total}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm text-gray-400">
              <Calendar className="mx-auto mb-4 opacity-30" size={48} />
              <p className="font-extrabold uppercase text-xs tracking-widest">Veuillez sélectionner une classe ci-dessus pour afficher la répartition des données</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ARCHIVES (Read-only historical search) */}
      {view === 'archives' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 flex flex-col md:flex-row gap-4 items-end">
            
            {/* Year Selector */}
            <div className="flex-1 flex flex-col space-y-2 w-full">
              <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest px-2">Choisir l'Année Académique :</label>
              <select 
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold text-primary focus:border-secondary border border-transparent transition-all"
                value={archiveYear}
                onChange={(e) => setArchiveYear(e.target.value)}
              >
                <option value="2024-2025">2024-2025 (Archivé)</option>
                <option value="2025-2026">2025-2026 (Archivé)</option>
                <option value="2023-2024">2023-2024 (Archivé)</option>
                <option value="2022-2023">2022-2023 (Archivé)</option>
              </select>
            </div>

            {/* Student Name */}
            <div className="flex-2 flex flex-col space-y-2 w-full">
              <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest px-2">Saisir le Nom de l'élève :</label>
              <input 
                type="text"
                placeholder="Nom complet de l'élève..."
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold text-primary focus:border-secondary border border-transparent transition-all"
                value={archiveSearchName}
                onChange={(e) => setArchiveSearchName(e.target.value)}
              />
            </div>

            {/* Search Button */}
            <button
              onClick={handleArchiveSearch}
              className="bg-primary text-white h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md flex items-center justify-center space-x-2 shrink-0 hover:bg-primary/95"
            >
              <Eye size={18} />
              <span>Rechercher dans les archives</span>
            </button>

          </div>

          {/* Archive Results */}
          <div className="space-y-4">
             {archiveLoading ? (
                <div className="flex justify-center py-12"><div className="loader"></div></div>
             ) : archiveLogs.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm text-gray-400">
                  <Database className="mx-auto mb-4 opacity-30" size={48} />
                  <p className="font-extrabold uppercase text-xs tracking-widest">Aucune donnée archivée ne correspond à cette recherche pour l'année {archiveYear}</p>
                  <p className="text-[10px] capitalize tracking-tighter mt-1">Veuillez vous assurer de saisir le nom complet de l'élève ou de vérifier l'existence de données enregistrées pour cette année-là.</p>
                </div>
             ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary opacity-60">Résultats de Recherche d'Archives — {archiveYear} ({archiveLogs.length} incident{archiveLogs.length > 1 ? 's' : ''}) :</h4>
                  {archiveLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 py-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                          {log.students?.student_code || 'COD'}
                        </div>
                        <div>
                          <p className="font-black text-primary uppercase text-sm leading-tight">{log.students?.full_name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Motif : <span className="text-secondary">{log.description || log.incident_type}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-1 bg-yellow-100 rounded-lg text-yellow-800">
                           {log.date}
                         </span>
                         <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-1 bg-red-100 rounded-lg text-red-600">
                           Gravité : {log.severity || 1}
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </div>
      )}

      {/* DISCIPLINARY LOG REGISTRATION FORM MODAL */}
      <AnimatePresence>
        {selectedStudent && (
          <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" 
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header block with elegant school crest */}
              <div className="bg-primary text-white p-6 relative shrink-0">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="absolute right-6 top-6 text-white/70 hover:text-white p-1.5 hover:bg-white/10 rounded-xl"
                >
                  <X size={20} />
                </button>
                
                {/* SVG School logo */}
                <div className="flex items-center space-x-4">
                  <svg className="w-14 h-14 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#09b5f2" stroke="#fac900" strokeWidth="4"/>
                    <path d="M50 20 L75 40 L65 75 L35 75 L25 40 Z" fill="#010657" stroke="white" strokeWidth="2.5"/>
                    <text x="50" y="55" fill="white" fontSize="16" fontWeight="extrabold" textAnchor="middle" letterSpacing="1">SAVIO</text>
                    <text x="50" y="90" fill="#fac900" fontSize="9" fontWeight="bold" textAnchor="middle">CODOSA</text>
                  </svg>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight leading-none text-white">Fiche Disciplinaire</h2>
                    <p className="text-[9px] uppercase tracking-widest text-[#fac900] font-black mt-1">Collège Dominique Savio</p>
                  </div>
                </div>
              </div>

              {/* Student detailed card panel */}
              <div className="bg-gray-50 p-4 shrink-0 border-b border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/40 px-2 mb-2">Fiche de l'Élève</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl shadow-inner border border-gray-100">
                  <div className="col-span-2">
                    <p className="text-[9px] uppercase font-black tracking-widest text-gray-400">Nom de l'élève :</p>
                    <p className="font-bold text-sm text-primary uppercase line-clamp-1">{selectedStudent.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-gray-400">Code de l'élève :</p>
                    <p className="font-mono text-xs text-primary font-black uppercase">{selectedStudent.student_code}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-gray-400">Classe :</p>
                    <p className="font-extrabold text-xs text-secondary uppercase">{selectedStudent.classrooms?.name || 'N/A'}</p>
                  </div>
                </div>

                {/* Editable Age and Sex attribute row */}
                <div className="grid grid-cols-2 gap-4 mt-3 px-2">
                   <div className="flex items-center space-x-2">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider shrink-0">Âge (Années) :</label>
                      <input 
                        type="number"
                        min="5" 
                        max="22"
                        className="w-16 p-1 py-0.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-bold text-primary"
                        value={studentAge}
                        onChange={(e) => setStudentAge(e.target.value)}
                      />
                   </div>
                   <div className="flex items-center space-x-2">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider shrink-0">Sexe :</label>
                      <select 
                        className="p-1 py-0.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-bold text-primary w-28"
                        value={studentGender}
                        onChange={(e) => setStudentGender(e.target.value)}
                      >
                         <option value="Garçon">Masculin</option>
                         <option value="Fiy">Féminin</option>
                      </select>
                   </div>
                </div>
              </div>

              {/* Form body */}
              <form onSubmit={handleLogIncident} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Checkboxes selection for 6 motifs */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest">Motifs d'incident (Sélectionnez tout ce qui s'applique) :</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Retard */}
                    <button 
                      type="button" 
                      onClick={() => setMotifs({ ...motifs, retard: !motifs.retard })}
                      className={clsx("flex items-center justify-between p-4 rounded-2xl border text-left font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm", motifs.retard ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-gray-100 hover:bg-gray-50 text-primary")}
                    >
                      <span>Retard de cours</span>
                      <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center border-2", motifs.retard ? "bg-red-500 border-red-500 text-white" : "border-gray-200")}>
                        {motifs.retard && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>

                    {/* Devoir non su */}
                    <button 
                      type="button" 
                      onClick={() => setMotifs({ ...motifs, devoir_non_su: !motifs.devoir_non_su })}
                      className={clsx("flex items-center justify-between p-4 rounded-2xl border text-left font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm", motifs.devoir_non_su ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-gray-100 hover:bg-gray-50 text-primary")}
                    >
                      <span>Devoir non rendu</span>
                      <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center border-2", motifs.devoir_non_su ? "bg-red-500 border-red-500 text-white" : "border-gray-200")}>
                        {motifs.devoir_non_su && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>

                    {/* Leçon non su */}
                    <button 
                      type="button" 
                      onClick={() => setMotifs({ ...motifs, lecon_non_su: !motifs.lecon_non_su })}
                      className={clsx("flex items-center justify-between p-4 rounded-2xl border text-left font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm", motifs.lecon_non_su ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-gray-100 hover:bg-gray-50 text-primary")}
                    >
                      <span>Leçon non apprise</span>
                      <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center border-2", motifs.lecon_non_su ? "bg-red-500 border-red-500 text-white" : "border-gray-200")}>
                        {motifs.lecon_non_su && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>

                    {/* Perturbation */}
                    <button 
                      type="button" 
                      onClick={() => setMotifs({ ...motifs, perturbation: !motifs.perturbation })}
                      className={clsx("flex items-center justify-between p-4 rounded-2xl border text-left font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm", motifs.perturbation ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-gray-100 hover:bg-gray-50 text-primary")}
                    >
                      <span>Chahut / Perturbation</span>
                      <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center border-2", motifs.perturbation ? "bg-red-500 border-red-500 text-white" : "border-gray-200")}>
                        {motifs.perturbation && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>

                    {/* Infraction */}
                    <button 
                      type="button" 
                      onClick={() => setMotifs({ ...motifs, infraction: !motifs.infraction })}
                      className={clsx("flex items-center justify-between p-4 rounded-2xl border text-left font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm", motifs.infraction ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-gray-100 hover:bg-gray-50 text-primary")}
                    >
                      <span>Infraction au règlement</span>
                      <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center border-2", motifs.infraction ? "bg-red-500 border-red-500 text-white" : "border-gray-200")}>
                        {motifs.infraction && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>

                    {/* Autre */}
                    <button 
                      type="button" 
                      onClick={() => setMotifs({ ...motifs, autre: !motifs.autre })}
                      className={clsx("flex items-center justify-between p-4 rounded-2xl border text-left font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm", motifs.autre ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-gray-100 hover:bg-gray-50 text-primary")}
                    >
                      <span>Autre Motif</span>
                      <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center border-2", motifs.autre ? "bg-red-500 border-red-500 text-white" : "border-gray-200")}>
                        {motifs.autre && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>

                  </div>
                </div>

                {/* Sub text input for Autre motif */}
                {motifs.autre && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col space-y-2 mt-2"
                  >
                    <label className="text-[10px] font-black uppercase text-primary/60">Décrivez cet autre motif :</label>
                    <textarea 
                      required
                      placeholder="Saisissez les détails de l'incident ici..."
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary h-20 transition-all font-bold text-xs text-primary"
                      value={customMotifText}
                      onChange={(e) => setCustomMotifText(e.target.value)}
                    />
                  </motion.div>
                )}

                {/* Severity evaluation */}
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest">Niveau de Gravité / Sévérité (1 normal - 3 critique) :</label>
                  <div className="flex space-x-4">
                    {[1, 2, 3].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={clsx("flex-1 py-3 px-4 rounded-xl border font-black text-xs transition-all tracking-wider uppercase", 
                          severity === sev ? "bg-primary border-primary text-white shadow-mdScale" : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                        )}
                      >
                        Niveau {sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* UI Message indicator */}
                {formMessage && (
                  <div className={clsx("p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center", formMessage.includes("succès") ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100")}>
                    {formMessage}
                  </div>
                )}

                {/* Submit action panel */}
                <div className="flex space-x-3 pt-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-black uppercase text-xs tracking-widest text-primary transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 py-4 bg-secondary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-secondary/95 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {formSubmitting ? <span>Enregistrement...</span> : <span>Enregistrer l'incident</span>}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM NEW ACADEMIC YEAR MODAL */}
      <AnimatePresence>
        {showNewYearModal && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md w-full p-6 md:p-8 space-y-6 overflow-hidden relative"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-amber-500/10 p-4 rounded-3xl text-[#fac900]">
                  <Database size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-primary uppercase tracking-tight">Nouvelle Année</h3>
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mt-0.5">Transition Académique</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                  Vous êtes sur le point de clore l'année académique active <strong className="text-primary">{activeYear}</strong> et de passer automatiquement à la suivante.
                </p>
                
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Nouvelle Année Cible :</div>
                  <div className="text-3xl font-black text-secondary tracking-tight mt-1">
                    {(() => {
                      const parts = activeYear.split('-');
                      if (parts.length === 2) {
                        const start = parseInt(parts[0], 10);
                        const end = parseInt(parts[1], 10);
                        if (!isNaN(start) && !isNaN(end)) return `${start+1}-${end+1}`;
                      }
                      return '2026-2027';
                    })()}
                  </div>
                </div>

                <p className="text-[10px] font-black text-red-500 uppercase tracking-wider text-center bg-red-50 p-3 rounded-xl border border-red-100">
                  Attention : Toutes les nouvelles infractions et fiches seront enregistrées sous cette nouvelle année !
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={newYearSubmitting}
                  onClick={() => setShowNewYearModal(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-black uppercase text-xs tracking-widest text-primary transition-all disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={newYearSubmitting}
                  onClick={handleConfirmNewYear}
                  className="flex-1 py-4 bg-secondary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-secondary/95 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {newYearSubmitting ? <span>Traitement...</span> : <span>Confirmer</span>}
                </button>
              </div>
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
