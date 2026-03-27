import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, Alert } from "react-native";
import { parseFile } from "./file-utils";
import { getLocations, setAllLocations, type SavedLocation } from "./location-store";

// Handle file opened from outside the app (deep link / intent)
export async function handleIncomingFile(url: string): Promise<number> {
  try {
    if (!url) return 0;

    let content: string;
    let filename = "unknown.gpx";

    // Extract filename from URL
    const urlParts = url.split("/");
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart.includes(".")) {
      filename = decodeURIComponent(lastPart.split("?")[0]);
    }

    // Read file content
    if (Platform.OS === "web") {
      const response = await fetch(url);
      content = await response.text();
    } else {
      // For content:// URIs on Android, copy to cache first
      if (url.startsWith("content://")) {
        const cacheUri = FileSystem.cacheDirectory + "import_" + Date.now() + ".tmp";
        await FileSystem.copyAsync({ from: url, to: cacheUri });
        content = await FileSystem.readAsStringAsync(cacheUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        // Clean up
        try {
          await FileSystem.deleteAsync(cacheUri, { idempotent: true });
        } catch {}
      } else {
        content = await FileSystem.readAsStringAsync(url, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
    }

    // Parse the file
    const parsedLocations = parseFile(content, filename);

    if (parsedLocations.length === 0) {
      return 0;
    }

    // Add to existing locations
    const existingLocations = await getLocations();
    const allLocations = [...existingLocations, ...parsedLocations];
    await setAllLocations(allLocations);

    return parsedLocations.length;
  } catch (error) {
    console.error("Error handling incoming file:", error);
    return 0;
  }
}

// Setup listener for incoming file URLs
export function setupFileImportListener(
  onImport: (count: number) => void
): () => void {
  // Handle URL that opened the app
  const handleUrl = async (event: { url: string }) => {
    if (!event.url) return;
    const count = await handleIncomingFile(event.url);
    if (count > 0) {
      onImport(count);
    }
  };

  // Listen for incoming URLs while app is running
  const subscription = Linking.addEventListener("url", handleUrl);

  // Check if app was opened with a URL
  Linking.getInitialURL().then(async (url) => {
    if (url) {
      const count = await handleIncomingFile(url);
      if (count > 0) {
        onImport(count);
      }
    }
  });

  return () => {
    subscription.remove();
  };
}
