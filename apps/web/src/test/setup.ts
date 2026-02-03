import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import { server } from "../mocks/server";

// Set shorter throttle interval for tests
const TEST_THROTTLE_INTERVAL_MS = "1000";
const TEST_BUS_STOPS_REFRESH_DAYS = "7";

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
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  }

  // Setup ResizeObserver mock (needed by cmdk component)
  globalThis.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };

  // Setup Element.scrollIntoView mock (needed by cmdk component)
  if (typeof Element !== "undefined") {
    Element.prototype.scrollIntoView = vi.fn();
  }
}

// Setup MSW server for API mocking
beforeAll(() => {
  vi.stubEnv("VITE_THROTTLE_INTERVAL_MS", TEST_THROTTLE_INTERVAL_MS);
  vi.stubEnv("VITE_BUS_STOPS_REFRESH_DAYS", TEST_BUS_STOPS_REFRESH_DAYS);
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
