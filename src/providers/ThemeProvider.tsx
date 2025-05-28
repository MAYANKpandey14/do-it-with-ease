
import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { profile, updateProfile } = useAuthStore();
  const theme = (profile?.theme as Theme) || 'light';

  const setTheme = async (newTheme: Theme) => {
    try {
      await updateProfile({ theme: newTheme });
      applyTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const applyTheme = (theme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
