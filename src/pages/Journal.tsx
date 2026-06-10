import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  PenTool, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Image as ImageIcon, 
  ArrowLeft,
  X,
  Loader,
  Trash2,
  Edit
} from 'lucide-react';
import clsx from 'clsx';

export default function Journal() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  
  const [articles, setArticles] = useState<any[]>([]);
  const [pendingArticles, setPendingArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [filter, setFilter] = useState('all');

  // Article Full Page Detail State
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // Modal Creation / Editing States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  
  // Creation/Editing Form Variables
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = ['super_admin', 'directeur', 'censeur', 'resp_pedagogique', 'resp_discipline'].includes(profile?.role);
  const canWrite = !!profile?.role; // All logged in roles can contribute articles

  const fetchArticles = async () => {
    let query = supabase
      .from('journal_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    // Note matches our filter with category, Galerie auto-resolves cover image filters
    const { data } = await query;
    if (data) {
       setArticles(data);
    }
    setLoading(false);
  };

  const fetchPending = async () => {
    const { data } = await supabase
      .from('journal_articles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingArticles(data);
  };

  useEffect(() => {
    fetchArticles();
    if (isAdmin) fetchPending();

    // Subscribe to real-time additions of articles
    const journalChannel = supabase
      .channel('journal_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_articles' }, () => {
        fetchArticles();
        if (isAdmin) fetchPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(journalChannel);
    };
  }, [profile]);

  const handleApprove = async (id: string) => {
    const { error: err } = await supabase
      .from('journal_articles')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!err) {
      setSuccess("Article approuvé et publié !");
      setTimeout(() => setSuccess(''), 2000);
      fetchArticles();
      fetchPending();
    } else {
      setError(err.message);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Voulez-vous rejeter cet article ?")) return;
    const { error: err } = await supabase
      .from('journal_articles')
      .update({ status: 'rejected' })
      .eq('id', id);
    
    if (!err) {
      setSuccess("Article rejeté.");
      setTimeout(() => setSuccess(''), 2000);
      fetchArticles();
      fetchPending();
    } else {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;
    
    try {
      const { error: err } = await supabase
        .from('journal_articles')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setSuccess("Article supprimé !");
      setSelectedArticle(null);
      setTimeout(() => setSuccess(''), 2000);
      fetchArticles();
      if (isAdmin) fetchPending();
    } catch (err: any) {
      setError("Erreur : " + err.message);
    }
  };

  // Upload to Supabase Storage bucket 'article-covers' or graceful Base64 fallback
  const uploadCoverImage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // In case bucket is not public or not present, invoke creation gracefully
      await supabase.storage.createBucket('article-covers', { public: true }).catch(() => {});

      const { data, error: uploadError } = await supabase.storage
        .from('article-covers')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('article-covers')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.warn("Storage upload failed, falling back to base64 encoding:", err);
      // Fallback base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  const openAddModal = () => {
    setEditingArticle(null);
    setTitle('');
    setBodyText('');
    setCoverImageUrl('');
    setCoverImageFile(null);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (article: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingArticle(article);
    setTitle(article.title);
    setBodyText(article.body || article.content || '');
    setCoverImageUrl(article.cover_image_url || '');
    setCoverImageFile(null);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !bodyText.trim()) {
      setError("Le titre et le contenu ne peuvent pas être vides.");
      return;
    }

    // Required image before submit restriction
    if (!coverImageFile && !coverImageUrl) {
      setError("Image de couverture requise.");
      return;
    }

    setSaving(true);

    try {
      let finalImageUrl = coverImageUrl;
      if (coverImageFile) {
        setUploadingImage(true);
        finalImageUrl = await uploadCoverImage(coverImageFile);
        setUploadingImage(false);
      }

      const payload = {
        title: title.trim(),
        body: bodyText.trim(),
        cover_image_url: finalImageUrl,
        category: 'article',
        author_id: profile?.id,
        author_role: profile?.role || 'admin',
        status: isAdmin ? 'published' : 'pending',
        published_at: isAdmin ? new Date().toISOString() : null
      };

      if (editingArticle) {
        // UPDATE
        const { error: err } = await supabase
          .from('journal_articles')
          .update({
            title: payload.title,
            body: payload.body,
            cover_image_url: payload.cover_image_url,
            author_id: payload.author_id,
            author_role: payload.author_role,
            status: editingArticle.status, // preserve previous status (pending remains pending, published is published)
            published_at: editingArticle.status === 'published' ? new Date().toISOString() : editingArticle.published_at
          })
          .eq('id', editingArticle.id);

        if (err) throw err;
        setSuccess("L'article a été mis à jour !");
      } else {
        // INSERT
        const { error: err } = await supabase
          .from('journal_articles')
          .insert(payload);

        if (err) throw err;
        setSuccess(isAdmin ? "L'article a été mis en ligne !" : "L'article a été envoyé pour approbation !");
      }

      setModalOpen(false);
      setTimeout(() => setSuccess(''), 2000);
      fetchArticles();
      if (isAdmin) fetchPending();
    } catch (err: any) {
      setError(err.message || "Erreur de configuration de la publication");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  // Keep only: Tout | Article | Galerie
  const categories = [
    { id: 'all', label: t('journal.categories.all', 'Tout') },
    { id: 'article', label: t('journal.categories.article', 'Articles') },
    { id: 'gallery', label: 'Galerie' },
  ];

  // Client-side category and photo filter
  const filteredArticles = articles.filter((art) => {
    if (filter === 'all') return true;
    if (filter === 'article') return art.category === 'article';
    if (filter === 'gallery') return !!art.cover_image_url;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-24 text-left">
      
      {/* Alert states */}
      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ zIndex: 99 }}
          className="fixed top-6 right-6 bg-green-500 text-white font-black uppercase text-xs tracking-wider px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3"
        >
          <CheckCircle size={18} />
          <span>{success}</span>
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ zIndex: 99 }}
          className="fixed top-6 right-6 bg-red-600 text-white font-black uppercase text-xs tracking-wider px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3"
        >
          <XCircle size={18} />
          <span>{error}</span>
        </motion.div>
      )}

      {/* FULL-PAGE ARTICLE DETAILS VIEW OVERLAY */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/30 backdrop-blur-md z-40 overflow-y-auto p-4 md:p-12 flex justify-center items-start"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.98 }}
              className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col mt-4 mb-12"
            >
              {/* Cover Image Banner */}
              <div className="h-[250px] md:h-[400px] relative w-full bg-gray-100 overflow-hidden">
                {selectedArticle.cover_image_url ? (
                  <img 
                    src={selectedArticle.cover_image_url} 
                    alt={selectedArticle.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-20 bg-primary">
                    <ImageIcon size={64} className="text-white" />
                  </div>
                )}
                
                {/* Float close button */}
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-sm transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Text contents body */}
              <div className="p-6 md:p-12 space-y-6">
                
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6">
                  <div className="space-y-1">
                    <span className="bg-secondary/10 px-3 py-1 rounded-full text-secondary font-black text-[9px] uppercase tracking-wider">
                      {selectedArticle.category}
                    </span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2.5">
                      Publié le {new Date(selectedArticle.published_at || selectedArticle.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary">
                      {selectedArticle.author_role?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-tight">Rôle : {selectedArticle.author_role}</p>
                      <p className="text-[8px] text-gray-400 font-bold">CODOSA Team</p>
                    </div>
                  </div>
                </div>

                {/* Article Content */}
                <div className="space-y-4">
                  <h1 className="text-2xl md:text-4xl font-black text-[#010657] uppercase tracking-tight leading-tight">
                    {selectedArticle.title}
                  </h1>
                  <p className="text-gray-600 font-medium text-sm md:text-base leading-relaxed whitespace-pre-wrap pt-4">
                    {selectedArticle.body || selectedArticle.content}
                  </p>
                </div>

                {/* Foot actions */}
                <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedArticle(null)}
                    className="flex items-center space-x-1.5 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-primary rounded-full transition-all text-xs font-black uppercase tracking-wider"
                  >
                    <ArrowLeft size={14} />
                    <span>Retour au journal</span>
                  </button>

                  {/* Actions for supervisors/author */}
                  {(isAdmin || selectedArticle.author_id === profile?.id) && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={(e) => openEditModal(selectedArticle, e)}
                        className="p-3 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-2xl transition-all"
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(selectedArticle.id, e)}
                        className="p-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-2xl transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-primary tracking-tight uppercase flex items-center space-x-2">
            <span>Journal CODOSA</span>
          </h2>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Articles officiels et récits de l'école</p>
        </div>

        <div className="flex items-center space-x-3">
          {canWrite && (
            <button 
              onClick={openAddModal}
              className="bg-secondary text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <PenTool size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest px-1 hidden sm:inline">Créer</span>
            </button>
          )}
        </div>
      </header>

      {isAdmin && (
        <div className="flex bg-gray-100 p-1 rounded-2xl overflow-hidden max-w-sm">
          <button 
            onClick={() => setTab('all')}
            className={clsx("flex-1 py-2.5 text-xs font-bold rounded-xl transition-all", tab === 'all' ? "bg-white text-primary shadow-sm" : "text-gray-500")}
          >
            {t('journal.published', 'Publiés')}
          </button>
          <button 
            onClick={() => setTab('pending')}
            className={clsx("flex-1 py-2.5 text-xs font-bold rounded-xl transition-all relative", tab === 'pending' ? "bg-white text-primary shadow-sm" : "text-gray-500")}
          >
            {t('journal.pending', 'En attente')}
            {pendingArticles.length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      )}

      {tab === 'all' ? (
        <>
          {/* Categories select pills */}
          <div className="flex overflow-x-auto space-x-2 pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={clsx(
                  "px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  filter === cat.id ? "bg-primary text-white shadow-md scale-105" : "bg-white text-primary border border-gray-100 hover:bg-gray-50"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="loader"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white p-16 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
              <ImageIcon className="w-16 h-16 text-gray-100 mx-auto mb-4 animate-pulse" />
              <h3 className="text-base font-black text-primary uppercase">Aucun élément trouvé</h3>
              <p className="text-xs text-gray-400 font-bold uppercase mt-1">Revenez plus tard pour lire des récits !</p>
            </div>
          ) : filter === 'gallery' ? (
            
            /* --- GALERIE TAB PHOTO GRID --- */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
              {filteredArticles.map((art) => (
                <motion.div
                  key={art.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setSelectedArticle(art)}
                  className="relative aspect-square rounded-[1.8rem] overflow-hidden cursor-pointer group shadow-sm bg-gray-50 border border-gray-100"
                >
                  <img 
                    src={art.cover_image_url} 
                    alt={art.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Subtle hover titles backdrop overlay */}
                  <div className="absolute inset-0 bg-primary/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                    <p className="text-white text-xs font-black uppercase tracking-tight leading-snug line-clamp-2">
                      {art.title}
                    </p>
                  </div>
                  
                  {/* Always showing overlay bottom title header on mobile screens */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pt-10 md:hidden">
                    <p className="text-white text-[10px] font-black uppercase tracking-tight line-clamp-1">{art.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>

          ) : (

            /* --- REGULAR ARTICLE DUAL CARD GRIDS --- */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((art) => (
                <motion.div 
                  key={art.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6 }}
                  onClick={() => setSelectedArticle(art)}
                  className="bg-white rounded-[2.2rem] overflow-hidden shadow-xl border border-gray-50 flex flex-col group cursor-pointer"
                >
                  {/* Top full width cover image thumbnail strictly 180px */}
                  <div className="h-[180px] bg-gray-100 relative overflow-hidden shrink-0">
                    {art.cover_image_url ? (
                      <img 
                        src={art.cover_image_url} 
                        alt={art.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-15 bg-primary">
                        <ImageIcon size={32} className="text-white" />
                        <span className="font-black text-[10px] uppercase text-white mt-1">CODOSA</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-md text-primary text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                        {art.category}
                      </span>
                    </div>
                  </div>

                  {/* Details block rendered strictly below image */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          {new Date(art.published_at || art.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-black text-primary leading-snug uppercase group-hover:text-secondary transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                        {art.body || art.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 shrink-0">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-black text-secondary">
                          {art.author_role?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-primary uppercase tracking-wider">Auteur : {art.author_role}</p>
                          <p className="text-[8px] text-gray-400 font-bold">CODOSA Team</p>
                        </div>
                      </div>
                      <ChevronRight className="text-secondary group-hover:translate-x-2.5 transition-transform" size={20} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        
        /* --- PENDING COMPONENT VALIDATION TAB --- */
        <div className="space-y-4 max-w-xl animate-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-xs font-black uppercase text-accent tracking-widest flex items-center space-x-1.5">
            <span>Validation d'articles en cours</span>
            <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full">{pendingArticles.length}</span>
          </h3>

          {pendingArticles.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border border-gray-50 text-center shadow-xs">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-xs text-gray-400 font-bold uppercase">Tous les articles ont été traités !</p>
            </div>
          ) : (
            pendingArticles.map((art) => (
              <div key={art.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-orange-100 flex flex-col md:flex-row gap-5 justify-between">
                
                {/* Thumb preview list */}
                <div className="flex gap-4">
                  {art.cover_image_url && (
                    <img 
                      src={art.cover_image_url} 
                      alt="" 
                      className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shrink-0" 
                    />
                  )}
                  <div className="space-y-1 my-auto">
                    <h4 className="font-black text-primary uppercase text-sm leading-tight">{art.title}</h4>
                    <p className="text-[9px] text-[#010657] font-bold uppercase tracking-wider">Auteur : {art.author_role}</p>
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">{art.body || art.content}</p>
                  </div>
                </div>

                <div className="flex md:flex-col justify-center gap-2 shrink-0 md:w-32">
                   <button 
                     onClick={() => handleApprove(art.id)} 
                     className="flex-1 bg-green-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center flex items-center justify-center space-x-1 hover:bg-green-600 transition-all cursor-pointer"
                   >
                     <CheckCircle size={12} /> <span>Approuver</span>
                   </button>
                   <button 
                     onClick={() => handleReject(art.id)} 
                     className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center flex items-center justify-center space-x-1 transition-all cursor-pointer"
                   >
                     <XCircle size={12} /> <span>Rejeter</span>
                   </button>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE / EDIT ARTICLE DOCK MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 space-y-6 shadow-2xl relative border border-gray-100 text-left my-8"
            >
              <button 
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-primary transition-all"
              >
                <X size={18} />
              </button>

              <div>
                <h3 className="text-lg font-black text-primary uppercase">
                  {editingArticle ? "Modifier l'article" : "Écrire un article"}
                </h3>
                <p className="text-[9px] text-gray-400 uppercase font-black mt-0.5">
                  {isAdmin ? "L'article sera mis en ligne immédiatement" : "Votre proposition sera validée par l'administration avant publication"}
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Title */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-0.5">Titre de l'article * :</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Succès scolaire au CODOSA"
                    className="p-3 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                  />
                </div>

                {/* Content text */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-0.5">Contenu officiel * :</label>
                  <textarea
                    rows={6}
                    required
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Racontez votre histoire..."
                    className="p-3 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all leading-relaxed"
                  />
                </div>

                {/* Cover Image Upload (Required before submit) */}
                <div className="flex flex-col space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-0.5">Image de couverture * (Requis) :</label>
                  
                  {/* Visual Picker preview container */}
                  <div className="flex gap-4 items-center">
                    {(coverImageFile || coverImageUrl) ? (
                      <div className="w-20 h-20 rounded-2xl relative bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                        <img 
                          src={coverImageFile ? URL.createObjectURL(coverImageFile) : coverImageUrl} 
                          alt="Cover thumbnail" 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImageFile(null);
                            setCoverImageUrl('');
                          }}
                          className="absolute inset-0 bg-red-600/80 hover:bg-red-700/90 text-white transition-opacity flex items-center justify-center opacity-0 hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0">
                        <ImageIcon size={20} />
                        <span className="text-[7px] font-black uppercase mt-1">Vide</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        id="image-picker"
                        accept="image/png, image/jpg, image/jpeg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             setCoverImageFile(file);
                          }
                        }}
                        className="hidden"
                      />
                      <label 
                        htmlFor="image-picker"
                        className="bg-gray-100 hover:bg-gray-200 text-primary px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider inline-block cursor-pointer transition-all active:scale-95 text-center"
                      >
                        SÉLECTIONNER UN FICHIER
                      </label>
                      <p className="text-[8px] text-gray-400 font-bold uppercase">Format .jpg, .png, .webp uniquement</p>
                    </div>
                  </div>
                </div>

                {/* Submit button row */}
                <div className="pt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-3 rounded-full text-primary hover:bg-gray-100 font-bold text-xs uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingImage}
                    className="bg-[#fac900] text-[#010657] hover:bg-[#ebd056] px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50 inline-flex items-center space-x-1"
                  >
                    {(saving || uploadingImage) ? <Loader size={12} className="animate-spin" /> : null}
                    <span>{(saving || uploadingImage) ? "Envoi..." : (editingArticle ? "Mettre à jour" : "Publier")}</span>
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
