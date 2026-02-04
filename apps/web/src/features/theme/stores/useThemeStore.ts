import { create } from 'zustand';
import type { Theme } from '../lib/theme-storage';
import { loadTheme, saveTheme } from '../lib/theme-storage';
import { getEffectiveTheme, applyTheme } from '../lib/theme-utils';

interface ThemeStore {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  initializeTheme: () => () => void;
}

const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'system',
  effectiveTheme: 'light',

  setTheme: (theme: Theme) => {
    saveTheme(theme);
    const effectiveTheme = getEffectiveTheme(theme);
    applyTheme(effectiveTheme);
    set({ theme, effectiveTheme });
  },

  initializeTheme: () => {
    const savedTheme = loadTheme();
    const effectiveTheme = getEffectiveTheme(savedTheme);
    applyTheme(effectiveTheme);
    set({ theme: savedTheme, effectiveTheme });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const currentTheme = get().theme;
      if (currentTheme === 'system') {
        const newEffectiveTheme = event.matches ? 'dark' : 'light';
        applyTheme(newEffectiveTheme);
        set({ effectiveTheme: newEffectiveTheme });
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  },
}));

export default useThemeStore;
