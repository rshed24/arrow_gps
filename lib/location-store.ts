import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  createdAt: number;
}

const LOCATIONS_KEY = 'arrow_gps_locations';
const SELECTED_LOCATION_KEY = 'arrow_gps_selected';

let cachedLocations: SavedLocation[] | null = null;

export async function getLocations(): Promise<SavedLocation[]> {
  if (cachedLocations) return cachedLocations;
  try {
    const data = await AsyncStorage.getItem(LOCATIONS_KEY);
    cachedLocations = data ? JSON.parse(data) : [];
    return cachedLocations!;
  } catch {
    return [];
  }
}

export async function saveLocation(location: SavedLocation): Promise<void> {
  const locations = await getLocations();
  locations.push(location);
  cachedLocations = locations;
  await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

export async function deleteLocation(id: string): Promise<void> {
  let locations = await getLocations();
  locations = locations.filter((l) => l.id !== id);
  cachedLocations = locations;
  await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

export async function updateLocation(id: string, updates: Partial<SavedLocation>): Promise<void> {
  const locations = await getLocations();
  const index = locations.findIndex((l) => l.id === id);
  if (index !== -1) {
    locations[index] = { ...locations[index], ...updates };
    cachedLocations = locations;
    await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  }
}

export async function setAllLocations(locations: SavedLocation[]): Promise<void> {
  cachedLocations = locations;
  await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

export async function getSelectedLocation(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SELECTED_LOCATION_KEY);
  } catch {
    return null;
  }
}

export async function setSelectedLocation(id: string | null): Promise<void> {
  if (id) {
    await AsyncStorage.setItem(SELECTED_LOCATION_KEY, id);
  } else {
    await AsyncStorage.removeItem(SELECTED_LOCATION_KEY);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Coordinate conversion utilities
export function decimalToDMS(decimal: number): { degrees: number; minutes: number; seconds: number; direction: string } {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = parseFloat(((minutesFloat - minutes) * 60).toFixed(2));
  return { degrees, minutes, seconds, direction: '' };
}

export function dmsToDecimal(degrees: number, minutes: number, seconds: number, isNegative: boolean): number {
  const decimal = degrees + minutes / 60 + seconds / 3600;
  return isNegative ? -decimal : decimal;
}

// Parse various coordinate formats
export function parseCoordinate(input: string): { latitude: number; longitude: number } | null {
  // Clean input
  const cleaned = input.trim().replace(/\s+/g, ' ');

  // Try decimal degrees: "24.579754, 46.756606" or "24.579754 46.756606"
  const decimalMatch = cleaned.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lon = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: lat, longitude: lon };
    }
  }

  // Try DMS: "24°34'47.1"N 46°45'23.8"E" or variations
  const dmsRegex = /(\d+)[°]\s*(\d+)[′']\s*(\d+\.?\d*)[″"]\s*([NSEW])\s*[,\s]*(\d+)[°]\s*(\d+)[′']\s*(\d+\.?\d*)[″"]\s*([NSEW])/i;
  const dmsMatch = cleaned.match(dmsRegex);
  if (dmsMatch) {
    const lat = dmsToDecimal(
      parseInt(dmsMatch[1]),
      parseInt(dmsMatch[2]),
      parseFloat(dmsMatch[3]),
      dmsMatch[4].toUpperCase() === 'S'
    );
    const lon = dmsToDecimal(
      parseInt(dmsMatch[5]),
      parseInt(dmsMatch[6]),
      parseFloat(dmsMatch[7]),
      dmsMatch[8].toUpperCase() === 'W'
    );
    return { latitude: lat, longitude: lon };
  }

  // Try Degrees Decimal Minutes: "24 34.785N 46 45.397E"
  const ddmRegex = /(\d+)\s+(\d+\.?\d*)\s*([NSEW])\s*[,\s]*(\d+)\s+(\d+\.?\d*)\s*([NSEW])/i;
  const ddmMatch = cleaned.match(ddmRegex);
  if (ddmMatch) {
    const lat = dmsToDecimal(
      parseInt(ddmMatch[1]),
      parseFloat(ddmMatch[2]),
      0,
      ddmMatch[3].toUpperCase() === 'S'
    );
    const lon = dmsToDecimal(
      parseInt(ddmMatch[4]),
      parseFloat(ddmMatch[5]),
      0,
      ddmMatch[6].toUpperCase() === 'W'
    );
    return { latitude: lat, longitude: lon };
  }

  // Try Garmin format: "N24 34.785 E046 45.397"
  const garminRegex = /([NSEW])\s*(\d+)\s+(\d+\.?\d*)\s*[,\s]*([NSEW])\s*(\d+)\s+(\d+\.?\d*)/i;
  const garminMatch = cleaned.match(garminRegex);
  if (garminMatch) {
    const lat = dmsToDecimal(
      parseInt(garminMatch[2]),
      parseFloat(garminMatch[3]),
      0,
      garminMatch[1].toUpperCase() === 'S'
    );
    const lon = dmsToDecimal(
      parseInt(garminMatch[5]),
      parseFloat(garminMatch[6]),
      0,
      garminMatch[4].toUpperCase() === 'W'
    );
    return { latitude: lat, longitude: lon };
  }

  return null;
}

// Calculate distance between two points (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Calculate bearing between two points
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Format distance for display - always use English numerals
export function formatDistance(meters: number, isArabic: boolean): string {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    return `${km} ${isArabic ? 'كم' : 'km'}`;
  }
  return `${Math.round(meters)} ${isArabic ? 'م' : 'm'}`;
}

// Get cardinal direction name
export function getCardinalDirection(degrees: number, isArabic: boolean): string {
  const directions = isArabic
    ? ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب']
    : ['North', 'North East', 'East', 'South East', 'South', 'South West', 'West', 'North West'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}
