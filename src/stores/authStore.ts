
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { checkRateLimit } from '@/utils/security';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  theme: string | null;
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
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; error: any }>;
  signInWithGoogle: () => Promise<{ user: User | null; error: any }>;
  signUpWithGoogle: () => Promise<{ user: User | null; error: any }>;
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
      // Rate limiting check
      const clientIdentifier = `signin_${email}`;
      if (!checkRateLimit(clientIdentifier, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
        throw new Error('Too many sign-in attempts. Please try again later.');
      }
      
      // Security: Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        // Log security event for failed authentication
        console.warn('Authentication failed:', {
          email: sanitizedEmail,
          error: error.message,
          timestamp: new Date().toISOString(),
          ip: 'client-side'
        });
        throw error;
      }

      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        // Sign out the user if email is not confirmed
        await supabase.auth.signOut();
        throw new Error('Please confirm your email address before signing in. Check your inbox for a confirmation link.');
      }

      // Log successful authentication
      console.info('Authentication successful:', {
        email: sanitizedEmail,
        timestamp: new Date().toISOString()
      });

      set({ 
        user: data.user, 
        session: data.session,
        isAuthenticated: true,
        loading: false 
      });

      // Load profile after successful sign in
      await get().loadProfile();
      
      return { user: data.user, error: null };
    } catch (error) {
      set({ loading: false });
      // Security: Log errors without exposing sensitive details
      console.error('Sign in error:', error);
      return { user: null, error };
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ loading: true });
    try {
      // Rate limiting check
      const clientIdentifier = `signup_${email}`;
      if (!checkRateLimit(clientIdentifier, 3, 60 * 60 * 1000)) { // 3 attempts per hour
        throw new Error('Too many sign-up attempts. Please try again later.');
      }
      
      // Security: Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      const sanitizedFullName = fullName ? sanitizeInput(fullName) : undefined;
      
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Enhanced password validation
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      if (!/\d/.test(password)) {
        throw new Error('Password must contain at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        throw new Error('Password must contain at least one special character');
      }

      if (sanitizedFullName && sanitizedFullName.length > 100) {
        throw new Error('Name is too long');
      }

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            display_name: sanitizedFullName || sanitizedEmail.split('@')[0]
          }
        }
      });

      if (error) {
        // Log security event for failed registration
        console.warn('Registration failed:', {
          email: sanitizedEmail,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      // Log successful registration
      console.info('Registration successful:', {
        email: sanitizedEmail,
        timestamp: new Date().toISOString()
      });

      // Always set to non-authenticated state after signup
      // User will be authenticated only after email verification
      set({ 
        user: null, 
        session: null,
        isAuthenticated: false,
        loading: false 
      });
      
      return { user: data.user, error: null };
    } catch (error) {
      set({ loading: false });
      console.error('Sign up error:', error);
      return { user: null, error };
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

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      console.log('Starting Google OAuth sign in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        set({ loading: false });
        console.error('Google OAuth error:', error);
        throw error;
      }

      console.log('Google OAuth initiated successfully');
      // OAuth flow will handle the redirect, loading state will be managed by onAuthStateChange
      return { user: null, error: null };
    } catch (error) {
      set({ loading: false });
      console.error('Google sign in error:', error);
      return { user: null, error };
    }
  },

  signUpWithGoogle: async () => {
    set({ loading: true });
    try {
      console.log('Starting Google OAuth sign up...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        set({ loading: false });
        console.error('Google OAuth error:', error);
        throw error;
      }

      console.log('Google OAuth initiated successfully');
      // OAuth flow will handle the redirect, loading state will be managed by onAuthStateChange
      return { user: null, error: null };
    } catch (error) {
      set({ loading: false });
      console.error('Google sign up error:', error);
      return { user: null, error };
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
    
    if (updates.display_name !== undefined) {
      sanitizedUpdates.display_name = updates.display_name ? sanitizeInput(updates.display_name).substring(0, 100) : null;
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
  
  console.log('=== AUTH STATE CHANGE DEBUG ===');
  console.log('Event:', event);
  console.log('Session exists:', !!session);
  console.log('User exists:', !!session?.user);
  console.log('User email:', session?.user?.email);
  console.log('Email confirmed:', session?.user?.email_confirmed_at);
  console.log('App metadata:', session?.user?.app_metadata);
  console.log('User metadata:', session?.user?.user_metadata);
  console.log('Identities:', session?.user?.identities);
  console.log('Current URL:', window.location.href);
  console.log('Current hash:', window.location.hash);
  
  // Check multiple possible locations for provider information
  const isGoogleProvider = 
    session?.user?.app_metadata?.provider === 'google' ||
    session?.user?.app_metadata?.providers?.includes('google') ||
    session?.user?.user_metadata?.provider === 'google' ||
    (session?.user?.identities && session.user.identities.some(identity => identity.provider === 'google'));
  
  const isEmailConfirmed = session?.user?.email_confirmed_at !== null;
  const shouldAuthenticate = !!session?.user && (isGoogleProvider || isEmailConfirmed);
  
  console.log('Is Google provider:', isGoogleProvider);
  console.log('Is email confirmed:', isEmailConfirmed);
  console.log('Should authenticate:', shouldAuthenticate);
  console.log('=== END DEBUG ===');
  
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    isAuthenticated: shouldAuthenticate,
    loading: false
  });

  if (session?.user && shouldAuthenticate && event !== 'SIGNED_OUT') {
    console.log('Loading profile for authenticated user');
    setTimeout(() => {
      loadProfile();
    }, 0);
  } else {
    console.log('Clearing profile - user not authenticated');
    useAuthStore.setState({ profile: null });
  }
});

// Check for existing session on app start
supabase.auth.getSession().then(({ data: { session } }) => {
  const { loadProfile } = useAuthStore.getState();
  
  console.log('=== INITIAL SESSION CHECK ===');
  console.log('Session exists:', !!session);
  console.log('Session:', session);
  console.log('Current URL:', window.location.href);
  console.log('Hash params:', window.location.hash);
  
  if (session?.user) {
    console.log('User app metadata:', session.user.app_metadata);
    console.log('User identities:', session.user.identities);
    console.log('User email:', session.user.email);
    console.log('Email confirmed at:', session.user.email_confirmed_at);
  }
  
  // Check multiple possible locations for provider information
  const isGoogleProvider = 
    session?.user?.app_metadata?.provider === 'google' ||
    session?.user?.app_metadata?.providers?.includes('google') ||
    session?.user?.user_metadata?.provider === 'google' ||
    (session?.user?.identities && session.user.identities.some(identity => identity.provider === 'google'));
  
  const isEmailConfirmed = session?.user?.email_confirmed_at !== null;
  const shouldAuthenticate = !!session?.user && (isGoogleProvider || isEmailConfirmed);
  
  console.log('Initial - Is Google provider:', isGoogleProvider);
  console.log('Initial - Is email confirmed:', isEmailConfirmed);
  console.log('Initial - Should authenticate:', shouldAuthenticate);
  console.log('=== END INITIAL CHECK ===');
  
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    isAuthenticated: shouldAuthenticate,
    loading: false
  });

  if (session?.user && shouldAuthenticate) {
    console.log('Loading profile for initial authenticated user');
    loadProfile();
  } else {
    console.log('No initial session or not authenticated');
  }
});
