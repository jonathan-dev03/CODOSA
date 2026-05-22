import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Students() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  if (profile?.role === 'eleve') {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-gray-100">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-primary uppercase">Katye Jeneral Règleman</h2>
        <p className="text-orange-500 font-bold text-[10px] uppercase tracking-wider mb-2">Aksè Refize / Accès Refusé</p>
        <p className="text-gray-500 font-medium text-xs leading-relaxed">Ou pa gen pèmisyon pou wè lis elèv yo.</p>
      </div>
    );
  }

  const [students, setStudents] = useState<any[]>([]);
  const [dbClassrooms, setDbClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchClassrooms();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'eleve')
      .order('classroom')
      .order('full_name');

    if (data) setStudents(data);
    setLoading(false);
  };

  const fetchClassrooms = async () => {
    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .order('name');
    if (data) setDbClassrooms(data);
  };

  const filtered = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = classFilter ? s.classroom === classFilter : true;
    return matchesSearch && matchesClass;
  });

  const uniqueClasses = Array.from(new Set([
    ...dbClassrooms.map(c => c.name),
    ...students.map(s => s.classroom)
  ])).filter(Boolean);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-black text-primary uppercase tracking-tight">{t('students_list.title')}</h1>
        <div className="flex items-center space-x-2 mt-1">
           <span className="text-xs font-bold text-secondary uppercase tracking-widest">CODOSA Students</span>
           <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
           <span className="text-xs font-bold text-primary/40 uppercase tracking-widest">{students.length} Total</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder={t('students_list.search')}
            className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-secondary/20 transition-all text-sm font-bold shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
           <select 
             className="w-full p-4 bg-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-secondary/20 transition-all text-sm font-bold shadow-sm border-none appearance-none"
             value={classFilter}
             onChange={(e) => setClassFilter(e.target.value)}
           >
              <option value="">{t('schedule.select_class')}</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><div className="loader"></div></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">
            Pa gen elèv yo jwenn
          </div>
        ) : (
          filtered.map((student, idx) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20 shrink-0">
                <User className="text-secondary" size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-primary truncate text-sm uppercase">{student.full_name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                   <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-accent/20 text-primary rounded-md tracking-tighter">
                     {student.classroom || 'N/A'}
                   </span>
                   <span className="text-[8px] text-gray-400 font-bold uppercase">{student.campus}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
