import { describe, it, expect } from "vitest";
import { exportToGPX, parseGPX, parseKML, parseLOC } from "../file-utils";
import type { SavedLocation } from "../location-store";

const sampleLocations: SavedLocation[] = [
  {
    id: "1",
    name: "Home",
    latitude: 24.579754,
    longitude: 46.756606,
    altitude: 600,
    createdAt: 1710000000000,
  },
  {
    id: "2",
    name: "Office",
    latitude: 24.700000,
    longitude: 46.800000,
    createdAt: 1710000000000,
  },
];

describe("exportToGPX", () => {
  it("should generate valid GPX XML", () => {
    const gpx = exportToGPX(sampleLocations);
    expect(gpx).toContain('<?xml version="1.0"');
    expect(gpx).toContain("<gpx");
    expect(gpx).toContain("<wpt");
    expect(gpx).toContain('lat="24.579754"');
    expect(gpx).toContain('lon="46.756606"');
    expect(gpx).toContain("<name>Home</name>");
    expect(gpx).toContain("<name>Office</name>");
  });
});

describe("parseGPX", () => {
  it("should parse GPX content", () => {
    const gpx = exportToGPX(sampleLocations);
    const parsed = parseGPX(gpx);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("Home");
    expect(parsed[0].latitude).toBe(24.579754);
    expect(parsed[0].longitude).toBe(46.756606);
    expect(parsed[1].name).toBe("Office");
  });
});

describe("parseKML", () => {
  it("should parse KML content", () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Test Location</name>
      <Point>
        <coordinates>46.756606,24.579754,600</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;
    const parsed = parseKML(kml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Test Location");
    expect(parsed[0].latitude).toBeCloseTo(24.579754, 5);
    expect(parsed[0].longitude).toBeCloseTo(46.756606, 5);
  });
});

describe("parseLOC", () => {
  it("should parse LOC content", () => {
    const loc = `<?xml version="1.0" encoding="UTF-8"?>
<loc version="1.0">
  <waypoint>
    <name id="GC1234">Cache Point</name>
    <coord lat="24.579754" lon="46.756606" alt="600"/>
  </waypoint>
</loc>`;
    const parsed = parseLOC(loc);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Cache Point");
    expect(parsed[0].latitude).toBeCloseTo(24.579754, 5);
  });
});
