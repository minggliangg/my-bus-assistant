import type { Theme } from './theme-storage';

export const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const getEffectiveTheme = (preference: Theme): 'light' | 'dark' => {
  return preference === 'system' ? getSystemTheme() : preference;
};

export const applyTheme = (theme: 'light' | 'dark'): void => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
