import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Search, GraduationCap, Check, Clock, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Professors() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const isFr = i18n.language === 'fr';

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
        <p className="text-gray-500 font-medium text-xs leading-relaxed">Ou pa gen pèmisyon pou wè lis pwofesè yo.</p>
      </div>
    );
  }

  const isAdminOrStaff = ['super_admin', 'directeur', 'censeur_fondamental', 'censeur_secondaire', 'resp_ped_fondamental', 'resp_ped_secondaire'].includes(profile?.role || '');

  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [professors, setProfessors] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProfessors();
    if (isAdminOrStaff) {
      fetchPendingUsers();
    }
  }, [profile]);

  const fetchProfessors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'professeur')
      .eq('is_approved', true)
      .order('full_name');

    if (data) {
      const parsedProfs = data.map(p => {
        let cleanName = p.full_name || '';
        if (cleanName.includes(' |availability:')) {
          cleanName = cleanName.split(' |availability:')[0];
        } else if (cleanName.includes(' |start_year:')) {
          cleanName = cleanName.split(' |start_year:')[0];
        }
        return {
          ...p,
          display_name: cleanName,
          subject: p.subject || (isFr ? 'Matière polyvalente' : 'Plis pase yon kòz')
        };
      });
      setProfessors(parsedProfs);
    }
    setLoading(false);
  };

  const fetchPendingUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });
    
    if (data) {
      setPendingUsers(data);
    }
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    const cleanName = userName.split(' |availability:')[0].split(' |start_year:')[0];
    const confirmApprove = confirm(
      isFr 
        ? `Voulez-vous valider et approuver le compte de "${cleanName}" ?` 
        : `Èske ou vle valide ak apwouve kont "${cleanName}" la ?`
    );
    if (!confirmApprove) return;

    setLoading(true);
    const { error } = await supabase
      .from('users')
      .update({ is_approved: true })
      .eq('id', userId);

    if (error) {
      alert("Erreur: " + error.message);
    } else {
      alert(isFr ? "Compte validé avec succès !" : "Kont lan valide e apwouve ak siksè !");
      await fetchProfessors();
      await fetchPendingUsers();
    }
    setLoading(false);
  };

  const filteredApproved = professors.filter(p => 
    p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPending = pendingUsers.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight">
            {isFr ? "Professeurs & Personnel" : t('professors.title')}
          </h1>
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-1">
            CODOSA Faculty & Approvals
          </p>
        </div>

        {isAdminOrStaff && (
          <div className="flex bg-gray-150 p-1 rounded-2xl border border-gray-200 self-start md:self-auto shrink-0 shadow-sm">
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center space-x-2 ${
                activeTab === 'approved' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary'
              }`}
            >
              <GraduationCap size={15} />
              <span>{isFr ? "Enseignants" : "Pwofesè yo"} ({filteredApproved.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center space-x-2 relative ${
                activeTab === 'pending' ? 'bg-secondary text-white shadow-md' : 'text-gray-500 hover:text-secondary'
              }`}
            >
              <UserCheck size={15} />
              <span>{isFr ? "Validations" : "Apwobasyon"}</span>
              {filteredPending.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-pulse">
                  {filteredPending.length}
                </span>
              )}
            </button>
          </div>
        )}
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder={isFr ? "Rechercher par nom ou email..." : t('professors.search')}
          className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-secondary/20 transition-all text-sm font-bold"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {activeTab === 'approved' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {loading ? (
            <div className="col-span-full flex justify-center py-12"><div className="loader"></div></div>
          ) : filteredApproved.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs border border-dashed border-gray-200 rounded-3xl">
              {isFr ? "Aucun enseignant trouvé" : "Pa gen pwofesè yo jwenn"}
            </div>
          ) : (
            filteredApproved.map((prof, idx) => (
              <motion.div
                key={prof.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.01 }}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-150 flex items-center space-x-6 group hover:shadow-md transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border-2 border-primary/10 group-hover:bg-secondary group-hover:border-secondary transition-all shrink-0">
                  <GraduationCap className="text-primary group-hover:text-white transition-all" size={32} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-black text-primary uppercase leading-tight truncate">{prof.display_name}</h3>
                  <p className="text-[10px] font-black text-secondary tracking-widest uppercase mt-1 truncate">
                    Email: {prof.email}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                      Campus: {prof.campus}
                    </span>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                      {isFr ? "Validé" : "Apwove"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          {filteredPending.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs border border-dashed border-gray-200 rounded-3xl bg-white">
              {isFr ? "Aucune demande d'inscription en attente" : "Pa gen okenn demann enskripsyon k ap tann"}
            </div>
          ) : (
            filteredPending.map((pending, idx) => {
              const cleanPendingName = pending.full_name?.split(' |availability:')[0].split(' |start_year:')[0] || '';
              
              // Try parsing availability
              let availData: any = null;
              if (pending.full_name?.includes(' |availability:')) {
                try {
                  const rawString = pending.full_name.split(' |availability:')[1];
                  availData = JSON.parse(rawString);
                } catch (e) {
                  console.error("Failed to parse availability", e);
                }
              }

              return (
                <motion.div
                  key={pending.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-6 rounded-[2.2rem] border border-red-150 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-secondary transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-2 bg-secondary" />
                  <div className="space-y-3 flex-1 pl-2">
                    <div className="flex items-center space-x-3">
                      <span className="bg-red-50 text-red-600 text-[9px] font-black px-2.5 py-0.5 rounded uppercase tracking-widest">
                        {pending.role}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {isFr ? "Enregistré le :" : "Créé le :"} {new Date(pending.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-primary uppercase tracking-tight">{cleanPendingName}</h3>
                      <p className="text-xs font-medium text-gray-500">Email : <strong className="font-bold text-primary">{pending.email}</strong></p>
                      <p className="text-xs font-medium text-gray-500">Campus : <strong className="font-bold text-secondary capitalize">{pending.campus}</strong></p>
                      {pending.classroom && <p className="text-xs font-medium text-gray-500">Classe assignée : <strong className="font-bold text-indigo-600 font-mono uppercase">{pending.classroom}</strong></p>}
                    </div>

                    {/* Check if we have dynamic availability sheet */}
                    {pending.role === 'professeur' && availData && (
                      <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-1.5 max-w-xl">
                        <p className="text-[10px] font-black uppercase text-secondary flex items-center gap-1">
                          <Clock size={12} />
                          <span>{isFr ? "Disponibilités déclarées par jour :" : "Disponibilite pwofesè a deklare (Pa Jou) :"}</span>
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                          {Object.entries(availData).map(([day, val]: [string, any]) => {
                            if (!val.available) return null;
                            return (
                              <div key={day} className="bg-white px-2 py-1.5 rounded-lg border border-gray-150 flex flex-col items-center">
                                <span className="text-[9px] font-extrabold text-primary/75 capitalize">{day}</span>
                                <span className="text-[10px] font-bold text-secondary font-mono mt-0.5">{val.startTime} - {val.endTime}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleApproveUser(pending.id, pending.full_name)}
                      className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center space-x-2"
                    >
                      <Check size={16} className="stroke-2" />
                      <span>{isFr ? "Approuver le compte" : "Valide sa"}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
