import { server } from "@/mocks/server";
import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import useBusStore from "../stores/useBusStopStore";
import { BusStopCard } from "./BusStopCard";

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui);
};

describe("BusStopCard", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    server.resetHandlers();
    useBusStore.getState().reset();
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  // Rendering
  describe("Rendering", () => {
    test("renders loading spinner initially", () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      const loader = document.querySelector(".animate-spin");
      expect(loader).toBeInTheDocument();
    });

    test("renders error state when API fails", async () => {
      renderWithProviders(<BusStopCard busStopCode="404" />);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/API Error: 404/);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    test("card has destructive border on error", async () => {
      renderWithProviders(<BusStopCard busStopCode="404" />);

      await waitFor(() => {
        const card = screen
          .queryByText(/API Error: 404/)
          ?.closest(".border-destructive");
        expect(card).toBeInTheDocument();
      });
    });

    test("renders bus stop code and services on success", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
        expect(screen.getByText("15")).toBeInTheDocument();
        expect(screen.getByText("66")).toBeInTheDocument();
      });
    });

    test('renders "No services available" when services array is empty', async () => {
      renderWithProviders(<BusStopCard busStopCode="99999" />);

      await waitFor(() => {
        expect(screen.getByText("No services available")).toBeInTheDocument();
      });
    });
  });

  // Header
  describe("Header", () => {
    test("displays bus stop code correctly", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        const busStopCode = screen.getByText("83139");
        expect(busStopCode).toBeInTheDocument();
        expect(busStopCode.tagName).toBe("H3");
      });
    });

    test("shows correct service count (singular)", async () => {
      renderWithProviders(<BusStopCard busStopCode="83138" />);

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("service")).toBeInTheDocument();
      });
    });

    test("shows correct service count (plural)", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("services")).toBeInTheDocument();
      });
    });

    test('displays "Bus Stop" label', async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("Bus Stop")).toBeInTheDocument();
      });
    });

    test("renders map pin icon", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        const mapIcon =
          document.querySelector('[data-lucide="map-pin"]') ||
          document.querySelector("svg");
        expect(mapIcon).toBeInTheDocument();
      });
    });
  });

  // Bus Service Rows
  describe("Bus Service Rows", () => {
    test("renders service number in circle badge", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("15")).toBeInTheDocument();
        expect(screen.getByText("66")).toBeInTheDocument();
      });
    });

    test("renders operator name", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("SBST")).toBeInTheDocument();
        expect(screen.getByText("SMRT")).toBeInTheDocument();
      });
    });

    test("displays arrival times with clock icon", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        // Clock icons should be present for arrivals
        const clockIcon =
          document.querySelector('[data-lucide="clock"]') ||
          document.querySelector("svg");
        expect(clockIcon).toBeInTheDocument();
      });
    });
  });

  // Bus Type Badges
  describe("Bus Type Badges", () => {
    test("shows bus type badges", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        // Should have at least one badge rendered
        const badges = screen.getAllByText(/Double|Single|Bendy/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  // Load Badges
  describe("Load Badges", () => {
    test("displays load badges", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        // Should have at least one load badge rendered
        const badges = screen.getAllByText(/Seats|Standing|Limited/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  // Multiple Arrivals
  describe("Multiple Arrivals", () => {
    test("filters out null arrivals", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        // Service 66 has only 2 arrivals (nextBus3 is null)
        expect(screen.getByText("66")).toBeInTheDocument();
        // Should not show "No arrivals" for services with partial data
        expect(screen.queryByText("No arrivals")).not.toBeInTheDocument();
      });
    });
  });

  // Behavior
  describe("Behavior", () => {
    test("calls fetchBusArrivals on mount with busStopCode", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });
    });

    test("fetches correct bus stop based on prop", async () => {
      const { rerender } = renderWithProviders(
        <BusStopCard busStopCode="83139" />,
      );

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

      // Rerender with different bus stop code
      rerender(<BusStopCard busStopCode="99999" />);

      await waitFor(() => {
        expect(screen.getByText("99999")).toBeInTheDocument();
        expect(screen.getByText("No services available")).toBeInTheDocument();
      });
    });
  });

  // Accessibility
  describe("Accessibility", () => {
    test("has proper heading hierarchy", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        const h3 = screen.getByRole("heading", { level: 3 });
        expect(h3).toBeInTheDocument();
      });
    });
  });

  // Auto-refresh
  describe("Auto-refresh", () => {
    test("renders auto-refresh button", async () => {
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /start auto-refresh|auto/i }),
        ).toBeInTheDocument();
      });
    });

    test("toggles button on click", async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusStopCard busStopCode="83139" />);

      await waitFor(() => screen.getByText("83139"));

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
        <BusStopCard busStopCode="83139" />,
      );

      // Wait for initial data fetch to complete
      await vi.waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

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
        <BusStopCard busStopCode="83139" />,
      );

      // Wait for initial data fetch to complete
      await vi.waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /start auto-refresh/i }),
      );

      // Advance timers to ensure interval is set
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      rerender(<BusStopCard busStopCode="83138" />);

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
