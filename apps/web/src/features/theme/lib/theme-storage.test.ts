import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveTheme, loadTheme } from './theme-storage';

describe('theme-storage', () => {
  const THEME_STORAGE_KEY = 'theme-preference';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveTheme', () => {
    it('should save light theme', () => {
      saveTheme('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    it('should save dark theme', () => {
      saveTheme('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('should save system theme', () => {
      saveTheme('system');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    });
  });

  describe('loadTheme', () => {
    it('should load light theme', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      expect(loadTheme()).toBe('light');
    });

    it('should load dark theme', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(loadTheme()).toBe('dark');
    });

    it('should load system theme', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'system');
      expect(loadTheme()).toBe('system');
    });

    it('should return system as default when no saved theme', () => {
      expect(loadTheme()).toBe('system');
    });

    it('should return system as default for invalid value', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
      expect(loadTheme()).toBe('system');
    });

    it('should return system as default for null value', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'null');
      expect(loadTheme()).toBe('system');
    });

    it('should return system as default when localStorage.getItem throws', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      expect(loadTheme()).toBe('system');
    });
  });

  describe('saveTheme error handling', () => {
    it('should not throw when localStorage.setItem throws', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      expect(() => saveTheme('dark')).not.toThrow();
    });

    it('should gracefully handle localStorage quota exceeded', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      expect(() => saveTheme('light')).not.toThrow();
    });
  });
});
