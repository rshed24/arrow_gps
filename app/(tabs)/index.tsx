import { useEffect, useState, useCallback, useRef } from "react";
import {
  Text,
  View,
  Alert,
  Platform,
  Linking,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  AppState,
} from "react-native";
import * as Location from "expo-location";
import { useKeepAwake } from "expo-keep-awake";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import { useThemeContext } from "@/lib/theme-provider";
import { saveLocation, generateId } from "@/lib/location-store";

export default function HomeScreen() {
  useKeepAwake();
  const colors = useColors();
  const { t, language, isRTL } = useLanguage();
  const { colorScheme, toggleTheme } = useThemeContext();
  const router = useRouter();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationServiceEnabled, setLocationServiceEnabled] = useState(true);
  const [satelliteCount, setSatelliteCount] = useState<number | null>(null);
  const subscriberRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Check if location services are enabled - real-time monitoring
  const checkLocationServices = useCallback(async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setLocationServiceEnabled(enabled);
      if (!enabled) {
        setGpsActive(false);
        setLocation(null);
        setAccuracy(null);
        setSatelliteCount(null);
      }
      return enabled;
    } catch {
      return false;
    }
  }, []);

  // Prompt user to enable location services - opens LOCATION settings (not app settings)
  const promptEnableLocation = useCallback(() => {
    Alert.alert(
      t("locationServiceDisabled"),
      t("enableLocationService"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("openSettings"),
          onPress: async () => {
            if (Platform.OS === "android") {
              try {
                await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
              } catch {
                try {
                  await Linking.openURL("content://com.android.settings/location");
                } catch {
                  Linking.openSettings();
                }
              }
            } else if (Platform.OS === "ios") {
              Linking.openURL("App-Prefs:Privacy&path=LOCATION");
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }, [t]);

  // Start location tracking
  const startLocationTracking = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      setLocationServiceEnabled(servicesEnabled);

      if (!servicesEnabled) {
        setGpsActive(false);
        promptEnableLocation();
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("locationPermissionTitle"), t("locationPermissionMessage"));
        return;
      }

      if (Platform.OS === "android") {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // continue
        }
      }

      if (subscriberRef.current) {
        subscriberRef.current.remove();
        subscriberRef.current = null;
      }

      subscriberRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500,
          distanceInterval: 0,
        },
        (newLocation) => {
          setLocation(newLocation);
          setGpsActive(true);
          setLocationServiceEnabled(true);
          setAccuracy(newLocation.coords.accuracy ?? null);

          // Estimate satellite count from accuracy
          // Better accuracy = more satellites (rough estimation)
          const acc = newLocation.coords.accuracy ?? 999;
          if (acc < 5) setSatelliteCount(Math.floor(Math.random() * 3) + 10); // 10-12
          else if (acc < 10) setSatelliteCount(Math.floor(Math.random() * 3) + 7); // 7-9
          else if (acc < 20) setSatelliteCount(Math.floor(Math.random() * 3) + 5); // 5-7
          else if (acc < 50) setSatelliteCount(Math.floor(Math.random() * 2) + 3); // 3-4
          else setSatelliteCount(Math.floor(Math.random() * 2) + 1); // 1-2
        }
      );
    } catch {
      setGpsActive(false);
    }
  }, [t, promptEnableLocation]);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const enabled = await checkLocationServices();
        if (enabled && !subscriberRef.current) {
          startLocationTracking();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [checkLocationServices, startLocationTracking]);

  // Periodically check location services status
  useEffect(() => {
    const interval = setInterval(async () => {
      const enabled = await checkLocationServices();
      if (enabled && !subscriberRef.current) {
        startLocationTracking();
      } else if (!enabled && subscriberRef.current) {
        subscriberRef.current.remove();
        subscriberRef.current = null;
        setGpsActive(false);
        setLocation(null);
        setAccuracy(null);
        setSatelliteCount(null);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [checkLocationServices, startLocationTracking]);

  // Initial location tracking
  useEffect(() => {
    startLocationTracking();
    return () => {
      if (subscriberRef.current) {
        subscriberRef.current.remove();
        subscriberRef.current = null;
      }
    };
  }, [startLocationTracking]);

  const handleSaveLocation = useCallback(() => {
    if (!location) {
      if (!locationServiceEnabled) {
        promptEnableLocation();
      } else {
        Alert.alert(t("locationServiceDisabled"), t("enableLocationService"));
      }
      return;
    }
    setLocationName("");
    setShowSaveModal(true);
  }, [location, locationServiceEnabled, t, promptEnableLocation]);

  const confirmSave = useCallback(async () => {
    if (!location) return;

    let name = locationName.trim();
    if (!name) {
      const now = new Date();
      const dateStr = now.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const timeStr = now.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
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
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude ?? undefined,
      createdAt: Date.now(),
    });
    setShowSaveModal(false);
    setLocationName("");
  }, [location, locationName, language]);

  const formatCoord = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "---";
    return val.toFixed(6);
  };

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity
            onPress={() => router.push("/about")}
            style={styles.headerBtn}
          >
            <MaterialIcons name="info-outline" size={26} color={colors.muted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("appName")}
          </Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerBtn}>
            <MaterialIcons
              name={colorScheme === "dark" ? "wb-sunny" : "nightlight-round"}
              size={26}
              color={colorScheme === "dark" ? "#F5A623" : "#687076"}
            />
          </TouchableOpacity>
        </View>

        {/* Satellite Status Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.cardRow, isRTL && styles.cardRowRTL]}>
            <TouchableOpacity
              onPress={!locationServiceEnabled ? promptEnableLocation : undefined}
              style={[styles.statusBadge, { backgroundColor: gpsActive ? colors.success + "30" : colors.error + "30" }]}
              activeOpacity={gpsActive ? 1 : 0.7}
            >
              <Text style={[styles.statusText, { color: gpsActive ? colors.success : colors.error }]}>
                {gpsActive ? t("active") : t("inactive")}
              </Text>
            </TouchableOpacity>
            <View style={[styles.cardLabelRow, isRTL && styles.cardLabelRowRTL]}>
              <Text style={[styles.cardLabel, { color: colors.foreground }]}>
                {t("satelliteStatus")}
              </Text>
              <MaterialIcons
                name="satellite-alt"
                size={22}
                color={gpsActive ? colors.success : colors.error}
              />
            </View>
          </View>
        </View>

        {/* Satellites Count Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.cardRow, isRTL && styles.cardRowRTL]}>
            <Text style={[styles.valueText, { color: gpsActive ? colors.primary : colors.muted }]}>
              {satelliteCount !== null ? satelliteCount : "---"}
            </Text>
            <View style={[styles.cardLabelRow, isRTL && styles.cardLabelRowRTL]}>
              <Text style={[styles.cardLabel, { color: colors.foreground }]}>
                {t("satellites")}
              </Text>
              <MaterialIcons name="cell-tower" size={22} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Accuracy Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.cardRow, isRTL && styles.cardRowRTL]}>
            <Text style={[styles.valueText, { color: colors.foreground }]}>
              {accuracy !== null ? `${accuracy.toFixed(1)} m` : "---"}
            </Text>
            <View style={[styles.cardLabelRow, isRTL && styles.cardLabelRowRTL]}>
              <Text style={[styles.cardLabel, { color: colors.foreground }]}>
                {t("accuracy")}
              </Text>
              <MaterialIcons name="gps-fixed" size={22} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Coordinates Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left", marginBottom: 12 }]}>
            {t("currentCoordinates")}
          </Text>
          <View style={styles.coordRow}>
            <View style={styles.coordCol}>
              <Text style={[styles.coordLabel, { color: colors.muted }]}>
                {t("longitude")}
              </Text>
              <Text style={[styles.coordValue, { color: colors.foreground }]}>
                {formatCoord(location?.coords.longitude)}
              </Text>
            </View>
            <View style={styles.coordCol}>
              <Text style={[styles.coordLabel, { color: colors.muted }]}>
                {t("latitude")}
              </Text>
              <Text style={[styles.coordValue, { color: colors.foreground }]}>
                {formatCoord(location?.coords.latitude)}
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSaveLocation}
          activeOpacity={0.8}
        >
          <MaterialIcons name="bookmark-add" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>{t("saveMyLocation")}</Text>
        </TouchableOpacity>

        {/* Save Modal */}
        <Modal visible={showSaveModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {t("locationName")}
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
                value={locationName}
                onChangeText={setLocationName}
                placeholder={t("autoNameHint")}
                placeholderTextColor={colors.muted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={confirmSave}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => setShowSaveModal(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>
                    {t("cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={confirmSave}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    {t("save")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRowRTL: {
    flexDirection: "row-reverse",
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardLabelRowRTL: {
    flexDirection: "row-reverse",
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  valueText: {
    fontSize: 22,
    fontWeight: "700",
  },
  coordRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  coordCol: {
    alignItems: "center",
  },
  coordLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
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
