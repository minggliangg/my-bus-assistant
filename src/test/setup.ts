import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

// Set shorter throttle interval for tests
import.meta.env.VITE_THROTTLE_INTERVAL_MS = "1000";
import.meta.env.VITE_BUS_STOPS_REFRESH_DAYS = "7";

// Setup global DOM environment
if (typeof globalThis !== "undefined") {
  // Setup localStorage mock
  let store: Record<string, string> = {};

  const localStorageMock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  // Also add to window for Jest compatibility
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  // Setup ResizeObserver mock (needed by cmdk component)
  globalThis.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };

  // Setup Element.scrollIntoView mock (needed by cmdk component)
  Element.prototype.scrollIntoView = vi.fn();
}

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
