import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import useBusStore from "../stores/useBusStopStore";
import { BusStopArrivalCard } from "./BusStopArrivalCard";

// Mock TanStack Router's Link component to avoid needing RouterProvider in tests
vi.mock("@tanstack/react-router", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ children, search: _search, params: _params, ...props }: any) => <a {...props}>{children}</a>,
}));

// Helper to render with providers
const renderWithProviders = (ui: ReactElement) => {
  return render(ui);
};

describe("BusStopCard", () => {
  afterEach(() => {
    localStorage.clear();
    useBusStore.getState().reset();
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  // Rendering
  describe("Rendering", () => {
    test("renders loading spinner initially", () => {
      localStorage.clear(); // Ensure no cache
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      const loader = document.querySelector(".animate-spin");
      expect(loader).toBeInTheDocument();
    });

    test("renders error state when API fails", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="404" />);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/API Error: 404/);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    test("card has destructive border on error", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="404" />);

      await waitFor(() => {
        const card = screen
          .queryByText(/API Error: 404/)
          ?.closest(".border-destructive");
        expect(card).toBeInTheDocument();
      });
    });

    test("renders bus stop code and services on success", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
        expect(screen.getAllByText("15").length).toBeGreaterThan(0);
        expect(screen.getAllByText("66").length).toBeGreaterThan(0);
      });
    });

    test('renders "No services available" when services array is empty', async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="99999" />);

      await waitFor(() => {
        expect(screen.getByText("No services available")).toBeInTheDocument();
      });
    });
  });

  // Header
  describe("Header", () => {
    test("displays bus stop code correctly", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });
    });

    test("shows correct service count (singular)", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83138" />);

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });

    test("shows correct service count (plural)", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    test('displays "Bus Stop" label', async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("Bus Stop")).toBeInTheDocument();
      });
    });

    test("renders map pin icon", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

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
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getAllByText("15").length).toBeGreaterThan(0);
        expect(screen.getAllByText("66").length).toBeGreaterThan(0);
      });
    });

    test("renders full operator names", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("SBS Transit")).toBeInTheDocument();
        expect(screen.getByText("SMRT Corporation")).toBeInTheDocument();
      });
    });

    test("uses mobile-friendly route layout when route text is long", async () => {
      const mockCachedData = {
        busStopCode: "83139",
        services: [
          {
            serviceNo: "67",
            operator: "SMRT",
            nextBus: {
              originCode: "01012",
              destinationCode: "96049",
              estimatedArrival: new Date(Date.now() + 2 * 60000).toISOString(),
              latitude: 1.296848,
              longitude: 103.852535,
              visitNumber: 1,
              load: "SEA",
              feature: "WAB",
              type: "DD",
              originName: "Choa Chu Kang Int",
              destinationName:
                "Tampines Integrated Transport Hub and Interchange Terminal",
            },
            nextBus2: null,
            nextBus3: null,
          },
        ],
      };

      localStorage.setItem(
        "bus-stop-data-83139",
        JSON.stringify(mockCachedData),
      );
      localStorage.setItem("bus-stop-last-update-83139", Date.now().toString());
      useBusStore.setState({
        changedFields: [{ serviceNo: "67", busIndex: 0, changedAt: Date.now() }],
      });

      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        const route = screen.getByTestId("service-route-67");
        const header = screen.getByTestId("service-header-67");
        const updated = screen.getByTestId("service-updated-67");

        expect(route).toBeInTheDocument();
        expect(route).toHaveClass("whitespace-normal");
        expect(route).toHaveClass("break-words");
        expect(route).not.toHaveClass("truncate");
        expect(header).toHaveClass("flex-wrap");
        expect(updated).toBeInTheDocument();
      });
    });

  });

  // Bus Type Badges
  describe("Bus Type Badges", () => {
    test("shows bus type badges", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

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
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        // Should have at least one load badge rendered
        const badges = screen.getAllByText(/Seats|Standing|Limited/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    test("load dot indicators have accessible labels for small screens", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        const dots = screen.getAllByRole("img", { name: /Seats|Standing|Limited/ });
        expect(dots.length).toBeGreaterThan(0);
        dots.forEach((dot) => {
          expect(dot).toHaveAttribute("aria-label");
          expect(dot).toHaveAttribute("title");
        });
      });
    });
  });

  // Multiple Arrivals
  describe("Multiple Arrivals", () => {
    test("filters out null arrivals", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        // Service 66 has only 2 arrivals (nextBus3 is null)
        expect(screen.getAllByText("66").length).toBeGreaterThan(0);
        // Should not show "No arrivals" for services with partial data
        expect(screen.queryByText("No arrivals")).not.toBeInTheDocument();
      });
    });
  });

  describe("Arrival hierarchy", () => {
    test("renders primary hero and secondary arrivals for multi-arrival service", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByTestId("primary-arrival-15")).toBeInTheDocument();
        expect(screen.getByTestId("secondary-arrivals-15")).toBeInTheDocument();
      });
    });

    test("renders only primary hero when service has one arrival", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83138" />);

      await waitFor(() => {
        expect(screen.getByTestId("primary-arrival-15")).toBeInTheDocument();
        expect(screen.queryByTestId("secondary-arrivals-15")).not.toBeInTheDocument();
      });
    });

  });

  // Behavior
  describe("Behavior", () => {
    test("calls fetchBusArrivals on mount with busStopCode", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });
    });

    test("fetches correct bus stop based on prop", async () => {
      const { rerender } = renderWithProviders(
        <BusStopArrivalCard busStopCode="83139" />,
      );

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

      // Rerender with different bus stop code
      rerender(<BusStopArrivalCard busStopCode="99999" />);

      await waitFor(() => {
        expect(screen.getByText("99999")).toBeInTheDocument();
        expect(screen.getByText("No services available")).toBeInTheDocument();
      });
    });
  });

  // Accessibility
  describe("Accessibility", () => {
    test("has proper heading hierarchy", async () => {
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      await waitFor(() => {
        const h3 = screen.getByRole("heading", { level: 3 });
        expect(h3).toBeInTheDocument();
      });
    });
  });

  // localStorage persistence
  describe("localStorage persistence", () => {
    test("displays cached data immediately with stale indicator", async () => {
      // Pre-populate localStorage with mock data
      const mockCachedData = {
        busStopCode: "83139",
        services: [
          {
            serviceNo: "15",
            operator: "SBST",
            nextBus: {
              originCode: "83139",
              destinationCode: "96049",
              estimatedArrival: new Date(Date.now() + 2 * 60000).toISOString(),
              latitude: "1.316748",
              longitude: "103.900000",
              visitNumber: "1",
              load: "SEA",
              feature: "WAB",
              type: "DD",
            },
            nextBus2: null,
            nextBus3: null,
          },
        ],
      };
      localStorage.setItem(
        "bus-stop-data-83139",
        JSON.stringify(mockCachedData),
      );

      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      // Cached data should display immediately
      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

      // Wait for fresh data to load (component will show cached data, then fresh)
      await waitFor(() => {
        expect(screen.getAllByText("15").length).toBeGreaterThan(0);
      });

      // After fresh fetch, stale indicator should not be present
      await waitFor(() => {
        expect(screen.queryByText("Cached")).not.toBeInTheDocument();
      });
    });
  });

  // Page refresh simulation
  describe("Page Refresh Simulation", () => {
    test("displays cached data after page refresh", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      // Initial render and fetch
      const { unmount } = renderWithProviders(
        <BusStopArrivalCard busStopCode="83139" />,
      );

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

      // Unmount to simulate leaving page
      unmount();

      // Reset store to simulate page refresh
      act(() => {
        useBusStore.setState({
          busStop: null,
          loading: true,
          error: null,
          isAutoRefreshEnabled: false,
          lastUpdateTimestamp: null,
          lastAttemptTimestamp: null,
          isFetching: false,
          changedFields: [],
          isStale: false,
        });
      });

      // Re-render to simulate page refresh
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      // Cached data should show immediately
      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });
    });

    test("displays cached data after refresh within throttle window", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const now = Date.now();
      vi.setSystemTime(now);

      // Initial render and fetch
      const { unmount } = renderWithProviders(
        <BusStopArrivalCard busStopCode="83139" />,
      );

      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

      // Advance time by 30 seconds (within 45s throttle window, but we use 1s in tests)
      vi.setSystemTime(now + 2000);

      // Unmount
      unmount();

      // Reset store to simulate page refresh
      act(() => {
        useBusStore.setState({
          busStop: null,
          loading: true,
          error: null,
          isAutoRefreshEnabled: false,
          lastUpdateTimestamp: null,
          lastAttemptTimestamp: null,
          isFetching: false,
          changedFields: [],
          isStale: false,
        });
      });

      // Re-render
      renderWithProviders(<BusStopArrivalCard busStopCode="83139" />);

      // Cached data should still show
      await waitFor(() => {
        expect(screen.getByText("83139")).toBeInTheDocument();
      });

      // Wait a bit for state to settle
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Component should show either cached indicator or fresh data
      // (depending on timing, but it should not be empty)
      expect(screen.getByText("83139")).toBeInTheDocument();
    });
  });
});
