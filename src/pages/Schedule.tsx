import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Calendar as CalendarIcon, Clock, Users, ArrowRightLeft, Plus } from 'lucide-react';

export default function Schedule() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [campusView, setCampusView] = useState(profile?.campus === 'both' ? 'fondamantal' : profile?.campus);

  const days = [
    { id: 1, label: 'Lendi', color: '#010657' },
    { id: 2, label: 'Madi', color: '#09b5f2' },
    { id: 3, label: 'Mèkredi', color: '#fac900' },
    { id: 4, label: 'Jedi', color: 'orange' },
    { id: 5, label: 'Vandredi', color: 'green' },
  ];

  const timeSlots = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"
  ];

  useEffect(() => {
    fetchSchedule();
  }, [campusView]);

  const fetchSchedule = async () => {
    setLoading(true);
    // In a real app we'd fetch from schedule_slots joined with classrooms and users
    // For demo efficiency, we'll keep it empty or mock a few entries if needed.
    setLoading(false);
  };

  const isAdmin = ['super_admin', 'directeur', 'censeur_fondamental', 'censeur_secondaire'].includes(profile?.role);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary tracking-tight italic">{t('schedule.title')}</h2>
        {isAdmin && (
          <button className="bg-primary p-3 rounded-2xl text-white shadow-lg active:scale-95 transition-all">
             <Plus size={20} />
          </button>
        )}
      </header>

      {profile?.campus === 'both' && (
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button onClick={() => setCampusView('fondamantal')} className={clsx("flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all", campusView === 'fondamantal' ? "bg-white text-primary shadow-sm" : "text-gray-400")}>Fondamantal</button>
          <button onClick={() => setCampusView('secondaire')} className={clsx("flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all", campusView === 'secondaire' ? "bg-white text-primary shadow-sm" : "text-gray-400")}>Segondè</button>
        </div>
      )}

      <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
        {days.map(day => (
          <button 
            key={day.id}
            className="flex-shrink-0 px-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[100px]"
          >
            <span className="text-[10px] font-black uppercase opacity-40">{day.label.slice(0, 3)}</span>
            <span className="text-sm font-bold text-primary">{day.label}</span>
            <div className="w-1 h-1 rounded-full mt-1" style={{ backgroundColor: day.color }}></div>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {timeSlots.map((time, idx) => (
          <div key={idx} className="flex space-x-4 items-start">
             <div className="w-16 pt-2">
                <span className="text-xs font-black text-primary/40 tracking-tighter">{time}</span>
             </div>
             <div className="flex-1 bg-white p-4 rounded-3xl border border-gray-50 shadow-sm min-h-[80px] flex items-center justify-center">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{t('schedule.no_classes')}</p>
             </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="fixed bottom-24 left-6 right-6 z-40">
           <button className="w-full bg-accent text-primary p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center space-x-2 border-2 border-white">
              <ArrowRightLeft size={18} />
              <span>Jenere Orè otomatik</span>
           </button>
        </div>
      )}
    </div>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
