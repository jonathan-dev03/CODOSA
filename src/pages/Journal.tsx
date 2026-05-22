import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, PenTool, CheckCircle, XCircle, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function Journal() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [pendingArticles, setPendingArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [filter, setFilter] = useState('all');

  const isAdmin = ['super_admin', 'directeur', 'censeur_fondamental', 'censeur_secondaire'].includes(profile?.role);

  useEffect(() => {
    fetchArticles();
    if (isAdmin) fetchPending();
  }, [profile, filter]);

  const fetchArticles = async () => {
    let query = supabase
      .from('journal_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('category', filter);
    }

    const { data } = await query;
    if (data) setArticles(data);
    setLoading(false);
  };

  const fetchPending = async () => {
    const { data } = await supabase
      .from('journal_articles')
      .select('*')
      .eq('status', 'pending');
    if (data) setPendingArticles(data);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('journal_articles')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) {
      fetchArticles();
      fetchPending();
    }
  };

  const categories = [
    { id: 'all', label: t('journal.categories.all') },
    { id: 'article', label: t('journal.categories.article') },
    { id: 'gallery', label: t('journal.categories.gallery') },
    { id: 'event', label: t('journal.categories.event') },
    { id: 'message_directeur', label: t('journal.categories.message_directeur') },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary tracking-tight italic">Journal CODOSA</h2>
        {(profile?.role === 'professeur' || profile?.role === 'eleve') && (
          <button className="bg-secondary p-3 rounded-2xl text-white shadow-lg active:scale-95 transition-all">
             <PenTool size={20} />
          </button>
        )}
      </header>

      {isAdmin && (
        <div className="flex bg-gray-100 p-1 rounded-2xl overflow-hidden">
          <button 
            onClick={() => setTab('all')}
            className={clsx("flex-1 py-3 text-xs font-bold rounded-xl transition-all", tab === 'all' ? "bg-white text-primary shadow-sm" : "text-gray-500")}
          >
            {t('journal.published')}
          </button>
          <button 
            onClick={() => setTab('pending')}
            className={clsx("flex-1 py-3 text-xs font-bold rounded-xl transition-all relative", tab === 'pending' ? "bg-white text-primary shadow-sm" : "text-gray-500")}
          >
            {t('journal.pending')}
            {pendingArticles.length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      )}

      {tab === 'all' ? (
        <>
          <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={clsx(
                  "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                  filter === cat.id ? "bg-primary text-white" : "bg-white text-primary border border-gray-100"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full flex justify-center py-12"><div className="loader"></div></div>
            ) : articles.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-3xl text-center shadow-sm">
                <ImageIcon className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                <p className="text-gray-400">{t('journal.no_articles')}</p>
              </div>
            ) : (
              articles.map((art) => (
                <motion.div 
                  key={art.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-50 flex flex-col group"
                >
                  <div className="h-56 bg-gray-200 relative overflow-hidden">
                    {art.cover_image_url ? (
                      <img src={art.cover_image_url} alt={art.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center opacity-10 bg-primary">
                          <ImageIcon size={48} className="text-white" />
                          <span className="font-black text-sm text-white">CODOSA</span>
                       </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-md text-primary text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg border border-white/20">
                        {art.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{new Date(art.published_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-xl font-black text-primary mb-4 leading-tight uppercase group-hover:text-secondary transition-colors">{art.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-6">{art.content}</p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-black text-secondary">{art.author_role?.[0]?.toUpperCase()}</div>
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">{t('journal.by_team')}</p>
                          <p className="text-[9px] text-gray-400 font-medium">Equipe Admin</p>
                        </div>
                      </div>
                      <ChevronRight className="text-secondary group-hover:translate-x-2 transition-transform" size={24} />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-accent tracking-widest">Validasyon Nesesè</h3>
          {pendingArticles.map((art) => (
            <div key={art.id} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50 space-y-4">
              <div>
                <h4 className="font-bold text-primary">{art.title}</h4>
                <p className="text-xs text-secondary font-bold uppercase mt-1">{art.category}</p>
              </div>
              <div className="flex space-x-2">
                 <button onClick={() => handleApprove(art.id)} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1">
                   <CheckCircle size={14} /> <span>Apwouve</span>
                 </button>
                 <button className="flex-1 bg-red-100 text-red-600 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1">
                   <XCircle size={14} /> <span>Rejte</span>
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
