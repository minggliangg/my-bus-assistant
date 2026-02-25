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

    const moveDownButtons = screen.getAllByTitle("Move down");
    await user.click(moveDownButtons[0]);

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
});
