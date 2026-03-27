import { SavedLocation, generateId } from './location-store';

// Export locations to GPX format
export function exportToGPX(locations: SavedLocation[]): string {
  const waypoints = locations
    .map(
      (loc) => `  <wpt lat="${loc.latitude}" lon="${loc.longitude}">
    <ele>${loc.altitude || 0}</ele>
    <name>${escapeXml(loc.name)}</name>
    <time>${new Date(loc.createdAt).toISOString()}</time>
  </wpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Arrow GPS" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Arrow GPS Locations</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${waypoints}
</gpx>`;
}

// Parse GPX file content
export function parseGPX(content: string): SavedLocation[] {
  const locations: SavedLocation[] = [];
  const wptRegex = /<wpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/gi;
  let match;

  while ((match = wptRegex.exec(content)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const block = match[3];

    const nameMatch = block.match(/<name>([^<]*)<\/name>/i);
    const eleMatch = block.match(/<ele>([^<]*)<\/ele>/i);

    if (!isNaN(lat) && !isNaN(lon)) {
      locations.push({
        id: generateId(),
        name: nameMatch ? unescapeXml(nameMatch[1]) : `Location ${locations.length + 1}`,
        latitude: lat,
        longitude: lon,
        altitude: eleMatch ? parseFloat(eleMatch[1]) : undefined,
        createdAt: Date.now(),
      });
    }
  }

  return locations;
}

// Parse KML file content
export function parseKML(content: string): SavedLocation[] {
  const locations: SavedLocation[] = [];
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
  let match;

  while ((match = placemarkRegex.exec(content)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/<name>([^<]*)<\/name>/i);
    const coordMatch = block.match(/<coordinates>\s*([^<]+)\s*<\/coordinates>/i);

    if (coordMatch) {
      const parts = coordMatch[1].trim().split(',');
      if (parts.length >= 2) {
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const alt = parts.length >= 3 ? parseFloat(parts[2]) : undefined;

        if (!isNaN(lat) && !isNaN(lon)) {
          locations.push({
            id: generateId(),
            name: nameMatch ? unescapeXml(nameMatch[1]) : `Location ${locations.length + 1}`,
            latitude: lat,
            longitude: lon,
            altitude: alt,
            createdAt: Date.now(),
          });
        }
      }
    }
  }

  return locations;
}

// Parse LOC file content
export function parseLOC(content: string): SavedLocation[] {
  const locations: SavedLocation[] = [];
  const waypointRegex = /<waypoint>([\s\S]*?)<\/waypoint>/gi;
  let match;

  while ((match = waypointRegex.exec(content)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/<name\s+id="[^"]*">([^<]*)<\/name>/i);
    const coordMatch = block.match(/<coord\s+lat="([^"]+)"\s+lon="([^"]+)"(?:\s+alt="([^"]+)")?/i);

    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      const alt = coordMatch[3] ? parseFloat(coordMatch[3]) : undefined;

      if (!isNaN(lat) && !isNaN(lon)) {
        locations.push({
          id: generateId(),
          name: nameMatch ? unescapeXml(nameMatch[1]) : `Location ${locations.length + 1}`,
          latitude: lat,
          longitude: lon,
          altitude: alt,
          createdAt: Date.now(),
        });
      }
    }
  }

  return locations;
}

// Parse file based on extension
export function parseFile(content: string, filename: string): SavedLocation[] {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'gpx':
      return parseGPX(content);
    case 'kml':
      return parseKML(content);
    case 'kmz':
      // KMZ is a zipped KML - we'll try to parse as KML
      return parseKML(content);
    case 'loc':
      return parseLOC(content);
    default:
      // Try all parsers
      let results = parseGPX(content);
      if (results.length === 0) results = parseKML(content);
      if (results.length === 0) results = parseLOC(content);
      return results;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
