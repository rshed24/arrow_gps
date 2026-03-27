import { describe, it, expect } from "vitest";

// Test share message format (simple: name + coordinates only)
describe("Share message format", () => {
  it("should format share message with name and decimal coordinates only", () => {
    const name = "البيت";
    const lat = 24.579754;
    const lon = 46.756606;
    const message = `${name}\n${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    
    expect(message).toBe("البيت\n24.579754, 46.756606");
    expect(message).not.toContain("http");
    expect(message).not.toContain("Google");
    expect(message).not.toContain("maps");
  });
});

// Test auto-naming for saved locations
describe("Auto-naming locations", () => {
  it("should generate name with prefix and date when name is empty", () => {
    const language = "ar";
    const prefix = language === "ar" ? "موقعي" : "My Location";
    const now = new Date(2026, 2, 11, 14, 30);
    const dateStr = now.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = now.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const name = `${prefix} ${dateStr} ${timeStr}`;
    
    expect(name).toContain("موقعي");
    expect(name.length).toBeGreaterThan(5);
  });

  it("should use provided name when not empty", () => {
    const coordName = "خيمة";
    const name = coordName.trim() || "موقعي";
    expect(name).toBe("خيمة");
  });

  it("should use auto-name when name is empty string", () => {
    const coordName = "";
    const trimmed = coordName.trim();
    const shouldAutoName = !trimmed;
    expect(shouldAutoName).toBe(true);
  });

  it("should use auto-name when name is whitespace", () => {
    const coordName = "   ";
    const trimmed = coordName.trim();
    const shouldAutoName = !trimmed;
    expect(shouldAutoName).toBe(true);
  });
});

// Test bearing calculation for arrow direction
describe("Bearing calculation", () => {
  it("should calculate correct bearing between two points", () => {
    // From Riyadh to Mecca (roughly southwest)
    const lat1 = 24.7136 * (Math.PI / 180);
    const lon1 = 46.6753 * (Math.PI / 180);
    const lat2 = 21.3891 * (Math.PI / 180);
    const lon2 = 39.8579 * (Math.PI / 180);

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;

    // Bearing from Riyadh to Mecca should be roughly 240-260 degrees (southwest)
    expect(bearing).toBeGreaterThan(230);
    expect(bearing).toBeLessThan(270);
  });

  it("should calculate arrow rotation from bearing and heading", () => {
    const bearing = 250; // Target is southwest
    const heading = 0; // Phone pointing north
    const rotation = (bearing - heading + 360) % 360;
    expect(rotation).toBe(250);
  });

  it("should handle heading greater than bearing", () => {
    const bearing = 30; // Target is northeast
    const heading = 350; // Phone pointing almost north
    const rotation = (bearing - heading + 360) % 360;
    expect(rotation).toBe(40); // Arrow should point slightly right
  });
});

// Test low-pass filter for compass smoothing
describe("Low-pass filter", () => {
  it("should smooth values gradually", () => {
    const ALPHA = 0.15;
    let filtered = 0;
    
    // Apply filter with new value of 90
    filtered = filtered + ALPHA * (90 - filtered);
    expect(filtered).toBeCloseTo(13.5, 1);
    
    // Apply again
    filtered = filtered + ALPHA * (90 - filtered);
    expect(filtered).toBeCloseTo(24.975, 1);
    
    // After many iterations, should approach target
    for (let i = 0; i < 50; i++) {
      filtered = filtered + ALPHA * (90 - filtered);
    }
    expect(filtered).toBeCloseTo(90, 0);
  });

  it("should handle circular angle wrapping", () => {
    // When transitioning from 350 to 10 degrees, should go through 0
    let current = 350;
    const target = 10;
    let diff = target - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    expect(diff).toBe(20); // Should be +20, not -340
  });
});

// Test distance calculation
describe("Distance calculation", () => {
  it("should calculate distance between two nearby points", () => {
    const lat1 = 24.579754;
    const lon1 = 46.756606;
    const lat2 = 24.579780;
    const lon2 = 46.756566;

    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Should be a few meters
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(100);
  });
});
