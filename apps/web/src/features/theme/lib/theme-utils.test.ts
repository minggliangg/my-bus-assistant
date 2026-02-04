import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSystemTheme, getEffectiveTheme, applyTheme } from './theme-utils';
import type { Theme } from './theme-storage';

describe('theme-utils', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove('dark');
  });

  describe('getSystemTheme', () => {
    it('should return dark when system prefers dark mode', () => {
      vi.mocked(window.matchMedia).mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList));
      expect(getSystemTheme()).toBe('dark');
    });

    it('should return light when system prefers light mode', () => {
      vi.mocked(window.matchMedia).mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList));
      expect(getSystemTheme()).toBe('light');
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return dark when preference is dark', () => {
      const theme: Theme = 'dark';
      expect(getEffectiveTheme(theme)).toBe('dark');
    });

    it('should return light when preference is light', () => {
      const theme: Theme = 'light';
      expect(getEffectiveTheme(theme)).toBe('light');
    });

    it('should return dark when preference is system and system prefers dark', () => {
      const theme: Theme = 'system';
      expect(getEffectiveTheme(theme)).toBe('dark');
    });

    it('should return light when preference is system and system prefers light', () => {
      vi.mocked(window.matchMedia).mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList));
      const theme: Theme = 'system';
      expect(getEffectiveTheme(theme)).toBe('light');
    });
  });

  describe('applyTheme', () => {
    it('should add dark class when theme is dark', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when theme is light', () => {
      document.documentElement.classList.add('dark');
      applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should remove dark class when theme is light even if already removed', () => {
      applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
