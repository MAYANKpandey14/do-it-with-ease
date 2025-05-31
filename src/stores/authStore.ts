
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

// Security: Input sanitization helper
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"'&]/g, '').trim();
};

// Security: Email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      // Security: Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
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
      // Security: Log errors without exposing sensitive details
      console.error('Sign in error:', error);
      throw error;
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ loading: true });
    try {
      // Security: Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      const sanitizedFullName = fullName ? sanitizeInput(fullName) : undefined;
      
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (sanitizedFullName && sanitizedFullName.length > 100) {
        throw new Error('Name is too long');
      }

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          data: {
            full_name: sanitizedFullName || sanitizedEmail.split('@')[0]
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
      console.error('Sign up error:', error);
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
        console.error('Sign out error:', error);
        throw error;
      }
    }
  },

  resetPassword: async (email: string) => {
    // Security: Input validation
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    
    if (!isValidEmail(sanitizedEmail)) {
      throw new Error('Invalid email format');
    }

    // Security: Use a whitelist of allowed redirect URLs
    const allowedOrigins = [
      window.location.origin,
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    const currentOrigin = window.location.origin;
    const redirectUrl = allowedOrigins.includes(currentOrigin) 
      ? `${currentOrigin}/reset-password`
      : `${allowedOrigins[0]}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: redirectUrl
    });
    
    if (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    // Security: Sanitize profile updates
    const sanitizedUpdates: Partial<Profile> = {};
    
    if (updates.full_name !== undefined) {
      sanitizedUpdates.full_name = updates.full_name ? sanitizeInput(updates.full_name).substring(0, 100) : null;
    }
    
    if (updates.avatar_url !== undefined) {
      sanitizedUpdates.avatar_url = updates.avatar_url;
    }
    
    if (updates.theme !== undefined) {
      // Security: Validate theme values
      const allowedThemes = ['light', 'dark', 'system'];
      if (allowedThemes.includes(updates.theme)) {
        sanitizedUpdates.theme = updates.theme;
      }
    }

    // Copy over numeric values with validation
    if (updates.pomodoro_duration !== undefined && updates.pomodoro_duration > 0 && updates.pomodoro_duration <= 120) {
      sanitizedUpdates.pomodoro_duration = updates.pomodoro_duration;
    }
    
    if (updates.short_break_duration !== undefined && updates.short_break_duration > 0 && updates.short_break_duration <= 60) {
      sanitizedUpdates.short_break_duration = updates.short_break_duration;
    }
    
    if (updates.long_break_duration !== undefined && updates.long_break_duration > 0 && updates.long_break_duration <= 120) {
      sanitizedUpdates.long_break_duration = updates.long_break_duration;
    }
    
    if (updates.long_break_interval !== undefined && updates.long_break_interval > 0 && updates.long_break_interval <= 10) {
      sanitizedUpdates.long_break_interval = updates.long_break_interval;
    }

    if (updates.notifications_enabled !== undefined) {
      sanitizedUpdates.notifications_enabled = updates.notifications_enabled;
    }
    
    if (updates.sound_enabled !== undefined) {
      sanitizedUpdates.sound_enabled = updates.sound_enabled;
    }

    const { error } = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', user.id);

    if (error) {
      console.error('Profile update error:', error);
      throw error;
    }

    set(state => ({
      profile: state.profile ? { ...state.profile, ...sanitizedUpdates } : null
    }));
  },

  loadProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
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
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
    }
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
