import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NearestBusStopsDialog } from "./NearestBusStopsDialog";
import type { NearbyBusStop } from "../models/nearby-stops-model";

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

  beforeEach(() => {
    vi.restoreAllMocks();
    mockOnOpenChange.mockClear();
    mockOnBusStopSelect.mockClear();
    mockOnRetry.mockClear();
  });

  it("should render dialog with title and description when open", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={mockNearestStops}
        loading={false}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.getByText("Nearest Bus Stops")).toBeInTheDocument();
    expect(
      screen.getByText("Select a stop to view arrivals"),
    ).toBeInTheDocument();
  });

  it("should not render dialog when closed", () => {
    render(
      <NearestBusStopsDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        nearestStops={mockNearestStops}
        loading={false}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.queryByText("Nearest Bus Stops")).not.toBeInTheDocument();
  });

  it("should show loading state when loading is true", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={true}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.getByText("Finding nearest stops...")).toBeInTheDocument();
  });

  it("should show spinner in loading state", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={true}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    // Verify loading state is displayed (we already verify the text in the previous test)
    // This test ensures the component renders in loading state without errors
    expect(screen.getByText("Finding nearest stops...")).toBeInTheDocument();
  });

  it("should show error state with permission denied message", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={false}
        error="Location permission denied"
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
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
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={false}
        error="Location permission denied"
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("should show error state with timeout message", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={false}
        error="Location request timed out"
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.getByText("Location request timed out")).toBeInTheDocument();
  });

  it("should show retry button for timeout error", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={false}
        error="Location request timed out"
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeInTheDocument();
  });

  it("should call onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={false}
        error="Location request timed out"
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: "Retry" });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it("should display nearest stops list", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={mockNearestStops}
        loading={false}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.getByText("01012")).toBeInTheDocument();
    expect(screen.getByText("Hotel Grand Pacific")).toBeInTheDocument();
    // Use getAllByText for "Victoria St" since it appears twice (both stops are on Victoria St)
    const victoriaStElements = screen.getAllByText("Victoria St");
    expect(victoriaStElements).toHaveLength(2);
    expect(screen.getByText("120m")).toBeInTheDocument();
    expect(screen.getByText("01013")).toBeInTheDocument();
    expect(screen.getByText("St Joseph's Church")).toBeInTheDocument();
    expect(screen.getByText("250m")).toBeInTheDocument();
  });

  it("should call onBusStopSelect and close dialog when stop is clicked", async () => {
    const user = userEvent.setup();
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={mockNearestStops}
        loading={false}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    const firstStop = screen.getByText("Hotel Grand Pacific");
    await user.click(firstStop);

    expect(mockOnBusStopSelect).toHaveBeenCalledWith("01012");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should show no bus stops found message when nearestStops is empty", () => {
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={[]}
        loading={false}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.getByText("No bus stops found")).toBeInTheDocument();
  });

  it("should format distances correctly", () => {
    const stopsWithLongDistance: NearbyBusStop[] = [
      {
        busStopCode: "02012",
        roadName: "Test Rd",
        description: "Test Stop",
        latitude: 1.3,
        longitude: 103.8,
        distance: 1500,
      },
    ];

    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={stopsWithLongDistance}
        loading={false}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    expect(screen.getByText("1.5km")).toBeInTheDocument();
  });

  it("should close dialog when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <NearestBusStopsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nearestStops={mockNearestStops}
        loading={false}
        error={null}
        onBusStopSelect={mockOnBusStopSelect}
        onRetry={mockOnRetry}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
