import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  MessageSquare, 
  Users as UsersIcon, 
  Settings, 
  AlertCircle, 
  Search, 
  Bell, 
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

export default function Chat() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const isFr = i18n.language === 'fr';

  // State
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  
  // Modals / Dropdowns
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [mobileView, setMobileView] = useState<'channels' | 'messages'>('channels');
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Allowed staff roles checker
  const isStaff = ['professeur', 'censeur', 'resp_pedagogique', 'resp_discipline', 'secretaire', 'directeur', 'super_admin'].includes(profile?.role || '');

  // Campus mapping
  const normalizedCampus = (profile?.campus === 'fondamantal' || profile?.campus === 'fondamentale') ? 'fondamental' : 'secondaire';

  useEffect(() => {
    if (!profile) return;
    if (!isStaff) return;

    const initChatSystem = async () => {
      try {
        setLoading(true);
        
        // 1. Core group channels auto-creation if they don't exist
        const defaultGroups = [
          { name: "Général Fondamental", type: "group", campus: "fondamental" },
          { name: "Professeurs Fondamental", type: "group", campus: "fondamental" },
          { name: "Direction Fondamentale", type: "group", campus: "fondamental" },
          { name: "Général Secondaire", type: "group", campus: "secondaire" },
          { name: "Professeurs Secondaire", type: "group", campus: "secondaire" },
          { name: "Direction Secondaire", type: "group", campus: "secondaire" }
        ];

        // Fetch current group channels
        const { data: existingGroups } = await supabase
          .from('chat_channels')
          .select('*')
          .eq('type', 'group');

        const existingNames = existingGroups?.map(g => g.name) || [];

        // Insert missing default groups
        for (const defaultGroup of defaultGroups) {
          if (!existingNames.includes(defaultGroup.name)) {
            await supabase
              .from('chat_channels')
              .insert(defaultGroup);
          }
        }

        // 2. Fetch list of users for Direct Messenger
        const { data: fetchedUsers } = await supabase
          .from('users')
          .select('id, full_name, role, campus')
          .neq('role', 'eleve'); // Staff-only

        if (fetchedUsers) {
          setDbUsers(fetchedUsers);
        }

        // 3. Sync & Fetch channels
        await refreshChannels();

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initChatSystem();
  }, [profile]);

  // Subscribe to real-time events across whole chat engine: messages, channels, memberships
  useEffect(() => {
    if (!profile || !isStaff) return;

    const messagesSubscription = supabase
      .channel('chat_realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        // Dynamic messaging feeds
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new;
          
          // Audio / In-App Notification (Dynamic bell feedback)
          if (newMessage.sender_id !== profile.id) {
            // Unread validation checks
            setUnreadMessages(prev => [...prev, newMessage]);
            
            // Trigger in-app notification sound / system feedback
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2857/2857-84.wav');
              audio.volume = 0.35;
              audio.play().catch(() => {});
            } catch (e) {}
          }

          // If current channel is active, immediately insert message
          if (newMessage.channel_id === activeChannelId) {
            setMessages(prev => {
              // Deduplicate insertion
              if (prev.some(m => m.id === newMessage.id)) return prev;
              
              // Load sender profile data of message
              const senderUser = dbUsers.find(u => u.id === newMessage.sender_id);
              return [...prev, { ...newMessage, sender: senderUser }];
            });

            // Mark message read
            markAsRead(newMessage.id, newMessage.read_by || []);
          }
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_channels' }, () => {
        refreshChannels();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, () => {
        refreshChannels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [profile, activeChannelId, dbUsers]);

  // Fetch or refresh list of channels user is allowed to access
  const refreshChannels = async () => {
    if (!profile) return;

    // Fetch allowed selected channels
    const { data: allowedChannels } = await supabase
      .from('chat_channels')
      .select('*');

    if (allowedChannels) {
      // For Direct messages, let's load peer name representing channel
      const decoratedChannels = [];

      for (const channel of allowedChannels) {
        if (channel.type === 'direct') {
          // Dynamic matching of peer name
          const { data: members } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('channel_id', channel.id);
          
          const peerMember = members?.find(m => m.user_id !== profile.id);
          if (peerMember) {
            const peerUser = dbUsers.find(u => u.id === peerMember.user_id) || { full_name: 'Collègue', role: 'Staff' };
            decoratedChannels.push({
              ...channel,
              peer: peerUser,
              name: peerUser.full_name
            });
          } else {
            // Self-direct chat fallback
            decoratedChannels.push({
              ...channel,
              name: "Mon bloc-notes"
            });
          }
        } else {
          // Group channels
          decoratedChannels.push(channel);
        }
      }

      setChannels(decoratedChannels);

      // Auto enroll on group channels of matching campus if missing memberships
      for (const channel of decoratedChannels) {
        if (channel.type === 'group') {
          const isFondType = (profile.campus === 'fondamantal' || profile.campus === 'fondamentale');
          const isChannelFond = (channel.campus === 'fondamental');
          
          // Scope access matches:
          const isSameCampus = profile.role === 'directeur' || profile.role === 'super_admin' || (isFondType === isChannelFond);
          
          // Verify professors access to directorate channel
          const isProfAccessDenied = profile.role === 'professeur' && channel.name.includes('Direction');

          if (isSameCampus && !isProfAccessDenied) {
            // Ensure enrollment in chat_members
            const { data: membership } = await supabase
              .from('chat_members')
              .select('id')
              .eq('channel_id', channel.id)
              .eq('user_id', profile.id)
              .maybeSingle();

            if (!membership) {
              await supabase
                .from('chat_members')
                .insert({
                  channel_id: channel.id,
                  user_id: profile.id
                });
            }
          }
        }
      }

      // Sync unread messages count of channels we belong to
      const channelIds = allowedChannels.map(c => c.id);
      if (channelIds.length > 0) {
        const { data: unreads } = await supabase
          .from('chat_messages')
          .select('*')
          .in('channel_id', channelIds);
        
        if (unreads) {
          const unreadMapped = unreads.filter(msg => {
            const readArray = msg.read_by || [];
            return msg.sender_id !== profile.id && !readArray.includes(profile.id);
          });
          setUnreadMessages(unreadMapped);
        }
      }
    }
  };

  // Switch Active Channel Feed
  useEffect(() => {
    if (!activeChannelId || !profile) return;

    const fetchMessages = async () => {
      try {
        const { data: msgs, error: err } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', activeChannelId)
          .order('created_at', { ascending: true }); // Query standard order

        if (err) throw err;

        if (msgs) {
          const loadedMsgs = msgs.map(m => {
            const senderUser = dbUsers.find(u => u.id === m.sender_id);
            return {
              ...m,
              sender: senderUser || { full_name: 'Ancien membre', role: 'Staff' }
            };
          });
          setMessages(loadedMsgs);

          // Mark loaded messages read
          for (const msg of msgs) {
            const readArr = msg.read_by || [];
            if (msg.sender_id !== profile.id && !readArr.includes(profile.id)) {
              markAsRead(msg.id, readArr);
            }
          }
        }
      } catch (e: any) {
        console.error("Messages loader failure: ", e.message);
      }
    };

    fetchMessages();
  }, [activeChannelId, dbUsers]);

  // Handle auto scrolling to footer
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const markAsRead = async (messageId: string, currentReadBy: string[]) => {
    if (!profile) return;
    if (currentReadBy.includes(profile.id)) return;

    const updatedReadBy = [...currentReadBy, profile.id];
    await supabase
      .from('chat_messages')
      .update({ read_by: updatedReadBy })
      .eq('id', messageId);

    // Filter local unread list
    setUnreadMessages(prev => prev.filter(m => m.id !== messageId));
  };

  // Sending new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannelId || !profile) return;

    setSending(true);
    const contentToSend = inputText.trim();
    setInputText('');

    try {
      const { error: err } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: activeChannelId,
          sender_id: profile.id,
          content: contentToSend,
          read_by: [profile.id]
        });

      if (err) throw err;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  // Start direct conversation with Peer
  const handleStartDirectMessage = async (targetUser: any) => {
    if (!profile) return;
    setShowNewDmModal(false);

    try {
      // First, check if exact DM channel exists already in db
      // We do this by looking at direct channels of user
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('channel_id')
        .eq('user_id', profile.id);

      const myChanIds = myMemberships?.map(m => m.channel_id) || [];

      if (myChanIds.length > 0) {
        const { data: peerMemberships } = await supabase
          .from('chat_members')
          .select('channel_id')
          .in('channel_id', myChanIds)
          .eq('user_id', targetUser.id);

        if (peerMemberships && peerMemberships.length > 0) {
          // Double check if this channel is truly direct type
          const { data: directChan } = await supabase
            .from('chat_channels')
            .select('id')
            .eq('id', peerMemberships[0].channel_id)
            .eq('type', 'direct')
            .maybeSingle();

          if (directChan) {
            setActiveChannelId(directChan.id);
            setMobileView('messages');
            return;
          }
        }
      }

      // Create new direct channel
      const peerName = targetUser.full_name;
      const { data: newChan, error: chanErr } = await supabase
        .from('chat_channels')
        .insert({
          name: `Direct: ${peerName}`,
          type: 'direct',
          campus: null // null for direct messages
        })
        .select()
        .single();

      if (chanErr) throw chanErr;

      if (newChan) {
        // Enlist both members
        await supabase.from('chat_members').insert([
          { channel_id: newChan.id, user_id: profile.id },
          { channel_id: newChan.id, user_id: targetUser.id }
        ]);

        await refreshChannels();
        setActiveChannelId(newChan.id);
        setMobileView('messages');
      }

    } catch (e: any) {
      setError(e.message);
    }
  };

  // Filter possible dialog DM users
  const filteredUsers = dbUsers.filter(u => {
    // Cannot DM yourself
    if (u.id === profile?.id) return false;

    // Directeurs can message both campuses, others only their own campus
    const isDirecteur = ['directeur', 'super_admin'].includes(profile?.role || '');
    const isFondUser = (profile?.campus === 'fondamantal' || profile?.campus === 'fondamentale');
    const isTargetFond = (u.campus === 'fondamantal' || u.campus === 'fondamentale');

    if (!isDirecteur && isFondUser !== isTargetFond) {
      return false; // must be same campus
    }

    return u.full_name.toLowerCase().includes(searchUserQuery.toLowerCase());
  });

  const getChannelUnreadCount = (chanId: string) => {
    return unreadMessages.filter(m => m.channel_id === chanId).length;
  };

  const handleDeleteMessage = async (msgId: string) => {
    // Only Directeur/SuperAdmin can delete messages
    const isAdminUser = ['directeur', 'super_admin'].includes(profile?.role || '');
    if (!isAdminUser) return;

    if (!window.confirm(isFr ? "Voulez-vous supprimer ce message ?" : "Èske ou vle efase mesaj sa a ?")) {
      return;
    }

    const { error: deletionError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', msgId);

    if (!deletionError) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  // Guard view
  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center p-6 text-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-6">
        <AlertCircle size={48} className="text-red-500 mx-auto animate-bounce" />
        <h2 className="text-xl font-black text-primary uppercase">Accès Refusé</h2>
        <p className="text-xs text-gray-400 font-bold uppercase leading-relaxed">
          Le réseau de clavardage interne est réservé strictement aux membres du personnel et de la direction du CODOSA. Les élèves ne sont pas autorisés à y participer.
        </p>
      </div>
    );
  }

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Group channels lists
  const groupChannelsList = channels.filter(c => c.type === 'group');
  const directChannelsList = channels.filter(c => c.type === 'direct');

  // Verify can write in current selected channel selector:
  const canWriteInChannel = () => {
    if (!activeChannel) return false;
    if (activeChannel.type === 'direct') return true;

    // Group rules:
    const isProfessor = profile?.role === 'professeur';
    const isDirecteur = ['directeur', 'super_admin'].includes(profile?.role || '');

    if (activeChannel.name.includes("Professeurs")) {
      return isProfessor || isDirecteur;
    }

    if (activeChannel.name.includes("Direction")) {
      return ['censeur', 'resp_pedagogique', 'resp_discipline', 'directeur', 'super_admin'].includes(profile?.role || '');
    }

    return true; // General can write all staff
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] text-left bg-white overflow-hidden rounded-3xl relative">
      
      {/* Visual Alerts popup bar */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-black px-6 py-3.5 rounded-2xl shadow-xl z-50 flex items-center space-x-2">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-black/10 rounded">✕</button>
        </div>
      )}

      {/* LEFT CHANNELS & MEMBERS CORNER BAR */}
      <div className={clsx(
        "w-full md:w-80 border-r border-gray-100 flex flex-col h-full bg-slate-50 relative grow-0 shrink-0",
        mobileView === 'messages' && "hidden md:flex"
      )}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white text-primary">
          <div>
            <h2 className="font-black uppercase tracking-tight text-primary text-base flex items-center space-x-1.5">
              <MessageSquare size={18} className="text-secondary" />
              <span>Staff Chat</span>
            </h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Messages professionnels</p>
          </div>

          <button 
            onClick={() => setShowNewDmModal(true)}
            className="p-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-xl transition-all shadow-md active:scale-95"
            title="Démarrer une discussion privée"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Channels scroll panel container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* channels space block groups */}
          <div className="space-y-2">
            <h3 className="text-[9px] font-black tracking-widest text-gray-400 uppercase px-2.5">
              Canaux de Groupe
            </h3>
            
            <div className="space-y-1">
              {groupChannelsList.map((chan) => {
                const isActive = chan.id === activeChannelId;
                const unread = getChannelUnreadCount(chan.id);
                
                return (
                  <button
                    key={chan.id}
                    onClick={() => {
                      setActiveChannelId(chan.id);
                      setMobileView('messages');
                    }}
                    className={clsx(
                      "w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer group",
                      isActive 
                        ? "bg-primary text-white shadow-lg scale-[1.02]" 
                        : "hover:bg-white text-gray-700 bg-transparent border border-transparent hover:border-gray-100"
                    )}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={clsx(
                        "w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 transition-all",
                        isActive ? "bg-white text-primary" : "bg-primary/5 text-primary"
                      )}>
                        #
                      </div>
                      <div className="overflow-hidden">
                        <p className={clsx(
                          "text-xs font-black truncate uppercase tracking-tight",
                          isActive ? "text-white" : "text-primary"
                        )}>
                          {chan.name}
                        </p>
                        <p className={clsx(
                          "text-[8px] font-bold uppercase tracking-wider",
                          isActive ? "text-white/60" : "text-gray-400"
                        )}>
                          Campus : {chan.campus || 'all'}
                        </p>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full ring-2 ring-white">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DMs space block groups */}
          <div className="space-y-2">
            <h3 className="text-[9px] font-black tracking-widest text-gray-400 uppercase px-2.5 flex items-center justify-between">
              <span>Discussions Privées</span>
              <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-2 font-bold">{directChannelsList.length}</span>
            </h3>

            {directChannelsList.length === 0 ? (
              <p className="text-[9px] text-gray-400 font-bold uppercase italic px-3 py-2 leading-snug">
                Aucun message direct démarré. Cliquez sur '+' pour débuter !
              </p>
            ) : (
              <div className="space-y-1">
                {directChannelsList.map((chan) => {
                  const isActive = chan.id === activeChannelId;
                  const unread = getChannelUnreadCount(chan.id);
                  const peerInitials = chan.peer?.full_name?.substring(0, 2) || 'DM';

                  return (
                    <button
                      key={chan.id}
                      onClick={() => {
                        setActiveChannelId(chan.id);
                        setMobileView('messages');
                      }}
                      className={clsx(
                        "w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer group",
                        isActive 
                          ? "bg-primary text-white shadow-lg scale-[1.02]" 
                          : "hover:bg-white text-gray-700 bg-transparent border border-transparent hover:border-gray-100"
                      )}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className={clsx(
                          "w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] uppercase shrink-0 transition-all border",
                          isActive ? "bg-white text-primary border-transparent" : "bg-secondary text-white border-white/20 shadow-sm"
                        )}>
                          {peerInitials}
                        </div>
                        <div className="overflow-hidden">
                          <p className={clsx(
                            "text-xs font-black truncate tracking-tight",
                            isActive ? "text-white" : "text-primary uppercase"
                          )}>
                            {chan.peer?.full_name}
                          </p>
                          <p className={clsx(
                            "text-[8px] font-bold uppercase tracking-wider",
                            isActive ? "text-white/60" : "text-gray-400"
                          )}>
                            Région : {chan.peer?.role || 'Staff'}
                          </p>
                        </div>
                      </div>

                      {unread > 0 && (
                        <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full ring-2 ring-white">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Current user Profile indicator info panel footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs uppercase border border-secondary shrink-0">
              {profile.full_name?.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black trunc text-primary uppercase leading-none truncate">{profile.full_name}</p>
              <p className="text-[8.5px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider">Role : {profile.role}</p>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT MESSAGES FEED WORKSPACE */}
      <div className={clsx(
        "flex-1 flex flex-col h-full bg-white relative",
        mobileView === 'channels' && "hidden md:flex"
      )}>
        
        {activeChannel ? (
          <>
            {/* Header Feed metadata */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3 overflow-hidden">
                <button 
                  onClick={() => setMobileView('channels')}
                  className="p-1.5 hover:bg-gray-100 rounded-xl text-primary md:hidden shrink-0"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="overflow-hidden">
                  <h3 className="text-sm font-black text-[#010657] uppercase tracking-tight truncate">
                    {activeChannel.name}
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">
                    {activeChannel.type === 'group' 
                      ? `Canal collectif pour les équipes du campus ${activeChannel.campus}`
                      : `Discussion privée cryptée CODOSA`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="bg-[#fac900]/10 text-primary border border-[#fac900]/20 px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-wider">
                  CODOSA TEAM Secure
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none pointer-events-none p-12">
                  <MessageSquare size={48} className="text-primary mb-3" />
                  <p className="text-xs font-black text-primary uppercase">Début de l'historique sécurisé</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Écrivez un message ci-dessous pour démarrer</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === profile.id;
                  const initials = msg.sender?.full_name?.substring(0, 2) || 'ST';
                  const isDeletable = ['directeur', 'super_admin'].includes(profile?.role || '');

                  return (
                    <div 
                      key={msg.id}
                      className={clsx(
                        "flex items-start gap-3.5 max-w-[85%] md:max-w-[70%]",
                        isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      {/* Avatar */}
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 select-none shadow-sm text-white",
                        isMe ? "bg-primary border border-secondary" : "bg-secondary"
                      )}>
                        {initials}
                      </div>

                      {/* Message Content Container */}
                      <div className="space-y-1 group relative">
                        <div className={clsx(
                          "flex items-center gap-2",
                          isMe ? "justify-end flex-row-reverse" : ""
                        )}>
                          <span className="text-[9px] font-black text-primary uppercase tracking-tight">
                            {isMe ? "Vous" : msg.sender?.full_name}
                          </span>
                          <span className="text-[8px] text-gray-400 font-bold">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={clsx(
                          "p-4.5 rounded-2xl text-xs font-medium leading-relaxed shadow-xs relative break-words",
                          isMe 
                            ? "bg-primary text-white rounded-tr-none" 
                            : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                        )}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Float Actions like delete strictly for admin */}
                          {isDeletable && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete message"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              <div ref={messageEndRef} />
            </div>

            {/* Content Sender Input Panel */}
            <div className="p-4 border-t border-gray-100 bg-white shadow-xl">
              {canWriteInChannel() ? (
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Tapez votre message sécurisé..."
                    className="flex-1 p-3.5 bg-gray-50 focus:bg-white border border-transparent focus:border-primary outline-none text-xs font-bold rounded-2xl text-primary transition-all pr-12 text-left"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputText.trim()}
                    className="bg-secondary hover:bg-secondary/90 text-white p-3.5 rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 inline-flex items-center justify-center shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-red-50 text-red-600 text-[10px] font-black uppercase text-center rounded-xl border border-red-100 tracking-wider">
                  ⚠️ Vous êtes en lecture seule sur ce canal réservé.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-45 select-none p-12">
            <MessageSquare size={64} className="text-gray-300 mb-4 animate-bounce" />
            <h3 className="text-base font-black text-primary uppercase">Aucune discussion active</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Sélectionnez un canal de groupe ou lancez une discussion privée sur la gauche !</p>
          </div>
        )}

      </div>

      {/* NEW DIRECT MESSAGE SEARCH & CREATOR MODAL OVERLAY */}
      <AnimatePresence>
        {showNewDmModal && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-6 space-y-6 shadow-2xl relative border border-gray-100 text-left"
            >
              <button 
                onClick={() => setShowNewDmModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-primary transition-all"
              >
                <X size={18} />
              </button>

              <div>
                <h3 className="text-base font-black text-primary uppercase">Démarrer une discussion privée</h3>
                <p className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Discutez en tête-à-tête avec vos collègues du personnel</p>
              </div>

              {/* Search input field */}
              <div className="flex items-center space-x-2.5 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                <Search size={14} className="text-gray-400 ml-1" />
                <input
                  type="text"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  placeholder="Rechercher par nom..."
                  className="bg-transparent border-none outline-none text-xs font-bold text-primary flex-1 text-left"
                />
              </div>

              {/* Result list */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center font-bold py-6 uppercase">Aucun collègue trouvé</p>
                ) : (
                  filteredUsers.map((user) => {
                    const initials = user.full_name?.substring(0, 2) || 'ST';
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleStartDirectMessage(user)}
                        className="w-full text-left p-3 rounded-2xl hover:bg-gray-50 bg-white transition-all border border-transparent hover:border-gray-100 flex items-center space-x-3 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-black text-xs uppercase shadow-sm">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-primary uppercase leading-tight">{user.full_name}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Rôle: {user.role} — {user.campus}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
