import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ServiceRoutePage } from "./-service-route-page";

const fetchRouteMock = vi.fn();

const mockState = {
  route: {
    serviceNo: "10",
    operator: "SBST",
    directions: [
      {
        direction: 1,
        stops: [
          {
            stopSequence: 1,
            busStopCode: "01012",
            distance: 0,
            wdFirstBus: "0500",
            wdLastBus: "2300",
            satFirstBus: "0500",
            satLastBus: "2300",
            sunFirstBus: "0600",
            sunLastBus: "2300",
          },
        ],
      },
    ],
  },
  loading: false,
  error: null as string | null,
};

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
    useParams: () => ({ serviceNo: "10" }),
    useSearch: () => ({ fromStop: undefined }),
  };
});

vi.mock("@/features/theme", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/features/bus-routes", () => ({
  ServiceRouteCard: () => <div data-testid="service-route-card">route card</div>,
  useBusRouteStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      ...mockState,
      fetchRoute: fetchRouteMock,
    };
    return selector ? selector(state) : state;
  },
}));

describe("ServiceRoutePage", () => {
  it("does not render ServiceRouteCard when error exists", () => {
    mockState.error = "Route fetch failed";
    render(<ServiceRoutePage />);

    expect(screen.getByText("Route fetch failed")).toBeInTheDocument();
    expect(screen.queryByTestId("service-route-card")).not.toBeInTheDocument();
  });

  it("renders ServiceRouteCard when there is no error", () => {
    mockState.error = null;
    render(<ServiceRoutePage />);

    expect(screen.getByTestId("service-route-card")).toBeInTheDocument();
  });
});
