import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Book, Calendar, ChevronRight, FileText } from 'lucide-react';

export default function Homework() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isProfessor = profile?.role === 'professeur';

  useEffect(() => {
    fetchHomework();
  }, [profile]);

  const fetchHomework = async () => {
    setLoading(true);
    let query = supabase.from('homework').select('*, classrooms(name)');
    
    if (isProfessor) {
      query = query.eq('professor_id', profile.id);
    } else if (profile?.role === 'eleve') {
      // Students see own campus homework (further filtered in real app by classroom)
      query = query.eq('campus', profile.campus);
    }

    const { data } = await query.order('due_date', { ascending: true });
    if (data) setHomework(data);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary tracking-tight italic">{t('homework.title')}</h2>
        {isProfessor && (
          <button className="bg-secondary p-3 rounded-2xl text-white shadow-lg active:scale-95 transition-all">
             <Plus size={20} />
          </button>
        )}
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="loader"></div></div>
        ) : homework.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center shadow-sm">
             <Book className="w-16 h-16 text-gray-100 mx-auto mb-4" />
             <p className="text-gray-400">Pa gen devwa disponib.</p>
          </div>
        ) : (
          homework.map((item) => (
            <motion.div 
              key={item.id}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-secondary flex flex-col relative"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded">{item.subject}</span>
                <div className="flex items-center text-red-500 space-x-1">
                   <Calendar size={12} />
                   <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(item.due_date).toLocaleDateString()}</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-primary mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-primary opacity-40 uppercase tracking-widest">{item.classrooms?.name || 'Tout Klas'}</span>
                <button className="text-secondary font-bold text-xs flex items-center space-x-1">
                  <span>Detay</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
