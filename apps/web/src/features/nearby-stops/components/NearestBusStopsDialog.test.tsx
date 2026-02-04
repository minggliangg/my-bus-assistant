import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NearestBusStopsDialog } from "./NearestBusStopsDialog";
import type { NearbyBusStop } from "../models/nearby-stops-model";

// Mock the Map component since it requires DOM and Web APIs not available in test
vi.mock("@/components/ui/map", () => ({
  Map: ({ className, busStops, onBusStopClick, selectedStopCode }: {
    className?: string;
    userLocation: { latitude: number; longitude: number } | null;
    busStops: NearbyBusStop[];
    onBusStopClick?: (code: string) => void;
    selectedStopCode?: string;
  }) => (
    <div data-testid="map" className={className}>
      <div data-testid="bus-stops-count">{busStops.length}</div>
      {selectedStopCode && <div data-testid="selected-stop">{selectedStopCode}</div>}
      <button
        onClick={() => onBusStopClick?.(busStops[0]?.busStopCode)}
        type="button"
      >
        Simulate Marker Click
      </button>
    </div>
  ),
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
    render(<NearestBusStopsDialog {...defaultProps} loading={true} nearestStops={[]} />);

    expect(screen.getByText("Finding nearest stops...")).toBeInTheDocument();
  });

  it("should show error state with permission denied message", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        loading={false}
        error="Location permission denied"
      />,
    );

    expect(screen.getByText("Location permission denied")).toBeInTheDocument();
    expect(
      screen.getByText("Enable location access in your browser settings"),
    ).toBeInTheDocument();
  });

  it("should not show retry button for permission denied error", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        loading={false}
        error="Location permission denied"
      />,
    );

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("should show error state with timeout message", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        loading={false}
        error="Location request timed out"
      />,
    );

    expect(screen.getByText("Location request timed out")).toBeInTheDocument();
  });

  it("should show retry button for timeout error", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        loading={false}
        error="Location request timed out"
      />,
    );

    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeInTheDocument();
  });

  it("should call onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
        loading={false}
        error="Location request timed out"
      />,
    );

    const retryButton = screen.getByRole("button", { name: "Retry" });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it("should display map with nearest stops", () => {
    render(<NearestBusStopsDialog {...defaultProps} />);

    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getByTestId("bus-stops-count")).toHaveTextContent("2");
    expect(screen.getByText("2 nearby stops found")).toBeInTheDocument();
    expect(screen.getByText("Click a marker to select")).toBeInTheDocument();
  });

  it("should show no bus stops found message when nearestStops is empty", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        nearestStops={[]}
      />,
    );

    expect(screen.getByText("No bus stops found")).toBeInTheDocument();
  });

  it("should show selected stop info when marker is clicked", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    const markerButton = screen.getByRole("button", { name: "Simulate Marker Click" });
    await user.click(markerButton);

    expect(screen.getByTestId("selected-stop")).toHaveTextContent("01012");
    expect(screen.getByText("Hotel Grand Pacific")).toBeInTheDocument();
    expect(screen.getByText("Victoria St")).toBeInTheDocument();
    expect(screen.getByText("120m")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Arrivals" })).toBeInTheDocument();
  });

  it("should call onBusStopSelect and close dialog when View Arrivals is clicked", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    // First click the marker to select the stop
    const markerButton = screen.getByRole("button", { name: "Simulate Marker Click" });
    await user.click(markerButton);

    // Then click View Arrivals
    const viewArrivalsButton = screen.getByRole("button", { name: "View Arrivals" });
    await user.click(viewArrivalsButton);

    expect(mockOnBusStopSelect).toHaveBeenCalledWith("01012");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should close selected stop card when X button is clicked", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    // Click the marker to select the stop
    const markerButton = screen.getByRole("button", { name: "Simulate Marker Click" });
    await user.click(markerButton);

    expect(screen.getByTestId("selected-stop")).toBeInTheDocument();

    // Click the X button (clear selection)
    const closeButton = screen.getByRole("button", { name: /clear selection/i });
    await user.click(closeButton);

    expect(screen.queryByTestId("selected-stop")).not.toBeInTheDocument();
  });

  it("should close dialog when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<NearestBusStopsDialog {...defaultProps} />);

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should reset selected stop when dialog closes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NearestBusStopsDialog {...defaultProps} />);

    // Click the marker to select the stop
    const markerButton = screen.getByRole("button", { name: "Simulate Marker Click" });
    await user.click(markerButton);

    expect(screen.getByTestId("selected-stop")).toBeInTheDocument();

    // Click the Dialog's close button (the X button in the Dialog header)
    // This triggers handleOpenChange(false) which resets the selected stop
    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);

    // Re-open the dialog by simulating the parent setting open back to true
    rerender(<NearestBusStopsDialog {...defaultProps} open={true} />);

    // The selected stop should have been reset
    expect(screen.queryByTestId("selected-stop")).not.toBeInTheDocument();
  });

  it("should handle null userLocation gracefully", () => {
    render(
      <NearestBusStopsDialog
        {...defaultProps}
        userLocation={null}
      />,
    );

    expect(screen.getByTestId("map")).toBeInTheDocument();
  });
});
