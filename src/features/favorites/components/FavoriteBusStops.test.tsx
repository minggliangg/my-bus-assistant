import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FavoriteBusStops } from "./FavoriteBusStops";
import useFavoritesStore from "../stores/useFavoritesStore";
import useBusStopsStore from "@/features/search-bar/stores/useBusStopsStore";

describe("FavoriteBusStops", () => {
  const mockOnBusStopSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnBusStopSelect.mockClear();
    useBusStopsStore.setState({
      busStops: [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
        {
          busStopCode: "01013",
          roadName: "Victoria St",
          description: "St Joseph's Church",
          latitude: 1.297928,
          longitude: 103.853321,
        },
      ],
      loading: false,
      error: null,
      lastUpdateTimestamp: null,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });
  });

  it("should render empty state", () => {
    useFavoritesStore.setState({ favorites: [] });

    render(
      <FavoriteBusStops
        onBusStopSelect={mockOnBusStopSelect}
        selectedBusStopCode={undefined}
      />,
    );

    expect(
      screen.getByText("Star bus stops to add them to favorites"),
    ).toBeInTheDocument();
  });

  it("should render favorites list", () => {
    useFavoritesStore.setState({ favorites: ["01012", "01013"] });

    render(
      <FavoriteBusStops
        onBusStopSelect={mockOnBusStopSelect}
        selectedBusStopCode={undefined}
      />,
    );

    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("01012")).toBeInTheDocument();
    expect(screen.getByText("Hotel Grand Pacific")).toBeInTheDocument();
    expect(screen.getByText("01013")).toBeInTheDocument();
    expect(screen.getByText("St Joseph's Church")).toBeInTheDocument();
  });

  it("should call onBusStopSelect when clicking favorite", async () => {
    useFavoritesStore.setState({ favorites: ["01012"] });

    render(
      <FavoriteBusStops
        onBusStopSelect={mockOnBusStopSelect}
        selectedBusStopCode={undefined}
      />,
    );

    const badge = screen.getByText("01012");
    await userEvent.click(badge);

    expect(mockOnBusStopSelect).toHaveBeenCalledWith("01012");
  });

  it("should highlight selected bus stop", () => {
    useFavoritesStore.setState({ favorites: ["01012", "01013"] });

    render(
      <FavoriteBusStops
        onBusStopSelect={mockOnBusStopSelect}
        selectedBusStopCode="01012"
      />,
    );

    const badges = screen.getAllByText("01012");
    const selectedBadge = badges[0].closest('[data-variant="default"]');

    expect(selectedBadge).toBeInTheDocument();
  });

  it("should truncate long descriptions", () => {
    useFavoritesStore.setState({ favorites: ["01012"] });
    useBusStopsStore.setState({
      busStops: [
        {
          busStopCode: "01012",
          roadName: "Very Long Road Name That Goes On And On",
          description: "This is a very long description that should be truncated",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ],
      loading: false,
      error: null,
      lastUpdateTimestamp: null,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });

    render(
      <FavoriteBusStops
        onBusStopSelect={mockOnBusStopSelect}
        selectedBusStopCode={undefined}
      />,
    );

    const description = screen.getByText(
      (content) => content.includes("This is a very long"),
    );
    expect(description).toBeInTheDocument();
  });
});
