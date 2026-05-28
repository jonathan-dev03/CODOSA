import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isGuest: boolean;
  activeCampus: string;
  setActiveCampus: (campus: 'fondamentale' | 'secondaire') => void;
  setGuestMode: (role?: string, campus?: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (!error && data) {
      let rawName = data.full_name || '';
      let startYear = '2025-2026';
      let activeYearStr = '';
      
      if (rawName.includes(' |start_year:')) {
        const parts = rawName.split(' |start_year:');
        rawName = parts[0];
        const subparts = parts[1]?.split('|active_year:');
        startYear = subparts[0] || '2025-2026';
        activeYearStr = subparts[1] || '';
      } else if (rawName.includes('|active_year:')) {
        const parts = rawName.split('|active_year:');
        rawName = parts[0];
        activeYearStr = parts[1] || '';
      }

      setProfile({
        ...data,
        raw_full_name: data.full_name, // original backed up
        full_name: rawName,
        start_year: startYear,
        active_year: activeYearStr || startYear,
        is_approved: data.status === 'active' || data.is_approved === true
      });
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const setGuestMode = (role: string = 'eleve', campus: string = 'fondamantal') => {
    setIsGuest(true);
    // Mock profile for guest
    setProfile({
      full_name: 'Invite - ' + (role.charAt(0).toUpperCase() + role.slice(1)),
      role: role,
      campus: campus,
      is_approved: true
    });
  };

  const [directeurCampus, setDirecteurCampus] = useState<'fondamentale' | 'secondaire'>('fondamentale');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false); // Reset guest mode on real login
        await fetchProfile(session.user.id);
      } else if (!isGuest) {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsGuest(false);
  };

  const activeCampus = profile?.role === 'directeur' ? directeurCampus : (profile?.campus || 'fondamentale');
  const setActiveCampus = (campus: 'fondamentale' | 'secondaire') => {
    if (profile?.role === 'directeur') {
      setDirecteurCampus(campus);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isGuest, activeCampus, setActiveCampus, setGuestMode, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
