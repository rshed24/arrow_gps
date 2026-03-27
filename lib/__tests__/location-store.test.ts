import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateBearing,
  formatDistance,
  getCardinalDirection,
  parseCoordinate,
  decimalToDMS,
  dmsToDecimal,
} from "../location-store";

describe("calculateDistance", () => {
  it("should calculate distance between Riyadh and Jeddah approximately", () => {
    // Riyadh: 24.7136, 46.6753
    // Jeddah: 21.4858, 39.1925
    const dist = calculateDistance(24.7136, 46.6753, 21.4858, 39.1925);
    // Approximately 850km
    expect(dist).toBeGreaterThan(800000);
    expect(dist).toBeLessThan(900000);
  });

  it("should return 0 for same point", () => {
    const dist = calculateDistance(24.7136, 46.6753, 24.7136, 46.6753);
    expect(dist).toBeCloseTo(0, 0);
  });
});

describe("calculateBearing", () => {
  it("should calculate bearing north as ~0", () => {
    const bearing = calculateBearing(24.0, 46.0, 25.0, 46.0);
    expect(bearing).toBeCloseTo(0, -1);
  });

  it("should calculate bearing east as ~90", () => {
    const bearing = calculateBearing(24.0, 46.0, 24.0, 47.0);
    expect(bearing).toBeCloseTo(90, -1);
  });
});

describe("formatDistance", () => {
  it("should format meters for short distances in Arabic", () => {
    expect(formatDistance(500, true)).toBe("500 م");
  });

  it("should format km for long distances in English", () => {
    expect(formatDistance(5000, false)).toBe("5.0 km");
  });

  it("should format meters for short distances in English", () => {
    expect(formatDistance(300, false)).toBe("300 m");
  });
});

describe("getCardinalDirection", () => {
  it("should return North for 0 degrees", () => {
    expect(getCardinalDirection(0, false)).toBe("North");
    expect(getCardinalDirection(0, true)).toBe("شمال");
  });

  it("should return East for 90 degrees", () => {
    expect(getCardinalDirection(90, false)).toBe("East");
    expect(getCardinalDirection(90, true)).toBe("شرق");
  });

  it("should return South for 180 degrees", () => {
    expect(getCardinalDirection(180, false)).toBe("South");
    expect(getCardinalDirection(180, true)).toBe("جنوب");
  });
});

describe("parseCoordinate", () => {
  it("should parse decimal degrees", () => {
    const result = parseCoordinate("24.579754, 46.756606");
    expect(result).not.toBeNull();
    expect(result!.latitude).toBeCloseTo(24.579754, 5);
    expect(result!.longitude).toBeCloseTo(46.756606, 5);
  });

  it("should parse decimal degrees with space separator", () => {
    const result = parseCoordinate("24.579754 46.756606");
    expect(result).not.toBeNull();
    expect(result!.latitude).toBeCloseTo(24.579754, 5);
  });

  it("should return null for invalid input", () => {
    const result = parseCoordinate("invalid");
    expect(result).toBeNull();
  });
});

describe("decimalToDMS", () => {
  it("should convert decimal to DMS", () => {
    const dms = decimalToDMS(24.579754);
    expect(dms.degrees).toBe(24);
    expect(dms.minutes).toBe(34);
    expect(dms.seconds).toBeCloseTo(47.11, 0);
  });
});

describe("dmsToDecimal", () => {
  it("should convert DMS to decimal", () => {
    const decimal = dmsToDecimal(24, 34, 47.11, false);
    expect(decimal).toBeCloseTo(24.5797, 3);
  });

  it("should handle negative (south/west)", () => {
    const decimal = dmsToDecimal(24, 34, 47.11, true);
    expect(decimal).toBeCloseTo(-24.5797, 3);
  });
});
