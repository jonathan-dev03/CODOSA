import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Settings,
  CheckCircle,
  AlertCircle,
  Users,
  Search,
  Filter,
  Lock,
  Edit2,
  Trash2,
  Check,
  X,
  Copy,
  RefreshCw
} from 'lucide-react';

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

export default function Admin() {
  const navigate = useNavigate();
  const { profile, activeCampus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'info' | 'accounts'>('accounts');

  // School configuration state
  const [heroTitle, setHeroTitle] = useState(defaultSchoolInfo.hero_title);
  const [heroSubtitle, setHeroSubtitle] = useState(defaultSchoolInfo.hero_subtitle);
  const [aboutText, setAboutText] = useState(defaultSchoolInfo.about_text);
  const [location, setLocation] = useState(defaultSchoolInfo.location);
  const [foundedYear, setFoundedYear] = useState(defaultSchoolInfo.founded_year);
  const [contactAddress, setContactAddress] = useState(defaultSchoolInfo.contact_address);
  const [contactPhone, setContactPhone] = useState(defaultSchoolInfo.contact_phone);
  const [contactEmail, setContactEmail] = useState(defaultSchoolInfo.contact_email);

  // Accounts management state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inline edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');

  // Password reset success modal state
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; userName: string; tempPassword?: string } | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!fetchErr && data) {
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    // Only directeur or super_admin role can access this page
    if (profile && profile.role !== 'directeur' && profile.role !== 'super_admin') {
      navigate('/home');
      return;
    }

    const fetchSchoolInfoInAdmin = async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('school_info')
          .select('*');
        if (data && data.length > 0 && !fetchErr) {
          data.forEach((row: any) => {
            if (row.key === 'hero_title') setHeroTitle(row.value);
            if (row.key === 'hero_subtitle') setHeroSubtitle(row.value);
            if (row.key === 'about_text') setAboutText(row.value);
            if (row.key === 'location') setLocation(row.value);
            if (row.key === 'founded_year') setFoundedYear(row.value);
            if (row.key === 'contact_address') setContactAddress(row.value);
            if (row.key === 'contact_phone') setContactPhone(row.value);
            if (row.key === 'contact_email') setContactEmail(row.value);
          });
        } else {
          // Check local fallback
          const local = localStorage.getItem('school_info');
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed.hero_title) setHeroTitle(parsed.hero_title);
            if (parsed.hero_subtitle) setHeroSubtitle(parsed.hero_subtitle);
            if (parsed.about_text) setAboutText(parsed.about_text);
            if (parsed.location) setLocation(parsed.location);
            if (parsed.founded_year) setFoundedYear(parsed.founded_year);
            if (parsed.contact_address) setContactAddress(parsed.contact_address);
            if (parsed.contact_phone) setContactPhone(parsed.contact_phone);
            if (parsed.contact_email) setContactEmail(parsed.contact_email);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolInfoInAdmin();
    if (profile && (profile.role === 'directeur' || profile.role === 'super_admin')) {
      fetchUsers();
    }
  }, [profile]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const records = [
      { key: 'hero_title', value: heroTitle },
      { key: 'hero_subtitle', value: heroSubtitle },
      { key: 'about_text', value: aboutText },
      { key: 'location', value: location },
      { key: 'founded_year', value: foundedYear },
      { key: 'contact_address', value: contactAddress },
      { key: 'contact_phone', value: contactPhone },
      { key: 'contact_email', value: contactEmail }
    ];

    try {
      const promises = records.map(async (rec) => {
        // Find existing record
        const { data: existing } = await supabase
          .from('school_info')
          .select('id')
          .eq('key', rec.key)
          .maybeSingle();

        if (existing?.id) {
          return supabase
            .from('school_info')
            .update({
              value: rec.value,
              updated_by: profile?.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          return supabase
            .from('school_info')
            .insert({
              key: rec.key,
              value: rec.value,
              updated_by: profile?.id
            });
        }
      });

      await Promise.all(promises);

      // Save to local cache
      const cacheObj = {
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        about_text: aboutText,
        location: location,
        founded_year: foundedYear,
        contact_address: contactAddress,
        contact_phone: contactPhone,
        contact_email: contactEmail
      };
      localStorage.setItem('school_info', JSON.stringify(cacheObj));

      setSuccess("Les informations de l'école ont été modifiées et synchronisées avec succès !");
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError("Erreur durant l'enregistrement : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async (userId: string, newEmail: string) => {
    setError('');
    setSuccess('');
    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail.endsWith('@codosapv.com')) {
      setError("L'imel la dwe fennen nan @codosapv.com sèlman !");
      return;
    }

    try {
      const { error: rpcErr } = await supabase.rpc('admin_change_email', {
        target_user_id: userId,
        new_email: cleanEmail
      });

      if (rpcErr) throw rpcErr;

      setSuccess("Imel la chanje ak siksè !");
      setEditingUserId(null);
      await fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Ayayay, erè pèmisyon oswa sèvè : " + (err.message || err.toString()));
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    setError('');
    setSuccess('');

    // Generate random safe 10-char password
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const { error: rpcErr } = await supabase.rpc('admin_reset_password', {
        target_user_id: userId,
        temp_password: tempPassword
      });

      if (rpcErr) throw rpcErr;

      setResetModal({
        isOpen: true,
        userName,
        tempPassword
      });
      setSuccess(`Kòd sekirite réinitialisé ak siksè pou ${userName} !`);
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      setError("Erreur : " + (err.message || err.toString()));
    }
  };

  const handleDeleteUser = async (user: any) => {
    setError('');
    setSuccess('');

    // Creole confirmation constraint
    const confirmed = window.confirm(`Ou sèten ou vle siprime kont ${user.full_name} a?\nAksyon sa a pa ka defèt.`);
    if (!confirmed) return;

    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_user', {
        target_user_id: user.id
      });

      if (rpcErr) throw rpcErr;

      setSuccess(`Kont ${user.full_name} a siprime avèk siksè !`);
      await fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Erreur de suppression : " + (err.message || err.toString()));
    }
  };

  // Filtered Users logic
  const filteredUsers = users.filter((u) => {
    // 1. Search text query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (u.full_name || '').toLowerCase().includes(query) || 
      (u.email || '').toLowerCase().includes(query);

    // 2. Campus View helper
    let matchesCampus = true;
    if (campusFilter !== 'all') {
      const normalizedRowCampus = u.campus === 'fondamantal' ? 'fondamentale' : (u.campus || '');
      matchesCampus = normalizedRowCampus === campusFilter || u.campus === 'both' || campusFilter === 'both';
    }

    // 3. Role view helper
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    // 4. Status identifier view
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesCampus && matchesRole && matchesStatus;
  });

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'directeur': return 'bg-amber-100 text-amber-800';
      case 'censeur': return 'bg-purple-100 text-purple-800';
      case 'resp_pedagogique': return 'bg-cyan-100 text-cyan-800';
      case 'secretaire': return 'bg-teal-100 text-teal-800';
      case 'resp_discipline': return 'bg-indigo-100 text-indigo-800';
      case 'professeur': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'deactivated': return 'bg-red-150 text-red-900';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-24 text-left">
      {/* Header Back Link */}
      <nav className="flex items-center space-x-2">
        <button 
          onClick={() => navigate('/account')}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-primary transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Retour à mon compte</span>
      </nav>

      {/* Hero Header Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tight flex items-center space-x-2">
            <Settings className="text-secondary animate-spin-slow" size={28} />
            <span>Panneau Directeur & Administration</span>
          </h2>
          <p className="text-xs text-gray-400 uppercase font-bold mt-1">Gérez la configuration du portail et les comptes d'utilisateurs</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl self-start shrink-0">
          <button 
            onClick={() => setActiveTab('accounts')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'accounts' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary'
            }`}
          >
            <Users size={14} />
            <span>Gestion des Comptes ({users.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'info' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary'
            }`}
          >
            <Settings size={14} />
            <span>Données de l'École</span>
          </button>
        </div>
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

      {/* Password Reset Modal Showcase */}
      {resetModal?.isOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative">
            <button 
              onClick={() => setResetModal(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-primary transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center text-secondary mx-auto">
                <Lock size={26} />
              </div>
              <h3 className="text-lg font-black text-primary uppercase">Kòd sekirite réinitialisé !</h3>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                Kòd sekirite pou kont kontinantal <strong>{resetModal.userName}</strong> chanje avèk siksè. 
                Veuillez copier et envoyer ce mot de passe temporaire à l'utilisateur :
              </p>

              <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                <code className="text-base font-black text-primary font-mono select-all tracking-wider">{resetModal.tempPassword}</code>
                <button 
                  onClick={() => {
                    if (resetModal.tempPassword) {
                      navigator.clipboard.writeText(resetModal.tempPassword);
                      alert("Kòd la kopye nan planch kach ou !");
                    }
                  }}
                  className="p-2 text-secondary hover:text-primary transition-all hover:bg-yellow-100 rounded-xl cursor-pointer"
                  title="Copier le code"
                >
                  <Copy size={16} />
                </button>
              </div>

              <div className="text-[10px] text-gray-400 font-bold uppercase pt-1">
                L'utilisateur devra obligatoirement modifier ce mot de passe lors de sa prochaine connexion.
              </div>

              <button 
                onClick={() => setResetModal(null)}
                className="w-full bg-primary text-white hover:bg-opacity-95 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer mt-4"
              >
                Fèmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: School Info configuration form */}
      {activeTab === 'info' && (
        <form onSubmit={handleSaveInfo} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="font-extrabold text-sm text-primary uppercase">Sections d'Accueil & Slogan</h3>
            <p className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold">Gérez la présentation principale de la bannière héro</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Surtitre d'accueil :</label>
              <input 
                type="text"
                required
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="p-3.5 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Slogan Principal :</label>
              <input 
                type="text"
                required
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="p-3.5 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
              />
            </div>
          </div>

          <div className="border-b border-gray-100 pb-4 pt-2">
            <h3 className="font-extrabold text-sm text-primary uppercase">À Propos de l'Établissement</h3>
            <p className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold">Historique, philosophie et paramètres de présentation</p>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase px-1">Description À Propos :</label>
            <textarea 
              rows={4}
              required
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="p-4 bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Ville / Localisation :</label>
              <div className="relative">
                <MapPin className="stroke-secondary absolute left-4 top-3.5" size={16} />
                <input 
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-11 p-3.5 w-full bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Année de Fondation :</label>
              <div className="relative">
                <Calendar className="stroke-secondary absolute left-4 top-3.5" size={16} />
                <input 
                  type="text"
                  required
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  className="pl-11 p-3.5 w-full bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 pb-4 pt-2">
            <h3 className="font-extrabold text-sm text-primary uppercase">Coordonnées de Contact public</h3>
            <p className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold">Informations affichées dans l'encart de contact en bas de page</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Adresse Complète :</label>
              <div className="relative">
                <MapPin className="stroke-secondary absolute left-4 top-3.5" size={16} />
                <input 
                  type="text"
                  required
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className="pl-11 p-3.5 w-full bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase px-1">Téléphone de contact :</label>
                <div className="relative">
                  <Phone className="stroke-secondary absolute left-4 top-3.5" size={16} />
                  <input 
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="pl-11 p-3.5 w-full bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase px-1">Adresse Email :</label>
                <div className="relative">
                  <Mail className="stroke-secondary absolute left-4 top-3.5" size={16} />
                  <input 
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="pl-11 p-3.5 w-full bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              disabled={saving}
              className="bg-[#fac900] text-[#010657] hover:bg-[#ebd056] px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save size={16} />
              <span>{saving ? "Enregistrement..." : "Sauvegarder"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Accounts Management Dashboard */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          
          {/* Controls Filters Section */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search Query */}
            <div className="flex flex-col space-y-1.5 md:col-span-2 relative">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Rechercher un membre :</label>
              <div className="relative">
                <Search className="stroke-gray-400 absolute left-4 top-3.5" size={16} />
                <input 
                  type="text"
                  placeholder="Nom ou adresse email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 p-3.5 w-full bg-gray-50 focus:bg-white border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary transition-all"
                />
              </div>
            </div>

            {/* Campus Filter */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Campus :</label>
              <select 
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="p-3.5 w-full bg-gray-50 border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary cursor-pointer transition-all appearance-none"
              >
                <option value="all">Tous les Campus</option>
                <option value="fondamentale">Fondamentale</option>
                <option value="secondaire">Secondaire</option>
                <option value="both">Les deux / Commun</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Rôle :</label>
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="p-3.5 w-full bg-gray-50 border border-transparent focus:border-secondary outline-none rounded-xl text-xs font-bold text-primary cursor-pointer transition-all"
              >
                <option value="all">Tous les rôles</option>
                <option value="super_admin">Super Admin</option>
                <option value="directeur">Directeur</option>
                <option value="censeur">Censeur</option>
                <option value="resp_discipline">Responsable Discipline</option>
                <option value="resp_pedagogique">Resp. Pédagogique</option>
                <option value="secretaire">Secrétaire</option>
                <option value="professeur">Professeur</option>
                <option value="eleve">Élève</option>
              </select>
            </div>
          </div>

          {/* User Account Table Wrapper */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            {loadingUsers ? (
              <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="text-secondary animate-spin" size={32} />
                <span className="text-xs font-extrabold uppercase text-gray-400">Chaje manm yo...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-20 text-center">
                <div className="text-gray-300 font-black uppercase text-base mb-2">Okenn kont yo pa jwenn</div>
                <p className="text-xs font-medium text-gray-400 max-w-sm mx-auto">Chanje filtè yo oswa chèche yon lòt non pou jwenn moun wap chache a.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4.5 px-6 text-[10px] uppercase font-black text-gray-400 tracking-wider">Identité & Imel</th>
                      <th className="py-4.5 px-6 text-[10px] uppercase font-black text-gray-400 tracking-wider">Rôle / Fonction</th>
                      <th className="py-4.5 px-6 text-[10px] uppercase font-black text-gray-400 tracking-wider">Campus</th>
                      <th className="py-4.5 px-6 text-[10px] uppercase font-black text-gray-400 tracking-wider">Statut</th>
                      <th className="py-4.5 px-6 text-[10px] uppercase font-black text-gray-400 tracking-wider">Dernière Connexion</th>
                      <th className="py-4.5 px-6 text-[10px] uppercase font-black text-gray-400 tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => {
                      const isEditingEmail = editingUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-all">
                          {/* Name & Email (Edit mode inline support) */}
                          <td className="py-5 px-6">
                            <div className="flex flex-col space-y-0.5 max-w-xs">
                              <span className="text-xs font-black text-primary uppercase tracking-tight">{u.full_name}</span>
                              
                              {isEditingEmail ? (
                                <div className="flex items-center space-x-1 mt-1 z-10">
                                  <input 
                                    type="text"
                                    value={editingEmailValue}
                                    onChange={(e) => setEditingEmailValue(e.target.value)}
                                    className="p-1.5 max-w-[180px] bg-white border border-secondary outline-none rounded-lg text-[10px] font-bold text-primary transition-all"
                                  />
                                  <button 
                                    onClick={() => handleSaveEmail(u.id, editingEmailValue)}
                                    className="p-1 px-1.5 bg-green-500 hover:bg-green-650 text-white rounded-lg transition-all cursor-pointer"
                                    title="Confirmer"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button 
                                    onClick={() => setEditingUserId(null)}
                                    className="p-1 px-1.5 bg-red-500 hover:bg-red-650 text-white rounded-lg transition-all cursor-pointer"
                                    title="Annuler"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5 group select-none">
                                  <span className="text-[10px] text-gray-400 font-bold tracking-wide break-all">{u.email}</span>
                                  <button 
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setEditingEmailValue(u.email);
                                    }}
                                    className="text-gray-300 hover:text-secondary opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                    title="Modifier l'adresse email"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Role Designation Badge */}
                          <td className="py-5 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getRoleBadgeClasses(u.role)}`}>
                              {u.role === 'super_admin' ? 'Super Admin' : 
                               u.role === 'resp_discipline' ? 'Resp. Discipline' :
                               u.role === 'resp_pedagogique' ? 'Resp. Pédagogique' : u.role}
                            </span>
                          </td>

                          {/* Campus localization */}
                          <td className="py-5 px-6">
                            <span className="text-xs text-gray-500 font-black uppercase tracking-wider">
                              {u.campus === 'both' ? 'Commun' : (u.campus === 'fondamantal' ? 'Fondamentale' : (u.campus || 'N/A'))}
                            </span>
                          </td>

                          {/* Approved state indicator tag */}
                          <td className="py-5 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClasses(u.status || 'active')}`}>
                              {u.status === 'active' || u.is_approved ? 'Actif' : 'En Attente'}
                            </span>
                          </td>

                          {/* Last signed in timestamp indicator */}
                          <td className="py-5 px-6">
                            <span className="text-xs font-mono text-gray-400 font-bold">
                              {u.last_login_at ? (
                                new Date(u.last_login_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              ) : (
                                new Date(u.created_at || Date.now()).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                }) + ' (Inscrire)'
                              )}
                            </span>
                          </td>

                          {/* Account Action Commands */}
                          <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Reset password temporary generated button */}
                              <button 
                                onClick={() => handleResetPassword(u.id, u.full_name)}
                                className="p-2 border border-gray-150 hover:border-yellow-200 text-gray-400 hover:text-secondary bg-white hover:bg-yellow-50 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                                title="Réinitialiser le mot de passe"
                              >
                                <Lock size={14} />
                              </button>

                              {/* Hard Deletion of profile credentials */}
                              {profile?.role === 'super_admin' && (
                                <button 
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-2 border border-gray-150 hover:border-red-200 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                                  title="Supprimer entièrement le compte"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
