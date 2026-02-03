import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import useBusStore from "../stores/useBusStopStore";
import { AutoRefreshControl } from "./AutoRefreshControl";

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui);
};

describe("AutoRefreshControl", () => {
  afterEach(() => {
    localStorage.clear();
    useBusStore.getState().reset();
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  // Rendering
  describe("Rendering", () => {
    test("renders auto-refresh button", () => {
      renderWithProviders(<AutoRefreshControl busStopCode="83139" />);

      expect(
        screen.getByRole("button", { name: /start auto-refresh|auto/i }),
      ).toBeInTheDocument();
    });

    test("button is disabled when no bus stop is selected", () => {
      renderWithProviders(<AutoRefreshControl busStopCode={undefined} />);

      const button = screen.getByRole("button", {
        name: /start auto-refresh/i,
      });
      expect(button).toBeDisabled();
    });

    test("button is enabled when bus stop is selected", () => {
      renderWithProviders(<AutoRefreshControl busStopCode="83139" />);

      const button = screen.getByRole("button", {
        name: /start auto-refresh/i,
      });
      expect(button).not.toBeDisabled();
    });
  });

  // Behavior
  describe("Behavior", () => {
    test("toggles button on click", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoRefreshControl busStopCode="83139" />);

      const button = screen.getByRole("button", {
        name: /start auto-refresh/i,
      });
      expect(button).toHaveClass("bg-muted");

      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /stop auto-refresh/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /stop auto-refresh/i }),
        ).toHaveClass("bg-primary");
        expect(
          screen.getByRole("button", { name: /stop auto-refresh/i }),
        ).toHaveClass("text-primary-foreground");
      });
    });

    test("clears interval on unmount", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({
        advanceTimers: (delay) => vi.advanceTimersByTime(delay),
      });

      const { unmount } = renderWithProviders(
        <AutoRefreshControl busStopCode="83139" />,
      );

      await user.click(
        screen.getByRole("button", { name: /start auto-refresh/i }),
      );

      // Advance timers to ensure interval is set
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    test("restarts interval when bus stop code changes", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({
        advanceTimers: (delay) => vi.advanceTimersByTime(delay),
      });

      const { rerender } = renderWithProviders(
        <AutoRefreshControl busStopCode="83139" />,
      );

      await user.click(
        screen.getByRole("button", { name: /start auto-refresh/i }),
      );

      // Advance timers to ensure interval is set
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      rerender(<AutoRefreshControl busStopCode="83138" />);

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    test("disables auto-refresh when bus stop code becomes undefined", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({
        advanceTimers: (delay) => vi.advanceTimersByTime(delay),
      });

      const { rerender } = renderWithProviders(
        <AutoRefreshControl busStopCode="83139" />,
      );

      await user.click(
        screen.getByRole("button", { name: /start auto-refresh/i }),
      );

      // Advance timers to ensure interval is set
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      // Change to undefined
      rerender(<AutoRefreshControl busStopCode={undefined} />);

      expect(clearIntervalSpy).toHaveBeenCalled();

      // Button should be disabled
      await waitFor(() => {
        const button = screen.getByRole("button", {
          name: /stop auto-refresh/i,
        });
        expect(button).toBeDisabled();
      });

      clearIntervalSpy.mockRestore();
    });
  });

  // Accessibility
  describe("Accessibility", () => {
    test("has proper aria-label", () => {
      renderWithProviders(<AutoRefreshControl busStopCode="83139" />);

      const button = screen.getByRole("button", {
        name: /start auto-refresh/i,
      });
      expect(button).toHaveAttribute("aria-label");
    });

    test("updates aria-label when toggled", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoRefreshControl busStopCode="83139" />);

      const initialButton = screen.getByRole("button", {
        name: /start auto-refresh/i,
      });
      expect(initialButton).toHaveAttribute("aria-label", "Start auto-refresh");

      await user.click(initialButton);

      await waitFor(() => {
        const toggledButton = screen.getByRole("button", {
          name: /stop auto-refresh/i,
        });
        expect(toggledButton).toHaveAttribute("aria-label", "Stop auto-refresh");
      });
    });
  });
});
