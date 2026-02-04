import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useThemeStore from "./useThemeStore";

const originalLocalStorage = global.localStorage;
const originalMatchMedia = window.matchMedia;

describe("useThemeStore", () => {
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
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove("dark");
    vi.clearAllMocks();
  });

  it("should have default theme as system and effectiveTheme as dark (system default)", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("system");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("dark");
  });

  it("should initialize with saved light theme", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("light");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.effectiveTheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should initialize with saved dark theme", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("dark");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should set theme to light", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("dark");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.effectiveTheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "theme-preference",
      "light",
    );
  });

  it("should set theme to dark", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("light");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "theme-preference",
      "dark",
    );
  });

  it("should set theme to system", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("light");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    act(() => {
      result.current.setTheme("system");
    });

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("dark");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "theme-preference",
      "system",
    );
  });

  it("should apply dark class to document when effectiveTheme is dark", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("dark");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should remove dark class from document when effectiveTheme is light", () => {
    document.documentElement.classList.add("dark");
    vi.mocked(localStorage.getItem).mockReturnValue("light");

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should return cleanup function from initializeTheme", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("system");

    const { result } = renderHook(() => useThemeStore());

    const cleanup = result.current.initializeTheme();

    expect(cleanup).toBeInstanceOf(Function);
  });

  it("should default to system theme when localStorage returns null", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initializeTheme();
    });

    expect(result.current.theme).toBe("system");
  });
});
