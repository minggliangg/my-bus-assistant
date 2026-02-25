import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { clearTutorialCompleted } from "../lib/tutorial-storage";
import { HOME_TUTORIAL_STEPS } from "../models/tutorial-steps";
import useTutorialStore from "../stores/useTutorialStore";
import { HomeTutorialOverlay } from "./HomeTutorialOverlay";

const resetStore = () => {
  useTutorialStore.setState({
    isOpen: false,
    currentStepIndex: 0,
    hasCompletedOnce: false,
  });
};

const renderWithTargets = () => {
  render(
    <>
      <button data-tour-id="search-bus-stop">search</button>
      <button data-tour-id="favorite-stop">favorite</button>
      <button data-tour-id="manual-refresh">manual</button>
      <button data-tour-id="auto-refresh">auto</button>
      <button data-tour-id="nearby-stops">nearby</button>
      <button data-tour-id="theme-toggle">theme</button>
      <button data-tour-id="settings-link">settings</button>
      <HomeTutorialOverlay />
    </>,
  );
};

describe("HomeTutorialOverlay", () => {
  afterEach(() => {
    clearTutorialCompleted();
    resetStore();
  });

  it("renders first step when started", async () => {
    renderWithTargets();

    useTutorialStore.getState().startTutorial({ force: true });

    expect(await screen.findByText("Search for a bus stop")).toBeInTheDocument();
    expect(screen.getByText(`Step 1 of ${HOME_TUTORIAL_STEPS.length}`)).toBeInTheDocument();
  });

  it("moves step on Next and Back", async () => {
    const user = userEvent.setup();
    renderWithTargets();

    useTutorialStore.getState().startTutorial({ force: true });

    await user.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Save your favorites")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByText("Search for a bus stop")).toBeInTheDocument();
  });

  it("skips missing selector steps", async () => {
    render(
      <>
        <button data-tour-id="search-bus-stop">search</button>
        <button data-tour-id="settings-link">settings</button>
        <HomeTutorialOverlay />
      </>,
    );

    useTutorialStore.getState().startTutorial({ force: true });
    useTutorialStore.getState().nextStep();

    await waitFor(() => {
      expect(screen.getByText("Open settings")).toBeInTheDocument();
    });
  });

  it("closes on Skip and Esc", async () => {
    const user = userEvent.setup();
    renderWithTargets();

    useTutorialStore.getState().startTutorial({ force: true });

    await user.click(await screen.findByRole("button", { name: "Skip" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Home tutorial" })).not.toBeInTheDocument();
    });

    useTutorialStore.getState().startTutorial({ force: true });
    await screen.findByRole("dialog", { name: "Home tutorial" });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Home tutorial" })).not.toBeInTheDocument();
    });
  });

  it("removes highlight class on close", async () => {
    renderWithTargets();

    useTutorialStore.getState().startTutorial({ force: true });

    const target = await screen.findByRole("button", { name: "search" });
    expect(target).toHaveClass("mba-tutorial-highlight");

    useTutorialStore.getState().closeTutorial();

    await waitFor(() => {
      expect(target).not.toHaveClass("mba-tutorial-highlight");
    });
  });
});
