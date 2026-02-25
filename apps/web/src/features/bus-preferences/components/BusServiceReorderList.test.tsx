import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusServiceReorderList } from "./BusServiceReorderList";
import useBusPreferencesStore from "@/features/bus-preferences/stores/useBusPreferencesStore";

const services = [
  { serviceNo: "10", operator: "SBST" },
  { serviceNo: "14", operator: "SMRT" },
  { serviceNo: "2", operator: "GAS" },
];

describe("BusServiceReorderList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useBusPreferencesStore.setState({
      stopPreferences: {},
      globalPriorities: { prioritizedServices: [], updatedAt: 0 },
      loading: false,
      error: null,
    });
  });

  it("reorders with arrows and saves combined order + hidden services", async () => {
    const user = userEvent.setup();
    const saveStopPreferences = vi.fn().mockResolvedValue(undefined);
    const resetServiceOrder = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    useBusPreferencesStore.setState({
      saveStopPreferences,
      resetServiceOrder,
    });

    render(
      <BusServiceReorderList
        busStopCode="01012"
        services={services}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    // Verify initial render order before interacting
    const badges = screen.getAllByText(/^(10|14|2)$/);
    expect(badges[0]).toHaveTextContent("10");
    expect(badges[1]).toHaveTextContent("14");
    expect(badges[2]).toHaveTextContent("2");

    // Move "10" down (swaps with "14")
    const moveDownButtons = screen.getAllByTitle("Move down");
    await user.click(moveDownButtons[0]);

    // Hide the first item (now "14")
    const hideButtons = screen.getAllByTitle("Hide service");
    await user.click(hideButtons[0]);

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(saveStopPreferences).toHaveBeenCalledWith(
      "01012",
      ["14", "10", "2"],
      ["14"],
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets to default order and clears hidden before saving", async () => {
    const user = userEvent.setup();
    const saveStopPreferences = vi.fn().mockResolvedValue(undefined);
    const resetServiceOrder = vi.fn().mockResolvedValue(undefined);

    useBusPreferencesStore.setState({
      stopPreferences: {
        "01012": {
          busStopCode: "01012",
          serviceOrder: ["2", "14", "10"],
          hiddenServices: ["14"],
          updatedAt: Date.now(),
        },
      },
      saveStopPreferences,
      resetServiceOrder,
    });

    render(
      <BusServiceReorderList
        busStopCode="01012"
        services={services}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reset Customisation" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(resetServiceOrder).toHaveBeenCalledWith("01012");
    expect(saveStopPreferences).toHaveBeenCalledWith(
      "01012",
      ["10", "14", "2"],
      [],
    );
  });

  it("first item's Move up and last item's Move down are disabled", () => {
    useBusPreferencesStore.setState({
      saveStopPreferences: vi.fn(),
      resetServiceOrder: vi.fn(),
    });

    render(
      <BusServiceReorderList
        busStopCode="01012"
        services={services}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    const moveUpButtons = screen.getAllByTitle("Move up");
    const moveDownButtons = screen.getAllByTitle("Move down");

    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveUpButtons[1]).not.toBeDisabled();
    expect(moveDownButtons[services.length - 1]).toBeDisabled();
    expect(moveDownButtons[0]).not.toBeDisabled();
  });

  it("toggles a hidden service back to visible before saving", async () => {
    const user = userEvent.setup();
    const saveStopPreferences = vi.fn().mockResolvedValue(undefined);

    useBusPreferencesStore.setState({
      stopPreferences: {
        "01012": {
          busStopCode: "01012",
          serviceOrder: null,
          hiddenServices: ["10"],
          updatedAt: Date.now(),
        },
      },
      saveStopPreferences,
      resetServiceOrder: vi.fn(),
    });

    render(
      <BusServiceReorderList
        busStopCode="01012"
        services={services}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    // "10" starts hidden — show it
    await user.click(screen.getByTitle("Show service"));

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(saveStopPreferences).toHaveBeenCalledWith(
      "01012",
      ["10", "14", "2"],
      [],
    );
  });

  it("does not call save when dialog is closed without saving", async () => {
    const user = userEvent.setup();
    const saveStopPreferences = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    useBusPreferencesStore.setState({
      saveStopPreferences,
      resetServiceOrder: vi.fn(),
    });

    render(
      <BusServiceReorderList
        busStopCode="01012"
        services={services}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    // Move an item to make a change
    const moveDownButtons = screen.getAllByTitle("Move down");
    await user.click(moveDownButtons[0]);

    // Close via the dialog close button (X) — Dialog fires onOpenChange(false)
    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(saveStopPreferences).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
