import { create } from "zustand";
import { HOME_TUTORIAL_STEPS } from "../models/tutorial-steps";
import {
  loadTutorialCompleted,
  markTutorialCompleted,
} from "../lib/tutorial-storage";

interface StartTutorialOptions {
  force?: boolean;
}

interface TutorialStore {
  isOpen: boolean;
  currentStepIndex: number;
  hasCompletedOnce: boolean;
  startTutorial: (options?: StartTutorialOptions) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  finishTutorial: () => void;
  closeTutorial: () => void;
  initializeTutorialState: () => void;
}

const LAST_STEP_INDEX = HOME_TUTORIAL_STEPS.length - 1;

const useTutorialStore = create<TutorialStore>((set, get) => ({
  isOpen: false,
  currentStepIndex: 0,
  hasCompletedOnce: false,

  startTutorial: (options) => {
    const force = options?.force ?? false;
    const { hasCompletedOnce } = get();

    if (!force && hasCompletedOnce) {
      return;
    }

    set({ isOpen: true, currentStepIndex: 0 });
  },

  nextStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex >= LAST_STEP_INDEX) {
      get().finishTutorial();
      return;
    }

    set({ currentStepIndex: currentStepIndex + 1 });
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    set({ currentStepIndex: Math.max(0, currentStepIndex - 1) });
  },

  skipTutorial: () => {
    markTutorialCompleted();
    set({ isOpen: false, currentStepIndex: 0, hasCompletedOnce: true });
  },

  finishTutorial: () => {
    markTutorialCompleted();
    set({ isOpen: false, currentStepIndex: 0, hasCompletedOnce: true });
  },

  closeTutorial: () => {
    set({ isOpen: false, currentStepIndex: 0 });
  },

  initializeTutorialState: () => {
    set({ hasCompletedOnce: loadTutorialCompleted() });
  },
}));

export default useTutorialStore;
