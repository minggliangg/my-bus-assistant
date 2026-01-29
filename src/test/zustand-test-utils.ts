import { act, render, type RenderResult } from "@testing-library/react";
import type { StoreApi, UseBoundStore } from "zustand";

/**
 * Wraps a Zustand store action to ensure state updates are captured by React's act()
 * This eliminates act() warnings when testing async operations in Zustand stores.
 *
 * @param store - The Zustand store
 * @param action - The async action to execute
 * @returns A promise that resolves when the action and all state updates complete
 *
 * @example
 * ```ts
 * await actZustand(useBusStore, async (store) => {
 *   await store.getState().fetchBusArrivals("83139");
 * });
 * ```
 */
export async function actZustand<T>(
  store: UseBoundStore<StoreApi<T>>,
  action: (store: UseBoundStore<StoreApi<T>>) => Promise<void> | void,
): Promise<void> {
  // Track if state has changed
  let stateChanged = false;
  const unsubscribe = store.subscribe(() => {
    stateChanged = true;
  });

  try {
    await act(async () => {
      await action(store);

      // If state changed, give React time to process the update
      // Use queueMicrotask for better compatibility with fake timers
      if (stateChanged) {
        await new Promise((resolve) => queueMicrotask(resolve));
      }
    });
  } finally {
    unsubscribe();
  }
}

/**
 * Waits for a Zustand store state to match a condition
 * Useful for waiting for specific state changes without act() warnings
 *
 * @param store - The Zustand store
 * @param condition - Function that returns true when desired state is reached
 * @param options - Configuration options
 * @returns A promise that resolves when the condition is met
 *
 * @example
 * ```ts
 * await waitForZustand(useBusStore, (state) => !state.loading);
 * ```
 */
export async function waitForZustand<T>(
  store: UseBoundStore<StoreApi<T>>,
  condition: (state: T) => boolean,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    // Check immediately
    if (condition(store.getState())) {
      resolve();
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // Subscribe to store changes
    const unsubscribe = store.subscribe((state) => {
      if (condition(state)) {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
        unsubscribe();
        resolve();
      }
    });

    // Set up timeout
    timeoutId = setTimeout(() => {
      if (intervalId) clearInterval(intervalId);
      unsubscribe();
      reject(new Error(`waitForZustand timeout after ${timeout}ms`));
    }, timeout);

    // Also poll in case we miss the subscription
    intervalId = setInterval(() => {
      if (condition(store.getState())) {
        if (timeoutId) clearTimeout(timeoutId);
        clearInterval(intervalId);
        unsubscribe();
        resolve();
      }
    }, interval);
  });
}

/**
 * Helper to execute a store action and wait for loading to complete
 * Common pattern for testing async fetch operations
 *
 * @param store - The Zustand store
 * @param action - The action to execute
 * @param loadingSelector - Function that returns true if store is loading
 * @returns A promise that resolves when loading completes
 *
 * @example
 * ```ts
 * await actAndWaitForLoading(
 *   useBusStore,
 *   (store) => store.getState().fetchBusArrivals("83139"),
 *   (state) => state.loading
 * );
 * ```
 */
export async function actAndWaitForLoading<T>(
  store: UseBoundStore<StoreApi<T>>,
  action: (store: UseBoundStore<StoreApi<T>>) => Promise<void> | void,
  loadingSelector: (state: T) => boolean,
): Promise<void> {
  await actZustand(store, action);
  // Wait for loading to become false
  await waitForZustand(store, (state) => !loadingSelector(state));
}

/**
 * Renders a component that uses Zustand stores and waits for initial effects to complete
 * This eliminates act() warnings when components trigger async store actions on mount
 *
 * @param ui - The React element to render
 * @param options - Optional configuration
 * @returns The render result
 *
 * @example
 * ```ts
 * const { getByText } = await renderWithZustand(<BusStopCard busStopCode="83139" />);
 * ```
 */
export async function renderWithZustand(
  ui: React.ReactElement,
  options: { waitForLoadingMs?: number } = {},
): Promise<RenderResult> {
  const { waitForLoadingMs = 0 } = options;
  let result: RenderResult;

  await act(async () => {
    result = render(ui);
    // Give time for useEffect to trigger and initial async operations to start
    await new Promise((resolve) => setTimeout(resolve, waitForLoadingMs));
  });

  return result!;
}
