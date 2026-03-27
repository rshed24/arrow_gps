import { useEffect, useState, useCallback, useRef } from "react";
import { Text, View, StyleSheet, Image, Platform, Dimensions, Alert } from "react-native";
import * as Location from "expo-location";
import { Magnetometer, DeviceMotion } from "expo-sensors";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useKeepAwake } from "expo-keep-awake";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import Svg, { Circle, Line, Text as SvgText, Polygon } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import {
  getLocations,
  getSelectedLocation,
  setSelectedLocation,
  calculateDistance,
  calculateBearing,
  formatDistance,
  getCardinalDirection,
  type SavedLocation,
} from "@/lib/location-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 40, 340);
const COMPASS_CENTER = COMPASS_SIZE / 2;
const COMPASS_RADIUS = COMPASS_SIZE / 2 - 10;

const LOW_PASS_ALPHA = 0.15;
const ARRIVAL_DISTANCE = 6; // 6 meters (~20 feet)

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function lerpAngle(from: number, to: number, alpha: number): number {
  let diff = normalizeAngle(to - from);
  if (diff > 180) diff -= 360;
  return normalizeAngle(from + diff * alpha);
}

export default function CompassScreen() {
  useKeepAwake();
  const colors = useColors();
  const { t, language, isRTL } = useLanguage();
  const isArabic = language === "ar";

  const [heading, setHeading] = useState(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<SavedLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [bearing, setBearing] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  const headingRef = useRef(0);
  const lastMagHeading = useRef(0);
  const prevHeadingRef = useRef(0);
  const arrivedRef = useRef(false);
  const arrowRotation = useSharedValue(0);
  const compassRotation = useSharedValue(0);

  // Load selected location
  useEffect(() => {
    const loadSelected = async () => {
      const selectedId = await getSelectedLocation();
      if (selectedId) {
        const locations = await getLocations();
        const found = locations.find((l) => l.id === selectedId);
        if (found) {
          setSelectedLoc(found);
        } else {
          setSelectedLoc(null);
        }
      } else {
        setSelectedLoc(null);
      }
    };
    loadSelected();
    const interval = setInterval(loadSelected, 500);
    return () => clearInterval(interval);
  }, []);

  // Haptic feedback on compass movement
  useEffect(() => {
    if (Platform.OS === "web") return;

    const diff = Math.abs(normalizeAngle(heading) - normalizeAngle(prevHeadingRef.current));
    const actualDiff = diff > 180 ? 360 - diff : diff;

    // Trigger haptic every ~15 degrees of rotation
    if (actualDiff > 15) {
      prevHeadingRef.current = heading;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [heading]);

  // Arrival detection - 6 meters (20 feet)
  useEffect(() => {
    if (distance === null || !selectedLoc) {
      if (arrivedRef.current) {
        arrivedRef.current = false;
        setHasArrived(false);
      }
      return;
    }

    if (distance <= ARRIVAL_DISTANCE && !arrivedRef.current) {
      arrivedRef.current = true;
      setHasArrived(true);

      // Haptic notification
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      // Speech notification
      const speechText = isArabic
        ? `تم الوصول إلى ${selectedLoc.name}`
        : `Arrived at ${selectedLoc.name}`;

      if (Platform.OS !== "web") {
        Speech.speak(speechText, {
          language: isArabic ? "ar-SA" : "en-US",
          rate: 0.9,
        });
      }
    } else if (distance > ARRIVAL_DISTANCE + 5 && arrivedRef.current) {
      // Reset arrival when user moves away (with 5m hysteresis)
      arrivedRef.current = false;
      setHasArrived(false);
    }
  }, [distance, selectedLoc, isArabic]);

  // Compass heading using DeviceMotion + Magnetometer fallback
  useEffect(() => {
    if (Platform.OS === "web") return;

    let magSub: { remove: () => void } | null = null;
    let motionSub: { remove: () => void } | null = null;

    const startSensors = async () => {
      try {
        const isAvailable = await DeviceMotion.isAvailableAsync();
        if (isAvailable) {
          DeviceMotion.setUpdateInterval(16);
          motionSub = DeviceMotion.addListener((data) => {
            if (data.rotation) {
              let alpha = data.rotation.alpha * (180 / Math.PI);
              let compassHeading = normalizeAngle(-alpha);
              const smoothed = lerpAngle(headingRef.current, compassHeading, LOW_PASS_ALPHA);
              headingRef.current = smoothed;
              setHeading(smoothed);
            }
          });
          return;
        }
      } catch {}

      try {
        Magnetometer.setUpdateInterval(32);
        magSub = Magnetometer.addListener((data) => {
          const { x, y } = data;
          let angle = Math.atan2(y, x) * (180 / Math.PI);
          let compassHeading = normalizeAngle(90 - angle);
          const smoothed = lerpAngle(headingRef.current, compassHeading, LOW_PASS_ALPHA);
          headingRef.current = smoothed;
          lastMagHeading.current = smoothed;
          setHeading(smoothed);
        });
      } catch {}
    };

    startSensors();

    return () => {
      if (motionSub) motionSub.remove();
      if (magSub) magSub.remove();
    };
  }, []);

  // Location subscription
  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500,
          distanceInterval: 0,
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    })();

    return () => {
      if (subscriber) subscriber.remove();
    };
  }, []);

  // Calculate bearing and distance
  useEffect(() => {
    if (!location || !selectedLoc) {
      setDistance(null);
      return;
    }

    const dist = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      selectedLoc.latitude,
      selectedLoc.longitude
    );
    setDistance(dist);

    const bear = calculateBearing(
      location.coords.latitude,
      location.coords.longitude,
      selectedLoc.latitude,
      selectedLoc.longitude
    );
    setBearing(bear);
  }, [location, selectedLoc]);

  // Animate arrow
  useEffect(() => {
    if (selectedLoc) {
      const relativeAngle = normalizeAngle(bearing - heading);
      arrowRotation.value = withTiming(relativeAngle, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });
    } else {
      arrowRotation.value = withTiming(0, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [heading, bearing, selectedLoc]);

  // Animate compass
  useEffect(() => {
    compassRotation.value = withTiming(-heading, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [heading]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${compassRotation.value}deg` }],
  }));

  const speed = location?.coords.speed ?? 0;
  const speedKmh = Math.max(0, (speed ?? 0) * 3.6);
  const altitude = location?.coords.altitude ?? 0;

  // Cardinal letters: Arabic when language is Arabic, English otherwise
  const compassLabels = [
    { angle: 0, label: isArabic ? "ش" : "N" },
    { angle: 30, label: "30" },
    { angle: 60, label: "60" },
    { angle: 90, label: isArabic ? "شر" : "E" },
    { angle: 120, label: "120" },
    { angle: 150, label: "150" },
    { angle: 180, label: isArabic ? "ج" : "S" },
    { angle: 210, label: "210" },
    { angle: 240, label: "240" },
    { angle: 270, label: isArabic ? "غ" : "W" },
    { angle: 300, label: "300" },
    { angle: 330, label: "330" },
  ];

  const renderCompassRing = () => {
    const ticks = [];
    const isDark = colors.background !== "#F5F5F5";
    const tickColor = isDark ? "#ECEDEE" : "#11181C";
    const ringBg = isDark ? "#1B2838" : "#FFFFFF";
    const outerRingColor = isDark ? "#2A3A4E" : "#E5E7EB";

    ticks.push(
      <Circle
        key="bg"
        cx={COMPASS_CENTER}
        cy={COMPASS_CENTER}
        r={COMPASS_RADIUS}
        fill={ringBg}
        stroke={outerRingColor}
        strokeWidth={2}
      />
    );

    ticks.push(
      <Circle
        key="inner"
        cx={COMPASS_CENTER}
        cy={COMPASS_CENTER}
        r={COMPASS_RADIUS - 35}
        fill="transparent"
        stroke={outerRingColor}
        strokeWidth={1}
      />
    );

    for (let i = 0; i < 360; i += 2) {
      const isMajor = i % 30 === 0;
      const isMedium = i % 10 === 0;
      const outerR = COMPASS_RADIUS - 2;
      const innerR = isMajor ? COMPASS_RADIUS - 20 : isMedium ? COMPASS_RADIUS - 14 : COMPASS_RADIUS - 8;
      const rad = (i * Math.PI) / 180;
      const x1 = COMPASS_CENTER + outerR * Math.sin(rad);
      const y1 = COMPASS_CENTER - outerR * Math.cos(rad);
      const x2 = COMPASS_CENTER + innerR * Math.sin(rad);
      const y2 = COMPASS_CENTER - innerR * Math.cos(rad);

      ticks.push(
        <Line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={tickColor}
          strokeWidth={isMajor ? 2.5 : isMedium ? 1.5 : 0.8}
        />
      );
    }

    compassLabels.forEach(({ angle, label }) => {
      const labelR = COMPASS_RADIUS - 28;
      const rad = (angle * Math.PI) / 180;
      const x = COMPASS_CENTER + labelR * Math.sin(rad);
      const y = COMPASS_CENTER - labelR * Math.cos(rad);
      const isCardinal = angle % 90 === 0;

      ticks.push(
        <SvgText
          key={`label-${angle}`}
          x={x}
          y={y + 5}
          textAnchor="middle"
          fontSize={isCardinal ? 18 : 13}
          fontWeight={isCardinal ? "900" : "600"}
          fill={angle === 0 ? "#EF4444" : isCardinal ? (isDark ? "#FFFFFF" : "#000000") : tickColor}
        >
          {label}
        </SvgText>
      );
    });

    return ticks;
  };

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Arrival Banner */}
        {hasArrived && (
          <View style={styles.arrivalBanner}>
            <Text style={styles.arrivalText}>{t("arrived")}</Text>
          </View>
        )}

        {/* Top Info Cards */}
        <View style={styles.topCards}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{t("speed")}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {speedKmh.toFixed(1)}
            </Text>
            <Text style={[styles.infoUnit, { color: colors.muted }]}>{t("kmh")}</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{t("distance")}</Text>
            <Text style={[styles.infoValue, { color: hasArrived ? colors.success : colors.primary }]}>
              {distance !== null ? formatDistance(distance, isArabic) : "---"}
            </Text>
          </View>
        </View>

        {/* Compass */}
        <View style={styles.compassContainer}>
          {/* North indicator (fixed at top) */}
          <View style={styles.northIndicator}>
            <Svg width={16} height={12}>
              <Polygon points="8,0 0,12 16,12" fill="#4FC3F7" />
            </Svg>
          </View>

          <Animated.View style={[styles.compassRing, compassStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              {renderCompassRing()}
            </Svg>
          </Animated.View>

          {/* Arrow overlay */}
          <Animated.View style={[styles.arrowContainer, arrowStyle]}>
            <Image
              source={require("@/assets/images/arrow.png")}
              style={styles.arrowImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Heading Display */}
        <Text style={[styles.headingText, { color: colors.foreground }]}>
          {Math.round(normalizeAngle(heading))}°
        </Text>
        <Text style={[styles.directionText, { color: colors.muted }]}>
          {getCardinalDirection(heading, isArabic)}
        </Text>

        {/* Bottom Info Cards */}
        <View style={styles.bottomCards}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{t("destination")}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
              {selectedLoc ? selectedLoc.name : t("noDestination")}
            </Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{t("altitude")}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {Math.round(altitude)} {t("m")}
            </Text>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  arrivalBanner: {
    backgroundColor: "#22C55E",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  arrivalText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  topCards: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
    paddingHorizontal: 4,
    width: "100%",
  },
  bottomCards: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
    width: "100%",
    marginTop: 8,
  },
  infoCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  infoUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  compassRing: {
    position: "absolute",
  },
  northIndicator: {
    position: "absolute",
    top: -6,
    zIndex: 10,
  },
  arrowContainer: {
    position: "absolute",
    width: COMPASS_SIZE * 0.55,
    height: COMPASS_SIZE * 0.55,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowImage: {
    width: "100%",
    height: "100%",
  },
  headingText: {
    fontSize: 40,
    fontWeight: "800",
    marginTop: 4,
  },
  directionText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
});
