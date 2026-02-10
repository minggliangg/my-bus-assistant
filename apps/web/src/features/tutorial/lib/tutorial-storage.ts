const TUTORIAL_COMPLETED_KEY = "mba.homeTutorial.v1.completedAt";

export const loadTutorialCompleted = (): boolean => {
  try {
    const value = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
    if (!value) return false;

    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0;
  } catch {
    return false;
  }
};

export const markTutorialCompleted = (): void => {
  try {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures; tutorial can still run without persistence.
  }
};

export const clearTutorialCompleted = (): void => {
  try {
    localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
  } catch {
    // Ignore storage failures.
  }
};

export { TUTORIAL_COMPLETED_KEY };
