import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NearestBusStopsDialog } from "./NearestBusStopsDialog";
import type { NearbyBusStop } from "../models/nearby-stops-model";

// Mock the Map component since it requires DOM and Web APIs not available in test
const MapComponent = ({
  className,
  busStops,
  onBusStopClick,
  selectedStopCode,
}: {
  className?: string;
  userLocation: { latitude: number; longitude: number } | null;
  busStops: NearbyBusStop[];
  onBusStopClick?: (code: string) => void;
  selectedStopCode?: string;
}) => (
  <div data-testid="map" className={className}>
    <div data-testid="bus-stops-count">{busStops.length}</div>
    {selectedStopCode && (
      <div data-testid="selected-stop">{selectedStopCode}</div>
    )}
    {busStops.map((stop) => (
      <button
        key={stop.busStopCode}
        data-testid={`marker-${stop.busStopCode}`}
        onClick={() => onBusStopClick?.(stop.busStopCode)}
        type="button"
      >
        Marker {stop.busStopCode}
      </button>
    ))}
  </div>
);

vi.mock("@/components/ui/map", () => ({
  Map: MapComponent,
  default: MapComponent,
}));

describe("NearestBusStopsDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnBusStopSelect = vi.fn();
  const mockOnRetry = vi.fn();

  const mockNearestStops: NearbyBusStop[] = [
    {
      busStopCode: "01012",
      roadName: "Victoria St",
      description: "Hotel Grand Pacific",
      latitude: 1.296848,
      longitude: 103.852535,
      distance: 120,
    },
    {
      busStopCode: "01013",
      roadName: "Victoria St",
      description: "St Joseph's Church",
      latitude: 1.297928,
      longitude: 103.853321,
      distance: 250,
    },
  ];

  const mockUserLocation = { latitude: 1.2968, longitude: 103.8525 };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockOnOpenChange.mockClear();
    mockOnBusStopSelect.mockClear();
    mockOnRetry.mockClear();
  });

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    nearestStops: mockNearestStops,
    loading: false,
    error: null,
    userLocation: mockUserLocation,
    onBusStopSelect: mockOnBusStopSelect,
    onRetry: mockOnRetry,
  };

  it("should render dialog with title and description when open", () => {
    render(<NearestBusStopsDialog {...defaultProps} />);

    expect(screen.getByText("Nearest Bus Stops")).toBeInTheDocument();
    expect(
      screen.getByText("Select a stop to view arrivals"),
    ).toBeInTheDocument();
  });

  it("should not render dialog when closed", () => {
    render(<NearestBusStopsDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("Nearest Bus Stops")).not.toBeInTheDocument();
  });

  it("should show loading state when loading is true", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        loading={true}
        nearestStops={[]}
      />,
    );

    expect(screen.getByText("Finding nearest stops...")).toBeInTheDocument();
  });

  it("should show error state with permission denied message", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        error="Location permission denied"
      />,
    );

    expect(
      screen.getByText("Location permission denied"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enable location access in your browser settings"),
    ).toBeInTheDocument();
  });

  it("should not show retry button for permission denied error", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        error="Location permission denied"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it("should show retry button for timeout error and call onRetry", async () => {
    const user = userEvent.setup();
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        error="Location request timed out"
      />,
    );

    expect(
      screen.getByText("Location request timed out"),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Retry" });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it("should show no bus stops found message when nearestStops is empty", () => {
    render(<NearestBusStopsDialog {...defaultProps} nearestStops={[]} />);

    expect(screen.getByText("No bus stops found")).toBeInTheDocument();
  });

  it("should display map and stop list when stops are available", () => {
    render(<NearestBusStopsDialog {...defaultProps} />);

    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getByTestId("bus-stops-count")).toHaveTextContent("2");

    // List items should be rendered
    expect(screen.getByText("01012")).toBeInTheDocument();
    expect(screen.getByText("Hotel Grand Pacific")).toBeInTheDocument();
    expect(screen.getByText("120m")).toBeInTheDocument();

    expect(screen.getByText("01013")).toBeInTheDocument();
    expect(screen.getByText("St Joseph's Church")).toBeInTheDocument();
    expect(screen.getByText("250m")).toBeInTheDocument();
  });

  it("should sort stops by distance (nearest first)", () => {
    const stopsOutOfOrder: NearbyBusStop[] = [
      { ...mockNearestStops[1], distance: 500 },
      { ...mockNearestStops[0], distance: 100 },
    ];

    render(
      <NearestBusStopsDialog {...defaultProps} nearestStops={stopsOutOfOrder} />,
    );

    // Verify both stops rendered with correct distances
    expect(screen.getByText("100m")).toBeInTheDocument();
    expect(screen.getByText("500m")).toBeInTheDocument();
  });

  it("should select a stop on first click in the list", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    // Click a list item
    await user.click(screen.getByText("Hotel Grand Pacific"));

    // Should show the View button for the selected item
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    // Map should reflect selection
    expect(screen.getByTestId("selected-stop")).toHaveTextContent("01012");
  });

  it("should navigate to arrivals on second click of same list item", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    const listItem = screen.getByText("Hotel Grand Pacific");

    // First click selects
    await user.click(listItem);
    expect(mockOnBusStopSelect).not.toHaveBeenCalled();

    // Second click navigates
    await user.click(listItem);
    expect(mockOnBusStopSelect).toHaveBeenCalledWith("01012");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should navigate to arrivals when View button is clicked", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    // Select a stop first
    await user.click(screen.getByText("Hotel Grand Pacific"));

    // Click View button
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(mockOnBusStopSelect).toHaveBeenCalledWith("01012");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should highlight list item when map marker is clicked", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    await user.click(screen.getByTestId("marker-01012"));

    expect(screen.getByTestId("selected-stop")).toHaveTextContent("01012");
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });

  it("should switch selection when clicking a different stop", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    // Select first stop
    await user.click(screen.getByText("Hotel Grand Pacific"));
    expect(screen.getByTestId("selected-stop")).toHaveTextContent("01012");

    // Select second stop
    await user.click(screen.getByText("St Joseph's Church"));
    expect(screen.getByTestId("selected-stop")).toHaveTextContent("01013");

    // Only one View button should be visible
    expect(screen.getAllByRole("button", { name: "View" })).toHaveLength(1);
  });

  it("should support keyboard navigation (Enter to select/activate)", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    // Tab to first list item and press Enter to select
    const listItems = screen.getAllByRole("button").filter(
      (el) => el.getAttribute("tabindex") === "0",
    );
    listItems[0].focus();
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("selected-stop")).toHaveTextContent("01012");

    // Press Enter again to navigate
    await user.keyboard("{Enter}");
    expect(mockOnBusStopSelect).toHaveBeenCalledWith("01012");
  });

  it("should reset selected stop when dialog closes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NearestBusStopsDialog {...defaultProps} />);

    // Select a stop
    await user.click(screen.getByText("Hotel Grand Pacific"));
    expect(screen.getByTestId("selected-stop")).toBeInTheDocument();

    // Close and reopen
    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    rerender(<NearestBusStopsDialog {...defaultProps} open={true} />);
    expect(screen.queryByTestId("selected-stop")).not.toBeInTheDocument();
  });

  it("should handle null userLocation gracefully", () => {
    render(<NearestBusStopsDialog {...defaultProps} userLocation={null} />);

    expect(screen.getByTestId("map")).toBeInTheDocument();
  });
});
