
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  theme: string;
  pomodoro_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  long_break_interval: number;
  notifications_enabled: boolean;
  sound_enabled: boolean;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  loadProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({ 
        user: data.user, 
        session: data.session,
        isAuthenticated: true,
        loading: false 
      });

      // Load profile after successful sign in
      await get().loadProfile();
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0]
          }
        }
      });

      if (error) throw error;

      set({ 
        user: data.user, 
        session: data.session,
        isAuthenticated: !!data.user,
        loading: false 
      });

      if (data.user) {
        await get().loadProfile();
      }
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      // Clear local state first to prevent API calls with invalid tokens
      set({ 
        user: null, 
        profile: null,
        session: null,
        isAuthenticated: false 
      });

      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // Don't throw error if session doesn't exist - user is already logged out
      if (error && !error.message.includes('session_not_found') && !error.message.includes('Session not found')) {
        throw error;
      }
    } catch (error) {
      // If there's an error, ensure we still clear the local state
      set({ 
        user: null, 
        profile: null,
        session: null,
        isAuthenticated: false 
      });
      
      // Only throw if it's not a session-related error
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('session_not_found') && 
          !errorMessage.includes('Session not found') &&
          !errorMessage.includes('No API key found')) {
        throw error;
      }
    }
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    set(state => ({
      profile: state.profile ? { ...state.profile, ...updates } : null
    }));
  },

  loadProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    set({ profile: data });
  }
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  const { loadProfile } = useAuthStore.getState();
  
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    isAuthenticated: !!session?.user
  });

  if (session?.user && event !== 'SIGNED_OUT') {
    setTimeout(() => {
      loadProfile();
    }, 0);
  } else {
    useAuthStore.setState({ profile: null });
  }
});

// Check for existing session on app start
supabase.auth.getSession().then(({ data: { session } }) => {
  const { loadProfile } = useAuthStore.getState();
  
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    isAuthenticated: !!session?.user
  });

  if (session?.user) {
    loadProfile();
  }
});
