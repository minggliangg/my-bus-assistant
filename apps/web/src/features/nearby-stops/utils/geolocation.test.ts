import { describe, it, expect } from "vitest";
import { calculateDistance, formatDistance } from "./geolocation";

describe("calculateDistance", () => {
  it("should calculate distance between two points in Singapore", () => {
    const lat1 = 1.296848;
    const lon1 = 103.852535;
    const lat2 = 1.297928;
    const lon2 = 103.853321;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1000);
  });

  it("should return zero for same location", () => {
    const lat = 1.296848;
    const lon = 103.852535;

    const distance = calculateDistance(lat, lon, lat, lon);

    expect(distance).toBe(0);
  });

  it("should calculate longer distances correctly", () => {
    const lat1 = 1.3521;
    const lon1 = 103.8198;
    const lat2 = 1.2903;
    const lon2 = 103.8519;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);

    expect(distance).toBeGreaterThan(6000);
    expect(distance).toBeLessThan(8000);
  });

  it("should handle negative coordinates", () => {
    const lat1 = -1.296848;
    const lon1 = -103.852535;
    const lat2 = -1.297928;
    const lon2 = -103.853321;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1000);
  });
});

describe("formatDistance", () => {
  it("should format distances less than 1000 meters", () => {
    expect(formatDistance(0)).toBe("0m");
    expect(formatDistance(120)).toBe("120m");
    expect(formatDistance(999)).toBe("999m");
  });

  it("should format distances 1000 meters and above", () => {
    expect(formatDistance(1000)).toBe("1.0km");
    expect(formatDistance(1200)).toBe("1.2km");
    expect(formatDistance(1500)).toBe("1.5km");
    expect(formatDistance(5000)).toBe("5.0km");
  });

  it("should round to one decimal place for kilometers", () => {
    expect(formatDistance(1234)).toBe("1.2km");
    expect(formatDistance(1789)).toBe("1.8km");
    expect(formatDistance(9999)).toBe("10.0km");
  });
});
