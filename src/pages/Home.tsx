import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Bell, Info, MapPin, Phone, Mail, Award } from 'lucide-react';

export default function Home() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchAnnouncements();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-primary to-secondary p-8 rounded-b-[3rem] text-left shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
           <div className="w-64 h-64 bg-white rounded-full translate-x-20 translate-y-20"></div>
        </div>
        
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="relative z-10">
          <h2 className="text-accent text-sm font-black tracking-[0.2em] uppercase mb-4 opacity-90">{t('home.welcome')}</h2>
          <h1 className="text-white text-3xl font-black leading-tight mb-2 uppercase">
             {profile?.full_name?.split(' ')[0]},<br/>
             <span className="text-accent">{t('home.tagline')}</span>
          </h1>
          <p className="text-white/80 text-sm font-medium mb-6">Campus {profile?.campus?.toUpperCase()} — {profile?.role?.toUpperCase()}</p>
          
          <div className="flex space-x-3">
             <button className="bg-accent text-primary px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent/20 active:scale-95 transition-all">
                {t('home.check_attendance')}
             </button>
             <button className="bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                {t('home.quick_report')}
             </button>
          </div>
        </motion.div>
      </section>

      {/* Stats Quick View */}
      <div className="px-6 grid grid-cols-2 gap-4 -mt-6 relative z-10">
         <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{t('home.attendance_today')}</span>
            <span className="text-2xl font-black text-primary mt-1">94.2%</span>
            <div className="w-full bg-gray-100 h-1 mt-3 rounded-full overflow-hidden">
               <div className="bg-green-500 h-full w-[94%]"></div>
            </div>
         </div>
         <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{t('home.active_incidents')}</span>
            <span className="text-2xl font-black text-primary mt-1">12</span>
            <span className="text-[8px] font-black text-red-500 mt-2 uppercase">+{i18n.language === 'ha' ? `3 ${t('home.since_morning')}` : `3 ${t('home.since_morning')}`}</span>
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
          <div className="space-y-4">
            {announcements.map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -2 }}
                className="bg-white p-5 rounded-3xl shadow-sm border-l-4 border-secondary flex space-x-4"
              >
                <div className="flex-shrink-0 bg-gray-50 border border-gray-100 p-2 rounded-2xl h-fit">
                   <p className="text-[10px] font-black text-center leading-none text-primary uppercase">
                     {new Date(item.created_at).toLocaleString('default', { month: 'short' })}<br/>
                     <span className="text-lg">{new Date(item.created_at).getDate()}</span>
                   </p>
                </div>
                <div>
                   <h4 className="font-bold text-sm text-primary">{item.title}</h4>
                   <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{item.body}</p>
                   <span className="inline-block mt-3 text-[9px] px-2 py-0.5 bg-accent/20 text-primary rounded-full font-black uppercase tracking-tighter">{item.target || 'ALL'}</span>
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
            {t('home.about_text')}
          </p>
          <div className="pt-4 grid grid-cols-2 gap-4">
             <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                  <MapPin size={14} className="text-secondary"/>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase">Pòtoprens, Ayiti</span>
             </div>
             <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Info size={14} className="text-secondary"/>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase">Fonde an 19xx</span>
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
                <p className="text-sm font-medium">Boutilliers, Pétion-Ville, Haiti</p>
             </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="bg-white/10 p-3 rounded-xl"><Phone className="text-secondary w-5 h-5"/></div>
             <div>
                <p className="text-[10px] font-bold opacity-60 uppercase">Telefòn</p>
                <p className="text-sm font-medium">+509 2811 0000</p>
             </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="bg-white/10 p-3 rounded-xl"><Mail className="text-secondary w-5 h-5"/></div>
             <div>
                <p className="text-[10px] font-bold opacity-60 uppercase">Imel</p>
                <p className="text-sm font-medium">contact@codosapv.com</p>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
