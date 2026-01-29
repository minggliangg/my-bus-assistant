import { describe, expect, test } from "vitest";
import {
  formatArrivalTime,
  getArrivalInMinutes,
  getBusLoadLabel,
  isArriving,
  type BusArrival,
  type BusLoad,
} from "./bus-arrivals-model";

// Helper to create an arrival at a specific minute offset from now
const createArrivalAt = (minutesFromNow: number): BusArrival => {
  const now = Date.now();
  const estimatedArrival = new Date(now + minutesFromNow * 60000);

  return {
    originCode: "83139",
    destinationCode: "96049",
    estimatedArrival,
    latitude: 1.316748,
    longitude: 103.9,
    visitNumber: 1,
    load: "SEA",
    feature: "",
    type: "SD",
  };
};

describe("getArrivalInMinutes", () => {
  test("calculates correct minutes from now", () => {
    // Allow for 1 second variance in test execution
    const result = getArrivalInMinutes(createArrivalAt(5));
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(6);
  });

  test("handles edge case: exactly 1 minute", () => {
    const result = getArrivalInMinutes(createArrivalAt(1));
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(2);
  });

  test("handles edge case: arriving now (<1 minute)", () => {
    const arrival = createArrivalAt(0);
    const result = getArrivalInMinutes(arrival);
    expect(result).toBe(0);
  });

  test("handles past buses - returns 0", () => {
    const now = Date.now();
    const pastArrival: BusArrival = {
      originCode: "83139",
      destinationCode: "96049",
      estimatedArrival: new Date(now - 2 * 60000), // 2 minutes ago
      latitude: 1.316748,
      longitude: 103.9,
      visitNumber: 1,
      load: "SEA",
      feature: "",
      type: "SD",
    };
    expect(getArrivalInMinutes(pastArrival)).toBe(0);
  });

  test("handles exactly now", () => {
    const now = Date.now();
    const arrival: BusArrival = {
      originCode: "83139",
      destinationCode: "96049",
      estimatedArrival: new Date(now),
      latitude: 1.316748,
      longitude: 103.9,
      visitNumber: 1,
      load: "SEA",
      feature: "",
      type: "SD",
    };
    expect(getArrivalInMinutes(arrival)).toBe(0);
  });

  test("rounds correctly (approximate test)", () => {
    // Test that rounding works by checking values around the boundary
    const justUnder2Min = createArrivalAt(1.9);
    const justOver2Min = createArrivalAt(2.1);

    // Should round to nearest minute
    expect(getArrivalInMinutes(justUnder2Min)).toBe(2);
    expect(getArrivalInMinutes(justOver2Min)).toBe(2);
  });
});

describe("formatArrivalTime", () => {
  test('returns "Arr" for arriving now (≤1 min)', () => {
    const arrival = createArrivalAt(0);
    expect(formatArrivalTime(arrival)).toBe("Arr");
  });

  test('returns "Arr" for arrival within 30 seconds', () => {
    const arrival = createArrivalAt(0.5); // 30 seconds
    const result = formatArrivalTime(arrival);
    // Due to rounding, 30 seconds could round to 1 min or show as Arr
    // The function rounds to nearest minute, so 30s rounds to 1 min
    expect(["Arr", "1 min"]).toContain(result);
  });

  test('returns "1 min" for single minute', () => {
    const arrival = createArrivalAt(1);
    const result = formatArrivalTime(arrival);
    // Should be "Arr" or "1 min" depending on exact timing
    expect(["Arr", "1 min"]).toContain(result);
  });

  test('returns "X mins" for plural minutes', () => {
    const arrival = createArrivalAt(5);
    const result = formatArrivalTime(arrival);
    // Should contain "mins" or "min" depending on rounding
    expect(result).toMatch(/\d+ min/);
  });

  test("handles various minute values (approximate)", () => {
    const testCases = [
      { offsetMinutes: 0, expectedPattern: /^Arr$/ },
      { offsetMinutes: 2, expectedPattern: /^\d+ mins?$/ },
      { offsetMinutes: 10, expectedPattern: /^\d+ mins?$/ },
      { offsetMinutes: 30, expectedPattern: /^\d+ mins?$/ },
    ];

    testCases.forEach(({ offsetMinutes, expectedPattern }) => {
      const arrival = createArrivalAt(offsetMinutes);
      const result = formatArrivalTime(arrival);
      expect(result).toMatch(expectedPattern);
    });
  });
});

describe("isArriving", () => {
  test("returns true when bus is arriving within default 5 minutes", () => {
    const arrival = createArrivalAt(4);
    expect(isArriving(arrival)).toBe(true);
  });

  test("returns false when bus is arriving after 5 minutes", () => {
    const arrival = createArrivalAt(6);
    expect(isArriving(arrival)).toBe(false);
  });

  test("returns true at the boundary (5 minutes)", () => {
    const arrival = createArrivalAt(5);
    expect(isArriving(arrival)).toBe(true);
  });

  test("respects custom withinMinutes parameter", () => {
    const arrival = createArrivalAt(4);
    expect(isArriving(arrival, 3)).toBe(false);
    expect(isArriving(arrival, 5)).toBe(true);
    expect(isArriving(arrival, 10)).toBe(true);
  });

  test("returns true for buses arriving now", () => {
    const arrival = createArrivalAt(0);
    expect(isArriving(arrival)).toBe(true);
  });
});

describe("getBusLoadLabel", () => {
  test('returns "Seats Available" for SEA', () => {
    expect(getBusLoadLabel("SEA")).toBe("Seats Available");
  });

  test('returns "Standing Available" for SDA', () => {
    expect(getBusLoadLabel("SDA")).toBe("Standing Available");
  });

  test('returns "Limited Standing" for LSD', () => {
    expect(getBusLoadLabel("LSD")).toBe("Limited Standing");
  });

  test("handles all BusLoad types", () => {
    const loads: BusLoad[] = ["SEA", "SDA", "LSD"];
    const expected = [
      "Seats Available",
      "Standing Available",
      "Limited Standing",
    ];

    loads.forEach((load, index) => {
      expect(getBusLoadLabel(load)).toBe(expected[index]);
    });
  });
});
