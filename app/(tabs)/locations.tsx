import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Location from "expo-location";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import {
  getLocations,
  saveLocation,
  deleteLocation,
  updateLocation,
  setAllLocations,
  setSelectedLocation,
  generateId,
  calculateDistance,
  formatDistance,
  type SavedLocation,
} from "@/lib/location-store";
import { exportToGPX, parseFile } from "@/lib/file-utils";
import { CoordinateInput } from "@/components/coordinate-input";

export default function LocationsScreen() {
  const colors = useColors();
  const { t, language, isRTL } = useLanguage();
  const router = useRouter();
  const isArabic = language === "ar";

  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<SavedLocation | null>(null);
  const [editName, setEditName] = useState("");
  const [showCoordInput, setShowCoordInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get current location for distance calculation
  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (loc) => {
          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    })();

    return () => {
      if (subscriber) subscriber.remove();
    };
  }, []);

  const loadLocations = useCallback(async () => {
    const locs = await getLocations();
    setLocations([...locs]);
  }, []);

  useEffect(() => {
    loadLocations();
    const interval = setInterval(loadLocations, 1000);
    return () => clearInterval(interval);
  }, [loadLocations]);

  // Filter and sort locations by distance (nearest first)
  const filteredLocations = useMemo(() => {
    let filtered = locations;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`.includes(query)
      );
    }

    // Sort by distance if current location is available
    if (currentLocation) {
      filtered = [...filtered].sort((a, b) => {
        const distA = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          a.latitude,
          a.longitude
        );
        const distB = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          b.latitude,
          b.longitude
        );
        return distA - distB;
      });
    }

    return filtered;
  }, [locations, searchQuery, currentLocation]);

  // Calculate distance for a location
  const getDistanceText = useCallback(
    (loc: SavedLocation): string | null => {
      if (!currentLocation) return null;
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        loc.latitude,
        loc.longitude
      );
      return formatDistance(dist, isArabic);
    },
    [currentLocation, isArabic]
  );

  const handleDelete = useCallback(
    (loc: SavedLocation) => {
      Alert.alert(t("delete"), t("deleteConfirm"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            await deleteLocation(loc.id);
            loadLocations();
          },
        },
      ]);
    },
    [t, loadLocations]
  );

  const handleEdit = useCallback((loc: SavedLocation) => {
    setEditingLoc(loc);
    setEditName(loc.name);
    setShowEditModal(true);
  }, []);

  const confirmEdit = useCallback(async () => {
    if (!editingLoc) return;
    await updateLocation(editingLoc.id, { name: editName.trim() || editingLoc.name });
    setShowEditModal(false);
    setEditingLoc(null);
    loadLocations();
  }, [editingLoc, editName, loadLocations]);

  // Simple share: name + decimal coordinates only
  const handleShare = useCallback(
    async (loc: SavedLocation) => {
      const message = `${loc.name}\n${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
      try {
        await Share.share({ message });
      } catch {}
    },
    []
  );

  const handleCopy = useCallback(
    async (loc: SavedLocation) => {
      const text = `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
      await Clipboard.setStringAsync(text);
      Alert.alert(t("copied"), t("coordinatesCopied"));
    },
    [t]
  );

  // Navigate to location - instant
  const handleNavigate = useCallback(
    async (loc: SavedLocation) => {
      await setSelectedLocation(loc.id);
      router.navigate("/(tabs)/compass");
    },
    [router]
  );

  const handleExportGPX = useCallback(async () => {
    if (locations.length === 0) return;
    const gpxContent = exportToGPX(locations);
    if (Platform.OS === "web") {
      const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "arrow_gps_locations.gpx";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const fileUri = FileSystem.documentDirectory + "arrow_gps_locations.gpx";
      await FileSystem.writeAsStringAsync(fileUri, gpxContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/gpx+xml",
        dialogTitle: "Export GPX",
      });
    }
  }, [locations]);

  const handleImportFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      let content: string;

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const parsedLocations = parseFile(content, asset.name || "file.gpx");

      if (parsedLocations.length === 0) {
        Alert.alert(
          t("importError"),
          t("noLocationsInFile")
        );
        return;
      }

      const existingLocations = await getLocations();
      const allLocations = [...existingLocations, ...parsedLocations];
      await setAllLocations(allLocations);
      loadLocations();

      Alert.alert(
        t("importFile"),
        t("locationsImported", { count: String(parsedLocations.length) })
      );
    } catch (err) {
      console.error("Import error:", err);
    }
  }, [loadLocations, t, isArabic]);

  const handleAddLocation = useCallback(() => {
    setShowCoordInput(true);
  }, []);

  const handleCoordSave = useCallback(
    async (coordName: string, lat: number, lon: number) => {
      let name = coordName.trim();
      if (!name) {
        const now = new Date();
        const dateStr = now.toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const timeStr = now.toLocaleTimeString(isArabic ? "ar-SA" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const prefix = t("autoNamePrefix");
        name = `${prefix} ${dateStr} ${timeStr}`;
      }
      await saveLocation({
        id: generateId(),
        name,
        latitude: lat,
        longitude: lon,
        createdAt: Date.now(),
      });
      loadLocations();
    },
    [loadLocations, isArabic]
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedLocation }) => {
      const distText = getDistanceText(item);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleNavigate(item)}
        >
          <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
              <View style={[styles.cardTitleRow, isRTL && styles.cardTitleRowRTL]}>
                <View style={[styles.pinIcon, { backgroundColor: colors.primary + "30" }]}>
                  <MaterialIcons name="place" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={[styles.nameDistRow, isRTL && styles.nameDistRowRTL]}>
                    <Text
                      style={[styles.locationName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {distText && (
                      <Text style={[styles.distanceBadge, { color: colors.primary }]}>
                        {distText}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <MaterialIcons name="navigation" size={22} color={colors.primary} />
            </View>

            <TouchableOpacity
              onPress={() => handleCopy(item)}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.coordsRow, isRTL && styles.coordsRowRTL]}>
                <MaterialIcons name="content-copy" size={14} color={colors.muted} />
                <Text style={[styles.coordsText, { color: colors.muted }]}>
                  {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.actionRow, isRTL && styles.actionRowRTL, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionBtn, isRTL && styles.actionBtnRTL]}
                onPress={() => handleEdit(item)}
              >
                <MaterialIcons name="edit" size={16} color={colors.muted} />
                <Text style={[styles.actionText, { color: colors.muted }]}>{t("edit")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, isRTL && styles.actionBtnRTL]}
                onPress={() => handleShare(item)}
              >
                <MaterialIcons name="share" size={16} color={colors.muted} />
                <Text style={[styles.actionText, { color: colors.muted }]}>{t("shareCoordinate")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, isRTL && styles.actionBtnRTL]}
                onPress={() => handleDelete(item)}
              >
                <MaterialIcons name="delete" size={16} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>{t("delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, isRTL, t, handleDelete, handleEdit, handleShare, handleCopy, handleNavigate, getDistanceText]
  );

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("savedLocations")}
          </Text>
          <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>
            <TouchableOpacity onPress={handleAddLocation} style={styles.headerIconBtn}>
              <MaterialIcons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExportGPX} style={styles.headerIconBtn}>
              <MaterialIcons name="upload" size={28} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleImportFile} style={styles.headerIconBtn}>
              <MaterialIcons name="download" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={20} color={colors.muted} />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.foreground,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            placeholder={t("searchLocations")}
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Location List */}
        <FlatList
          data={filteredLocations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="place" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {t("noLocations")}
              </Text>
            </View>
          }
        />

        {/* Edit Modal */}
        <Modal visible={showEditModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {t("edit")}
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder={t("locationName")}
                placeholderTextColor={colors.muted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={confirmEdit}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>
                    {t("cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={confirmEdit}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    {t("save")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Coordinate Input Modal */}
        <CoordinateInput
          visible={showCoordInput}
          onClose={() => setShowCoordInput(false)}
          onSave={handleCoordSave}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionsRTL: {
    flexDirection: "row-reverse",
  },
  headerIconBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  locationCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardHeaderRTL: {
    flexDirection: "row-reverse",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  cardTitleRowRTL: {
    flexDirection: "row-reverse",
  },
  nameDistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameDistRowRTL: {
    flexDirection: "row-reverse",
  },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locationName: {
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  distanceBadge: {
    fontSize: 13,
    fontWeight: "700",
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingLeft: 50,
  },
  coordsRowRTL: {
    flexDirection: "row-reverse",
    paddingLeft: 0,
    paddingRight: 50,
  },
  coordsText: {
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  actionRowRTL: {
    flexDirection: "row-reverse",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnRTL: {
    flexDirection: "row-reverse",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
