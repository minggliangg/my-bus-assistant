import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { create } from "zustand";
import { actZustand, actAndWaitForLoading, waitForZustand } from "./zustand-test-utils";

// Example store for testing the utilities
interface TestStore {
  count: number;
  loading: boolean;
  error: string | null;
  increment: () => void;
  asyncIncrement: () => Promise<void>;
  fetchData: () => Promise<void>;
  reset: () => void;
}

const useTestStore = create<TestStore>((set) => ({
  count: 0,
  loading: false,
  error: null,
  increment: () => set((state) => ({ count: state.count + 1 })),
  asyncIncrement: async () => {
    set({ loading: true });
    await new Promise((resolve) => setTimeout(resolve, 100));
    set((state) => ({ count: state.count + 1, loading: false }));
  },
  fetchData: async () => {
    set({ loading: true, error: null });
    await new Promise((resolve) => setTimeout(resolve, 50));
    set({ loading: false });
  },
  reset: () => set({ count: 0, loading: false, error: null }),
}));

describe("zustand-test-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useTestStore.getState().reset();
  });

  describe("actZustand", () => {
    test("wraps synchronous state updates in act()", async () => {
      const { result } = renderHook(() => useTestStore());

      await actZustand(useTestStore, (store) => {
        store.getState().increment();
      });

      expect(result.current.count).toBe(1);
    });

    test("wraps async state updates in act()", async () => {
      const { result } = renderHook(() => useTestStore());

      await actZustand(useTestStore, async (store) => {
        const promise = store.getState().asyncIncrement();
        await vi.runAllTimersAsync();
        await promise;
      });

      expect(result.current.count).toBe(1);
      expect(result.current.loading).toBe(false);
    });

    test("handles multiple state updates", async () => {
      const { result } = renderHook(() => useTestStore());

      await actZustand(useTestStore, (store) => {
        store.getState().increment();
        store.getState().increment();
        store.getState().increment();
      });

      expect(result.current.count).toBe(3);
    });
  });

  describe("waitForZustand", () => {
    test("waits for store state to match condition", async () => {
      const { result } = renderHook(() => useTestStore());

      // Start async operation
      const promise = result.current.asyncIncrement();

      // Run timers for the async operation
      vi.runAllTimers();

      // Wait for loading to become false (this should resolve immediately since timers ran)
      await waitForZustand(useTestStore, (state) => !state.loading);

      await promise;
      expect(result.current.loading).toBe(false);
      expect(result.current.count).toBe(1);
    });

    test("resolves immediately if condition is already met", async () => {
      const { result } = renderHook(() => useTestStore());

      // Count is already 0, should resolve immediately
      await waitForZustand(useTestStore, (state) => state.count === 0);

      expect(result.current.count).toBe(0);
    });

    test("times out if condition is never met", async () => {
      const waitPromise = waitForZustand(
        useTestStore,
        (state) => state.count === 999, // Never true
        { timeout: 100, interval: 10 },
      );

      // Advance timers past the timeout
      vi.advanceTimersByTime(150);

      await expect(waitPromise).rejects.toThrow("waitForZustand timeout");
    });

    test("respects custom timeout", async () => {
      vi.setSystemTime(0);

      const waitPromise = waitForZustand(
        useTestStore,
        (state) => state.count === 999,
        { timeout: 200 },
      );

      // Advance timers past the custom timeout
      vi.advanceTimersByTime(250);

      await expect(waitPromise).rejects.toThrow("waitForZustand timeout");
    });
  });

  describe("actAndWaitForLoading", () => {
    test("executes action and waits for loading to complete", async () => {
      const { result } = renderHook(() => useTestStore());

      const loadingPromise = actAndWaitForLoading(
        useTestStore,
        async (store) => {
          const promise = store.getState().fetchData();
          vi.runAllTimers();
          await promise;
        },
        (state) => state.loading,
      );

      // Advance timers for waitForZustand polling
      await vi.runAllTimersAsync();
      await loadingPromise;

      expect(result.current.loading).toBe(false);
    });

    test("works with real timers", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => useTestStore());

      await actAndWaitForLoading(
        useTestStore,
        async (store) => {
          await store.getState().fetchData();
        },
        (state) => state.loading,
      );

      expect(result.current.loading).toBe(false);
      vi.useFakeTimers(); // Restore fake timers for cleanup
    });
  });

  describe("Real-world usage pattern", () => {
    test("demonstrates complete async fetch workflow", async () => {
      const { result } = renderHook(() => useTestStore());

      // Initial state
      expect(result.current.loading).toBe(false);
      expect(result.current.count).toBe(0);

      // Execute async action
      await actZustand(useTestStore, async (store) => {
        const promise = store.getState().asyncIncrement();
        await vi.runAllTimersAsync();
        await promise;
      });

      // Wait for loading to complete (should be immediate since we ran timers)
      await waitForZustand(useTestStore, (state) => !state.loading);

      // Final state
      expect(result.current.loading).toBe(false);
      expect(result.current.count).toBe(1);
    });

    test("demonstrates testing intermediate loading state", async () => {
      const { result } = renderHook(() => useTestStore());

      // Start async operation without waiting
      let promise: Promise<void>;
      await actZustand(useTestStore, (store) => {
        promise = store.getState().asyncIncrement();
      });

      // Loading should be true immediately
      expect(result.current.loading).toBe(true);

      // Complete the operation
      await vi.runAllTimersAsync();
      await promise!;

      // Loading should now be false
      expect(result.current.loading).toBe(false);
      expect(result.current.count).toBe(1);
    });
  });
});
