import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import useTutorialStore from "../stores/useTutorialStore";
import { HOME_TUTORIAL_STEPS, type TutorialPlacement } from "../models/tutorial-steps";

const HIGHLIGHT_CLASS = "mba-tutorial-highlight";
const CARD_WIDTH = 320;
const CARD_HEIGHT = 190;
const CARD_GAP = 12;
const VIEWPORT_PADDING = 12;

const findElementForStep = (stepIndex: number): HTMLElement | null => {
  const step = HOME_TUTORIAL_STEPS[stepIndex];
  if (!step) return null;
  return document.querySelector(step.selector) as HTMLElement | null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const computeCardPosition = (
  targetRect: DOMRect,
  placement: TutorialPlacement,
): { top: number; left: number } => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const placeBottom = () => ({
    top: targetRect.bottom + CARD_GAP,
    left: targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2,
  });

  const placeTop = () => ({
    top: targetRect.top - CARD_GAP - CARD_HEIGHT,
    left: targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2,
  });

  const placeLeft = () => ({
    top: targetRect.top + targetRect.height / 2 - CARD_HEIGHT / 2,
    left: targetRect.left - CARD_WIDTH - CARD_GAP,
  });

  const placeRight = () => ({
    top: targetRect.top + targetRect.height / 2 - CARD_HEIGHT / 2,
    left: targetRect.right + CARD_GAP,
  });

  let position =
    placement === "top"
      ? placeTop()
      : placement === "bottom"
        ? placeBottom()
        : placement === "left"
          ? placeLeft()
          : placement === "right"
            ? placeRight()
            : placeBottom();

  if (placement === "auto") {
    const bottom = placeBottom();
    const top = placeTop();
    position = bottom.top + CARD_HEIGHT <= viewportHeight ? bottom : top;
  }

  return {
    top: clamp(position.top, VIEWPORT_PADDING, viewportHeight - CARD_HEIGHT - VIEWPORT_PADDING),
    left: clamp(position.left, VIEWPORT_PADDING, viewportWidth - CARD_WIDTH - VIEWPORT_PADDING),
  };
};

export const HomeTutorialOverlay = () => {
  const {
    isOpen,
    currentStepIndex,
    nextStep,
    prevStep,
    skipTutorial,
    finishTutorial,
    closeTutorial,
  } = useTutorialStore();

  const highlightedTargetRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const currentStep = HOME_TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === HOME_TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    const styleId = "mba-tutorial-highlight-style";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        position: relative;
        z-index: 60 !important;
        box-shadow: 0 0 0 3px hsl(var(--primary));
        border-radius: 0.5rem;
      }
    `;

    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let target = findElementForStep(currentStepIndex);
    if (!target) {
      let nextIndex = currentStepIndex;
      while (!target && nextIndex < HOME_TUTORIAL_STEPS.length - 1) {
        nextIndex += 1;
        target = findElementForStep(nextIndex);
      }

      if (!target) {
        finishTutorial();
        return;
      }

      while (useTutorialStore.getState().currentStepIndex < nextIndex) {
        useTutorialStore.getState().nextStep();
      }
      return;
    }

    if (highlightedTargetRef.current && highlightedTargetRef.current !== target) {
      highlightedTargetRef.current.classList.remove(HIGHLIGHT_CLASS);
    }

    target.classList.add(HIGHLIGHT_CLASS);
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });

    const updatePosition = () => {
      const rect = target!.getBoundingClientRect();
      const step = HOME_TUTORIAL_STEPS[useTutorialStore.getState().currentStepIndex];
      setPosition(computeCardPosition(rect, step?.placement ?? "auto"));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    highlightedTargetRef.current = target;

    return () => {
      if (target.isConnected) target.classList.remove(HIGHLIGHT_CLASS);
      highlightedTargetRef.current = null;
      setPosition(null);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, currentStepIndex, finishTutorial]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTutorial();
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (isLastStep) { finishTutorial(); } else { nextStep(); }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevStep();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeTutorial, finishTutorial, isLastStep, nextStep, prevStep]);

  const stepCounter = useMemo(() => {
    return `Step ${currentStepIndex + 1} of ${HOME_TUTORIAL_STEPS.length}`;
  }, [currentStepIndex]);

  if (!isOpen || !currentStep || !position) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Home tutorial">
      <div className="absolute inset-0 bg-black/45" onClick={closeTutorial} />
      <div
        className="absolute rounded-lg border bg-background p-4 shadow-xl"
        style={{ width: CARD_WIDTH, top: position.top, left: position.left }}
      >
        <p className="text-xs text-muted-foreground">{stepCounter}</p>
        <h2 className="mt-1 text-base font-semibold">{currentStep.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{currentStep.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={skipTutorial}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStepIndex === 0}>
              Back
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={finishTutorial}>
                Finish
              </Button>
            ) : (
              <Button size="sm" onClick={nextStep}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
