import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearTutorialCompleted,
  markTutorialCompleted,
} from "../lib/tutorial-storage";
import useTutorialStore from "./useTutorialStore";

const resetStore = () => {
  useTutorialStore.setState({
    isOpen: false,
    currentStepIndex: 0,
    hasCompletedOnce: false,
  });
};

describe("useTutorialStore", () => {
  afterEach(() => {
    clearTutorialCompleted();
    resetStore();
    vi.restoreAllMocks();
  });

  it("initializes completion from storage", () => {
    markTutorialCompleted();
    const { result } = renderHook(() => useTutorialStore());

    act(() => {
      result.current.initializeTutorialState();
    });

    expect(result.current.hasCompletedOnce).toBe(true);
  });

  it("starts tutorial for first-time users", () => {
    const { result } = renderHook(() => useTutorialStore());

    act(() => {
      result.current.initializeTutorialState();
      result.current.startTutorial();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("does not start when completed unless forced", () => {
    const { result } = renderHook(() => useTutorialStore());

    act(() => {
      result.current.initializeTutorialState();
      result.current.finishTutorial();
      result.current.startTutorial();
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.startTutorial({ force: true });
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("respects navigation bounds", () => {
    const { result } = renderHook(() => useTutorialStore());

    act(() => {
      result.current.startTutorial({ force: true });
      result.current.prevStep();
    });

    expect(result.current.currentStepIndex).toBe(0);

    act(() => {
      result.current.nextStep();
      result.current.nextStep();
      result.current.nextStep();
      result.current.nextStep();
      result.current.nextStep();
      result.current.nextStep();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.hasCompletedOnce).toBe(true);
  });

  it("marks completion on skip and finish", () => {
    const { result } = renderHook(() => useTutorialStore());

    act(() => {
      result.current.startTutorial({ force: true });
      result.current.skipTutorial();
    });

    expect(result.current.hasCompletedOnce).toBe(true);

    clearTutorialCompleted();
    resetStore();

    act(() => {
      result.current.startTutorial({ force: true });
      result.current.finishTutorial();
    });

    expect(result.current.hasCompletedOnce).toBe(true);
  });

  it("closes without marking completion", () => {
    const { result } = renderHook(() => useTutorialStore());

    act(() => {
      result.current.startTutorial({ force: true });
      result.current.closeTutorial();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.hasCompletedOnce).toBe(false);
  });
});
