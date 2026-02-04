import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NearbyBusStopsButton } from "./NearbyBusStopsButton";
import useNearbyStore from "../stores/useNearbyStore";

describe("NearbyBusStopsButton", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    useNearbyStore.getState().clearLocation();
    mockOnOpenChange.mockClear();
  });

  it("should render with Navigation icon and 'Nearby' text", () => {
    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Nearby");

    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should call onOpenChange(true) when clicked", async () => {
    const user = userEvent.setup();
    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockOnOpenChange).toHaveBeenCalledWith(true);
  });

  it("should be disabled when disabled prop is true", () => {
    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} disabled />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should show error styling when location error exists", () => {
    useNearbyStore.setState({ locationError: "Location permission denied" });

    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive/10");
    expect(button).toHaveClass("text-destructive");
  });

  it("should not show error styling when no error exists", () => {
    useNearbyStore.setState({ locationError: null });

    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-muted");
    expect(button).toHaveClass("text-muted-foreground");
  });

  it("should show loading state with aria-busy when loading", () => {
    useNearbyStore.setState({ loadingLocation: true });

    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("should not have aria-busy when not loading", () => {
    useNearbyStore.setState({ loadingLocation: false });

    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "false");
  });

  it("should have correct aria-label", () => {
    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Find nearby bus stops");
  });

  it("should apply custom className", () => {
    render(<NearbyBusStopsButton onOpenChange={mockOnOpenChange} className="custom-class" />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
