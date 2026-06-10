import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Loader, 
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  BookOpen
} from 'lucide-react';
import clsx from 'clsx';

export default function Events() {
  const navigate = useNavigate();
  const { profile, activeCampus } = useAuth();
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [campus, setCampus] = useState<'fondamental' | 'secondaire' | 'both'>('both');
  const [saving, setSaving] = useState(false);

  // Checks who is allowed to manage events
  const canManage = ['directeur', 'censeur', 'resp_pedagogique', 'resp_discipline'].includes(profile?.role || '');
  const isDirecteurOrAdmin = ['directeur', 'super_admin'].includes(profile?.role || '');

  // Calculate user's active campus
  const campusValue = profile?.role === 'directeur' ? activeCampus : (profile?.campus || 'fondamantal');
  const cleanCampus = campusValue === 'fondamantal' || campusValue === 'fondamentale' ? 'fondamantal' : 'secondaire';

  const fetchEvents = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch all events for the current month
      const { data, error: err } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startOfMonth)
        .lte('event_date', endOfMonth)
        .order('event_date', { ascending: true });

      if (data && !err) {
        // Event visibility:
        // - Campus-specific events visible only to users of that campus
        // - "Les deux" events visible to all users
        // - Directeur sees all events from both campuses
        let filtered = data;
        if (profile?.role !== 'directeur' && profile?.role !== 'super_admin') {
          const isFondType = (profile?.campus === 'fondamantal' || profile?.campus === 'fondamentale');
          filtered = data.filter(e => {
            if (e.campus === 'both') return true;
            if (isFondType && e.campus === 'fondamental') return true;
            if (!isFondType && e.campus === 'secondaire') return true;
            return false;
          });
        }
        setEvents(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Setup real-time updates for events page
    const eventsChannel = supabase
      .channel('events_realtime_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
    };
  }, [profile, activeCampus]);

  const openAddModal = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setEventDate(new Date().toISOString().split('T')[0]);
    
    // Auto-set campus based on role/campus
    if (isDirecteurOrAdmin) {
      setCampus('both');
    } else {
      const isFondType = (profile?.campus === 'fondamantal' || profile?.campus === 'fondamentale');
      setCampus(isFondType ? 'fondamental' : 'secondaire');
    }
    
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (event: any) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setEventDate(event.event_date);
    
    // Auto-set campus based on role/campus if not admin
    if (isDirecteurOrAdmin) {
      setCampus(event.campus);
    } else {
      const isFondType = (profile?.campus === 'fondamantal' || profile?.campus === 'fondamentale');
      setCampus(isFondType ? 'fondamental' : 'secondaire');
    }
    
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;
    try {
      const { error: err } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setSuccess("Événement supprimé !");
      setTimeout(() => setSuccess(''), 2000);
      fetchEvents();
    } catch (err: any) {
      setError("Erreur : " + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) {
      setError("Veuillez remplir les champs obligatoires.");
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      title,
      description,
      event_date: eventDate,
      campus,
      created_by: profile?.id
    };

    try {
      if (editingEvent) {
        // UPDATE
        const { error: err } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingEvent.id);
        if (err) throw err;
        setSuccess("L'événement a été modifié !");
      } else {
        // INSERT
        const { error: err } = await supabase
          .from('events')
          .insert(payload);
        if (err) throw err;
        setSuccess("L'événement a été programmé !");
      }

      setModalOpen(false);
      setTimeout(() => setSuccess(''), 2000);
      fetchEvents();
    } catch (err: any) {
      setError(err.message || "Erreur de configuration");
    } finally {
      setSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto pb-24 text-left animate-in fade-in duration-500">
      
      {/* Header back navigation */}
      <nav className="flex items-center space-x-2">
        <button 
          onClick={() => navigate('/home')}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-primary transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Retour à l'accueil</span>
      </nav>

      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary uppercase tracking-tight flex items-center space-x-2">
            <Calendar className="text-secondary" size={26} />
            <span>Calendrier & Événements</span>
          </h2>
          <p className="text-xs text-gray-400 uppercase font-bold mt-1">
            {isDirecteurOrAdmin ? (
              <span>Tous les événements ce mois</span>
            ) : (
              <span>Événements de ce mois pour le campus <span className="text-secondary font-black">{cleanCampus.toUpperCase()}</span></span>
            )}
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="bg-[#fac900] text-[#010657] hover:bg-[#ebd056] px-5 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Ajouter Événement</span>
          </button>
        )}
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl flex items-center space-x-3 text-green-800"
        >
          <CheckCircle size={18} className="shrink-0 text-green-600" />
          <span className="text-xs font-black uppercase tracking-wider">{success}</span>
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center space-x-3 text-red-800"
        >
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span className="text-xs font-black uppercase tracking-wider">{error}</span>
        </motion.div>
      )}

      {/* Events Directory List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="loader"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white p-16 rounded-[2rem] border border-gray-100 shadow-sm text-center">
          <Calendar className="w-16 h-16 text-gray-100 mx-auto mb-4 animate-pulse" />
          <h3 className="text-base font-black text-primary uppercase">Aucun événement ce mois</h3>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1">Revenez plus tard ou planifiez-en un si vous en avez les droits !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => {
            const isPast = event.event_date < todayStr;
            const eventDateFormatted = new Date(event.event_date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            });

            return (
              <motion.div
                key={event.id}
                whileHover={{ y: isPast ? 0 : -4 }}
                className={clsx(
                  "bg-white p-6 rounded-[2.2rem] shadow-xs relative overflow-hidden flex flex-col justify-between transition-all",
                  "border-l-[6px] border-l-[#fac900] border border-gray-100",
                  isPast && "opacity-55 scale-[0.98] border-l-gray-300"
                )}
              >
                {/* Visual Accent past badge */}
                {isPast && (
                  <span className="absolute top-4 right-4 bg-gray-100 px-2.5 py-0.5 rounded text-[8px] font-black uppercase text-gray-400">
                    Terminé
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center text-primary/40 space-x-1">
                    <Clock size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {eventDateFormatted}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-[#010657] uppercase leading-tight">
                      {event.title}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed mt-2 line-clamp-3">
                      {event.description || "Aucune description fournie pour cet événement."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                  {/* Campus Badge */}
                  <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 bg-primary/5 text-[#010657] rounded-full border border-primary/10">
                    Campus : {event.campus === 'both' ? "Tous" : event.campus.toUpperCase()}
                  </span>

                  {/* Actions for Authorized roles */}
                  {canManage && (
                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-2 text-primary hover:text-white bg-gray-50 hover:bg-primary rounded-xl transition-all cursor-pointer"
                        title="Modifier"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-xl transition-all cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL DOCK */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-lg p-6 space-y-6 shadow-2xl relative border border-gray-100 text-left"
            >
              <button 
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-primary transition-all"
              >
                <X size={18} />
              </button>

              <div>
                <h3 className="text-lg font-black text-primary uppercase">
                  {editingEvent ? "Modifier l'événement" : "Ajouter un événement"}
                </h3>
                <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Programmez des activités visibles pour votre campus</p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Title */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-0.5">Titre de l'événement * :</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Assemblée Générale"
                    className="p-3 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-0.5">Description complète :</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Détails, horaires, consignes..."
                    className="p-3 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all leading-normal"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-0.5">Date de l'événement * :</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="p-3 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                  />
                </div>

                {/* Campus selectors buttons */}
                {isDirecteurOrAdmin && (
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-0.5">Campus Cible :</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCampus('fondamental')}
                      className={clsx(
                        "p-3 rounded-xl font-bold text-[10px] uppercase transition-all border text-center cursor-pointer",
                        campus === 'fondamental' 
                          ? "bg-primary text-white border-transparent shadow" 
                          : "bg-gray-50 hover:bg-gray-100 text-[#010657] border-gray-100"
                      )}
                    >
                      Fondamentale
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setCampus('secondaire')}
                      className={clsx(
                        "p-3 rounded-xl font-bold text-[10px] uppercase transition-all border text-center cursor-pointer",
                        campus === 'secondaire' 
                          ? "bg-primary text-white border-transparent shadow" 
                          : "bg-gray-50 hover:bg-gray-100 text-[#010657] border-gray-100"
                      )}
                    >
                      Secondaire
                    </button>

                    <button
                      type="button"
                      onClick={() => setCampus('both')}
                      className={clsx(
                        "p-3 rounded-xl font-bold text-[10px] uppercase transition-all border text-center cursor-pointer",
                        campus === 'both' 
                          ? "bg-primary text-white border-transparent shadow" 
                          : "bg-gray-50 hover:bg-gray-100 text-[#010657] border-gray-100"
                      )}
                    >
                      Les deux
                    </button>
                  </div>
                </div>
                )}

                {/* Submit Dock buttons */}
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
                    disabled={saving}
                    className="bg-[#fac900] text-[#010657] hover:bg-[#ebd056] px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50 inline-flex items-center space-x-1"
                  >
                    {saving ? <Loader size={12} className="animate-spin" /> : null}
                    <span>{saving ? "Sauvegarde..." : "Planifier"}</span>
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
