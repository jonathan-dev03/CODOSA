import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Bell, Info, MapPin, Phone, Mail, Award } from 'lucide-react';

const defaultSchoolInfo = {
  hero_title: "FORMONS L'AVENIR!",
  hero_subtitle: "BIENVENUE",
  about_text: "Le Collège Dominique Savio est une institution qui forme les jeunes haïtiens depuis longtemps dans un cadre d'excellence.",
  location: "Pétion-Ville, Haïti",
  founded_year: "1963",
  contact_address: "34 Rue Lambert, Pétion-Ville, Haiti",
  contact_phone: "+509 2811 0000",
  contact_email: "contact@codosapv.com"
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, activeCampus } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(defaultSchoolInfo);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [attendanceCompleted, setAttendanceCompleted] = useState<boolean>(false);
  const [incidentsCount, setIncidentsCount] = useState<number>(0);
  const [newIncidentsCount, setNewIncidentsCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);

  useEffect(() => {
    const campusValue = profile?.role === 'directeur' ? activeCampus : (profile?.campus || 'fondamantal');
    const cleanCampus = campusValue === 'fondamantal' || campusValue === 'fondamentale' ? 'fondamantal' : 'secondaire';

    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAnnouncements(data);
      }
      setLoading(false);
    };

    const fetchSchoolInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('school_info')
          .select('*');
        if (data && data.length > 0 && !error) {
          const infoMap = { ...defaultSchoolInfo };
          data.forEach((row: any) => {
            if (row.key in infoMap) {
              infoMap[row.key as keyof typeof defaultSchoolInfo] = row.value;
            }
          });
          setSchoolInfo(infoMap);
          localStorage.setItem('school_info', JSON.stringify(infoMap));
        } else {
          const local = localStorage.getItem('school_info');
          if (local) {
            setSchoolInfo(JSON.parse(local));
          }
        }
      } catch (e) {
        console.error(e);
        const local = localStorage.getItem('school_info');
        if (local) {
          setSchoolInfo(JSON.parse(local));
        }
      }
    };

    const fetchTodayAttendance = async () => {
      try {
        const { data: rooms } = await supabase
          .from('classrooms')
          .select('id')
          .eq('campus', cleanCampus);
        const roomIds = (rooms || []).map(r => r.id);

        if (roomIds.length === 0) {
          setAttendancePercentage(0);
          setAttendanceCompleted(false);
          return;
        }

        const { data: campusStudents } = await supabase
          .from('students')
          .select('id')
          .eq('campus', cleanCampus);
        const totalStudentsCount = campusStudents?.length || 0;

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todayRecords, error } = await supabase
          .from('attendance_records')
          .select('status')
          .eq('date', todayStr)
          .in('classroom_id', roomIds);

        if (todayRecords && todayRecords.length > 0 && !error) {
          const totalRecords = todayRecords.length;
          const presents = todayRecords.filter((r: any) => r.status === 'present').length;
          const pct = totalStudentsCount > 0 ? (presents / totalStudentsCount) * 100 : 0;
          setAttendancePercentage(pct);
          setAttendanceCompleted(true);
        } else {
          setAttendancePercentage(0);
          setAttendanceCompleted(false);
        }
      } catch (e) {
        console.error("Error loaded attendance stats", e);
      }
    };

    const fetchTodayIncidents = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todayIncidents, error } = await supabase
          .from('discipline_logs')
          .select('created_at')
          .eq('date', todayStr)
          .eq('campus', cleanCampus);

        if (todayIncidents && !error) {
          setIncidentsCount(todayIncidents.length);
          
          const todaySixAM = new Date();
          todaySixAM.setHours(6, 0, 0, 0);
          const newAfterSix = todayIncidents.filter((item: any) => {
            const itemTime = new Date(item.created_at);
            return itemTime > todaySixAM;
          }).length;
          setNewIncidentsCount(newAfterSix);
        } else {
          setIncidentsCount(0);
          setNewIncidentsCount(0);
        }
      } catch (e) {
        console.error("Error loaded discipline stats", e);
      }
    };

    const fetchMonthEvents = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startStr = startOfMonth.toISOString().split('T')[0];

        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
        const endStr = endOfMonth.toISOString().split('T')[0];

        const { data: monthEvents, error } = await supabase
          .from('events')
          .select('id')
          .gte('event_date', startStr)
          .lte('event_date', endStr)
          .or(`campus.eq.${cleanCampus},campus.eq.both`);

        if (monthEvents && !error) {
          setEventsCount(monthEvents.length);
        } else {
          setEventsCount(0);
        }
      } catch (e) {
        console.error("Error loaded event stats", e);
      }
    };

    fetchAnnouncements();
    fetchSchoolInfo();
    fetchTodayAttendance();
    fetchTodayIncidents();
    fetchMonthEvents();

    const attendanceSub = supabase
      .channel('attendance_records_changes_home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        fetchTodayAttendance();
      })
      .subscribe();

    const disciplineSub = supabase
      .channel('discipline_logs_changes_home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discipline_logs' }, () => {
        fetchTodayIncidents();
      })
      .subscribe();

    const eventsSub = supabase
      .channel('events_changes_home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchMonthEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceSub);
      supabase.removeChannel(disciplineSub);
      supabase.removeChannel(eventsSub);
    };
  }, [profile, activeCampus]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-primary to-secondary p-8 rounded-b-[3rem] text-left shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
           <div className="w-64 h-64 bg-white rounded-full translate-x-20 translate-y-20"></div>
        </div>
        
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="relative z-10">
          <h2 className="text-accent text-sm font-black tracking-[0.2em] uppercase mb-4 opacity-90">
            {schoolInfo.hero_subtitle}
          </h2>
          <h1 className="text-white text-3xl font-black leading-tight mb-2 uppercase">
             {profile?.full_name?.split(' ')[0] || 'Utilisateur'},<br/>
             <span className="text-accent">{schoolInfo.hero_title}</span>
          </h1>
          <p className="text-white/80 text-sm font-medium mb-6">Campus {activeCampus?.toUpperCase()} — {profile?.role?.toUpperCase()}</p>
          
          <div className="flex space-x-3">
             {/* VÉRIFIER PRÉSENCE Button for: directeur, censeur, resp_pedagogique, professeur */}
             {['directeur', 'censeur', 'resp_pedagogique', 'resp_discipline', 'professeur'].includes(profile?.role || '') && (
               <button 
                 onClick={() => navigate('/presence')}
                 className="bg-accent text-[#010657] hover:bg-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent/20 active:scale-95 transition-all cursor-pointer"
               >
                  {t('home.check_attendance')}
               </button>
             )}

             {/* RAPPORT RAPIDE strictly for: secretaire only */}
             {profile?.role === 'secretaire' && (
               <button 
                 onClick={() => navigate('/presence')}
                 className="bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
               >
                  {t('home.quick_report')}
               </button>
             )}

             {/* PRÉSENCE AUJOURD'HUI strictly for: censeur, resp_pedagogique */}
             {['censeur', 'resp_pedagogique', 'resp_discipline'].includes(profile?.role || '') && (
               <button 
                 onClick={() => navigate('/presence')}
                 className="bg-[#09b5f2] text-white hover:bg-opacity-90 px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
               >
                  PRÉSENCE AUJOURD'HUI
               </button>
             )}
          </div>
        </motion.div>
      </section>

      {/* Stats Quick View */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-6 -mt-6 relative z-10 col-span-full">
         {/* Block 1: PRÉSENCE AUJOURD'HUI */}
         <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center justify-between">
            <div>
               <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{t('home.attendance_today')}</span>
               <span className="text-2xl font-black text-primary mt-1 block">
                 {attendanceCompleted ? `${(attendancePercentage || 0).toFixed(1)}%` : "0%"}
               </span>
            </div>
            <div className="w-full">
               <span className={`text-[8px] font-black mt-2 uppercase block ${attendanceCompleted ? 'text-gray-400' : 'text-gray-400'}`}>
                 {attendanceCompleted ? "Mise à jour en direct" : "Appel non encore fait"}
               </span>
               <div className="w-full bg-gray-100 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div 
                    className={`${(attendancePercentage || 0) >= 90 ? 'bg-green-500' : (attendancePercentage || 0) >= 70 ? 'bg-[#fac900]' : 'bg-red-500'} h-full transition-all duration-300`} 
                    style={{ width: `${attendancePercentage || 0}%` }}
                  ></div>
               </div>
            </div>
         </div>

         {/* Block 2: INCIDENTS ACTUELS */}
         <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center justify-between min-h-[96px]">
            <div>
               <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{t('home.active_incidents')}</span>
               <span className="text-2xl font-black text-primary mt-1 block">{incidentsCount}</span>
            </div>
            <div className="w-full">
               {incidentsCount === 0 ? (
                 <span className="text-[8px] font-black text-green-500 uppercase block">Aucun incident aujourd'hui</span>
               ) : (
                 <span className="text-[8px] font-black text-red-500 uppercase block">+{newIncidentsCount} depuis ce matin</span>
               )}
            </div>
         </div>

         {/* Block 3: ÉVÉNEMENTS CE MOIS */}
         <div 
           onClick={() => navigate('/events')}
           className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all justify-between min-h-[96px]"
         >
            <div>
               <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">ÉVÉNEMENTS</span>
               <span className="text-2xl font-black text-primary mt-1 block">
                 {eventsCount > 0 ? eventsCount.toString().padStart(2, '0') : "00"}
               </span>
            </div>
            <div className="w-full">
               <span className="text-[8px] font-black text-[#09b5f2] uppercase block">CE MOIS</span>
            </div>
         </div>
      </div>

      {/* Announcements */}
      <section className="px-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-primary text-sm font-black uppercase tracking-widest flex items-center">
            <Bell className="w-4 h-4 mr-2 text-secondary" />
            {t('home.latest_announcements')}
          </h3>
          <button className="text-secondary text-[10px] font-bold uppercase tracking-widest">{t('home.view_all')}</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="loader"></div></div>
        ) : announcements.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 shadow-sm">
             <Bell className="w-12 h-12 text-gray-100 mx-auto mb-2" />
              <p className="text-gray-400 font-medium italic">{t('home.no_announcements')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -5, rotate: 1 }}
                className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-50 flex flex-col space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="bg-secondary/10 p-3 rounded-2xl">
                    <Info size={20} className="text-secondary" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-primary uppercase opacity-30">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                   <h4 className="font-black text-lg text-primary uppercase leading-tight">{item.title}</h4>
                   <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-4">{item.body || item.content}</p>
                </div>
                <div className="pt-2">
                   <span className="text-[9px] px-3 py-1 bg-accent/20 text-primary rounded-full font-black uppercase tracking-widest">{item.target || 'TOUT'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* About Us */}
      <section className="px-6 mb-24">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-12 -mt-12"></div>
          <h3 className="text-primary text-sm font-black uppercase tracking-widest border-b border-gray-100 pb-2">{t('home.about_title')}</h3>
          <p className="text-gray-500 leading-relaxed text-xs">
            {schoolInfo.about_text}
          </p>
          <div className="pt-4 grid grid-cols-2 gap-4">
             <div className="flex items-center gap-[4px] shrink-0">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-secondary"/>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase leading-none">{schoolInfo.location}</span>
             </div>
             <div className="flex items-center gap-[4px] shrink-0">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <Info size={14} className="text-secondary"/>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase leading-none">Fondée en {schoolInfo.founded_year}</span>
             </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-primary p-8 mx-6 rounded-3xl text-white space-y-6 shadow-xl mb-12">
        <h3 className="text-accent text-xl font-black tracking-tight">{t('home.contact_title')}</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
             <div className="bg-white/10 p-3 rounded-xl"><MapPin className="text-secondary w-5 h-5"/></div>
             <div>
                <p className="text-[10px] font-bold opacity-60 uppercase">Adrès</p>
                <p className="text-xs md:text-sm font-medium">{schoolInfo.contact_address}</p>
             </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="bg-white/10 p-3 rounded-xl"><Phone className="text-secondary w-5 h-5"/></div>
             <div>
                <p className="text-[10px] font-bold opacity-60 uppercase">Telefòn</p>
                <p className="text-xs md:text-sm font-medium">{schoolInfo.contact_phone}</p>
             </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="bg-white/10 p-3 rounded-xl"><Mail className="text-secondary w-5 h-5"/></div>
             <div>
                <p className="text-[10px] font-bold opacity-60 uppercase">Imel</p>
                <p className="text-xs md:text-sm font-medium">{schoolInfo.contact_email}</p>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
