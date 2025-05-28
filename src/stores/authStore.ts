
import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

// Mock authentication for demo purposes
const mockUsers = [
  { id: '1', email: 'demo@example.com', name: 'Demo User' }
];

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.email === email);
    if (user && password === 'password') {
      set({ user, isAuthenticated: true, loading: false });
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      set({ loading: false });
      throw new Error('Invalid credentials');
    }
  },

  signUp: async (email: string, password: string, name?: string) => {
    set({ loading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser = {
      id: Date.now().toString(),
      email,
      name: name || email.split('@')[0]
    };
    
    mockUsers.push(newUser);
    set({ user: newUser, isAuthenticated: true, loading: false });
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  },

  signOut: async () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('auth_user');
  },

  updateUser: (updates: Partial<User>) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser });
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
  }
}));

// Initialize auth state from localStorage
const storedUser = localStorage.getItem('auth_user');
if (storedUser) {
  const user = JSON.parse(storedUser);
  useAuthStore.setState({ user, isAuthenticated: true });
}
