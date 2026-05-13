import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, UserPlus, FileText, Trash2, ShieldAlert, ChevronRight, PlusCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Discipline() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'directory' | 'reports'>('directory');
  const [campusFilter, setCampusFilter] = useState(profile?.campus === 'both' ? 'fondamantal' : profile?.campus);

  const isAdminOnly = ['super_admin', 'directeur', 'censeur_fondamental', 'censeur_secondaire'].includes(profile?.role);

  useEffect(() => {
    fetchData();
  }, [campusFilter]);

  const fetchData = async () => {
    setLoading(true);
    const { data: classData } = await supabase.from('classrooms').select('*').eq('campus', campusFilter);
    const { data: studentData } = await supabase.from('students').select('*, classrooms(name)').eq('campus', campusFilter);
    
    if (classData) setClassrooms(classData);
    if (studentData) setStudents(studentData);
    setLoading(false);
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.student_code.toLowerCase().includes(search.toLowerCase())
  );

  const generateReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(1, 6, 87); // --primary
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('CODOSA - Rapò Disiplinè', 20, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Campus: ${campusFilter?.toUpperCase()}`, 20, 50);
    doc.text(`Dat: ${new Date().toLocaleDateString()}`, 20, 57);

    const tableData = filteredStudents.map(s => [
      s.student_code,
      s.full_name,
      s.classrooms?.name || '---',
      '0 Ensidan' // Mocked for now
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Kòd', 'Non Elèv', 'Klas', 'Ensidan']],
      body: tableData,
      headStyles: { fillColor: [1, 6, 87] },
      styles: { font: 'helvetica' }
    });

    doc.save(`CODOSA_Discipline_${campusFilter}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary tracking-tight italic">Disiplin</h2>
        {isAdminOnly && (
          <button className="bg-secondary p-3 rounded-2xl text-white shadow-lg active:scale-95 transition-all">
             <UserPlus size={20} />
          </button>
        )}
      </header>

      {profile?.campus === 'both' && (
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button onClick={() => setCampusFilter('fondamantal')} className={clsx("flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all", campusFilter === 'fondamantal' ? "bg-white text-primary shadow-sm" : "text-gray-400")}>Fondamantal</button>
          <button onClick={() => setCampusFilter('secondaire')} className={clsx("flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all", campusFilter === 'secondaire' ? "bg-white text-primary shadow-sm" : "text-gray-400")}>Segondè</button>
        </div>
      )}

      <div className="flex space-x-2">
         <button onClick={() => setView('directory')} className={clsx("flex-1 py-3 font-bold rounded-2xl text-xs transition-all", view === 'directory' ? "bg-primary text-white shadow-lg" : "bg-white text-primary")}>Lis Elèv</button>
         <button onClick={() => setView('reports')} className={clsx("flex-1 py-3 font-bold rounded-2xl text-xs transition-all", view === 'reports' ? "bg-primary text-white shadow-lg" : "bg-white text-primary")}>Rapò / Charts</button>
      </div>

      {view === 'directory' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Chache yon elèv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none border border-transparent focus:border-secondary transition-all"
            />
          </div>

          <div className="space-y-3">
             {loading ? (
               <div className="flex justify-center py-12"><div className="loader"></div></div>
             ) : (
               filteredStudents.map((student) => (
                 <motion.div 
                   key={student.id}
                   whileTap={{ scale: 0.98 }}
                   className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between group"
                 >
                   <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary font-black text-xs uppercase shadow-inner">
                        {student.classrooms?.name || '??'}
                      </div>
                      <div>
                        <p className="font-bold text-primary">{student.full_name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{student.student_code}</p>
                      </div>
                   </div>
                   <ChevronRight className="text-secondary opacity-40 group-hover:opacity-100 transition-all" size={20} />
                 </motion.div>
               ))
             )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
           <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col items-center text-center">
             <ShieldAlert className="text-primary mb-4" size={48} />
             <h3 className="font-black text-primary uppercase text-sm tracking-widest">Rezime Disiplin</h3>
             <p className="text-xs text-gray-500 mt-2">Jenere yon rapò konplè sou konpòtman elèv yo pou campus sa a.</p>
           </div>
           
           <button 
             onClick={generateReport}
             className="w-full bg-secondary text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center space-x-2"
           >
             <FileText size={18} />
             <span>Telechaje PDF (Rapò Konplè)</span>
           </button>

           <div className="pt-6 border-t border-gray-100">
             <h4 className="text-xs font-black uppercase text-primary opacity-60 mb-4 tracking-tighter">Aksyon Avanse</h4>
             <button className="w-full bg-red-50 text-red-600 p-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center space-x-2 border border-red-100">
               <Trash2 size={18} />
               <span>Reyinisyalize Tout Done Ane a</span>
             </button>
           </div>
        </div>
      )}
    </div>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
