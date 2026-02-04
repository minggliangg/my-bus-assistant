import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './theme-toggle';
import useThemeStore from '../stores/useThemeStore';

const originalLocalStorage = global.localStorage;
const originalMatchMedia = window.matchMedia;

describe('ThemeToggle', () => {
  beforeEach(() => {
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };

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
    global.localStorage = originalLocalStorage;
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove('dark');
    vi.clearAllMocks();
  });

  it('should render the theme toggle button', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('system');
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('should have correct aria-label', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('system');
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toHaveAttribute('aria-label', 'Toggle theme');
  });

  it('should show sun icon when effective theme is light', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('light');
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should open dropdown menu when button is clicked', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('system');
    const user = userEvent.setup();
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('should set theme to light when Light option is clicked', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');
    const user = userEvent.setup();
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    const lightOption = screen.getByText('Light');
    await user.click(lightOption);
    
    const store = useThemeStore.getState();
    expect(store.theme).toBe('light');
  });

  it('should set theme to dark when Dark option is clicked', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('light');
    const user = userEvent.setup();
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    const darkOption = screen.getByText('Dark');
    await user.click(darkOption);
    
    const store = useThemeStore.getState();
    expect(store.theme).toBe('dark');
  });

  it('should set theme to system when System option is clicked', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');
    const user = userEvent.setup();
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    const systemOption = screen.getByText('System');
    await user.click(systemOption);
    
    const store = useThemeStore.getState();
    expect(store.theme).toBe('system');
  });

  it('should have keyboard accessible menu items', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('system');
    const user = userEvent.setup();
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');
    
    expect(screen.getByText('Light')).toBeInTheDocument();
    
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    const store = useThemeStore.getState();
    expect(store.theme).toBe('system');
  });

  it('should close menu after selecting a theme', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');
    const user = userEvent.setup();
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    const lightOption = screen.getByText('Light');
    await user.click(lightOption);
    
    expect(screen.queryByText('Light')).not.toBeInTheDocument();
  });

  it('should have correct outline variant styling', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('system');
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('outline-none');
  });

  it('should have correct size (icon)', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('system');
    
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-9', 'w-9');
  });
});
