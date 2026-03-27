import { useState, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";

type CoordFormat = "decimal" | "dms" | "garmin";

interface CoordinateInputProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, latitude: number, longitude: number) => void;
}

export function CoordinateInput({ visible, onClose, onSave }: CoordinateInputProps) {
  const colors = useColors();
  const { t, isRTL } = useLanguage();

  const [format, setFormat] = useState<CoordFormat>("decimal");
  const [name, setName] = useState("");

  // Decimal format
  const [decLat, setDecLat] = useState("");
  const [decLon, setDecLon] = useState("");

  // DMS format
  const [dmsLatDeg, setDmsLatDeg] = useState("");
  const [dmsLatMin, setDmsLatMin] = useState("");
  const [dmsLatSec, setDmsLatSec] = useState("");
  const [dmsLatDir, setDmsLatDir] = useState<"N" | "S">("N");
  const [dmsLonDeg, setDmsLonDeg] = useState("");
  const [dmsLonMin, setDmsLonMin] = useState("");
  const [dmsLonSec, setDmsLonSec] = useState("");
  const [dmsLonDir, setDmsLonDir] = useState<"E" | "W">("E");

  // Garmin format
  const [garLatDir, setGarLatDir] = useState<"N" | "S">("N");
  const [garLatDeg, setGarLatDeg] = useState("");
  const [garLatMin, setGarLatMin] = useState("");
  const [garLonDir, setGarLonDir] = useState<"E" | "W">("E");
  const [garLonDeg, setGarLonDeg] = useState("");
  const [garLonMin, setGarLonMin] = useState("");

  const resetFields = useCallback(() => {
    setName("");
    setDecLat("");
    setDecLon("");
    setDmsLatDeg("");
    setDmsLatMin("");
    setDmsLatSec("");
    setDmsLonDeg("");
    setDmsLonMin("");
    setDmsLonSec("");
    setGarLatDeg("");
    setGarLatMin("");
    setGarLonDeg("");
    setGarLonMin("");
  }, []);

  const handleSave = useCallback(() => {
    let lat = 0;
    let lon = 0;

    if (format === "decimal") {
      lat = parseFloat(decLat);
      lon = parseFloat(decLon);
    } else if (format === "dms") {
      const latDeg = parseInt(dmsLatDeg) || 0;
      const latMin = parseInt(dmsLatMin) || 0;
      const latSec = parseFloat(dmsLatSec) || 0;
      lat = latDeg + latMin / 60 + latSec / 3600;
      if (dmsLatDir === "S") lat = -lat;

      const lonDeg = parseInt(dmsLonDeg) || 0;
      const lonMin = parseInt(dmsLonMin) || 0;
      const lonSec = parseFloat(dmsLonSec) || 0;
      lon = lonDeg + lonMin / 60 + lonSec / 3600;
      if (dmsLonDir === "W") lon = -lon;
    } else if (format === "garmin") {
      const latDeg = parseInt(garLatDeg) || 0;
      const latMin = parseFloat(garLatMin) || 0;
      lat = latDeg + latMin / 60;
      if (garLatDir === "S") lat = -lat;

      const lonDeg = parseInt(garLonDeg) || 0;
      const lonMin = parseFloat(garLonMin) || 0;
      lon = lonDeg + lonMin / 60;
      if (garLonDir === "W") lon = -lon;
    }

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return;
    }

    onSave(name.trim() || "Location", lat, lon);
    resetFields();
    onClose();
  }, [format, name, decLat, decLon, dmsLatDeg, dmsLatMin, dmsLatSec, dmsLatDir, dmsLonDeg, dmsLonMin, dmsLonSec, dmsLonDir, garLatDeg, garLatMin, garLatDir, garLonDeg, garLonMin, garLonDir, onSave, onClose, resetFields]);

  const formatTabs: { key: CoordFormat; label: string }[] = [
    { key: "decimal", label: t("decimalDegrees") },
    { key: "dms", label: t("dms") },
    { key: "garmin", label: isRTL ? "قارمن" : "Garmin" },
  ];

  const renderInput = (
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    width?: number
  ) => (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: colors.background,
          color: colors.foreground,
          borderColor: colors.border,
          width: width || "100%",
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType="numeric"
    />
  );

  const renderDirToggle = (
    value: string,
    options: string[],
    onToggle: () => void
  ) => (
    <TouchableOpacity
      style={[styles.dirBtn, { backgroundColor: colors.primary + "30" }]}
      onPress={onToggle}
    >
      <Text style={[styles.dirBtnText, { color: colors.primary }]}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {t("enterCoordinates")}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                  textAlign: isRTL ? "right" : "left",
                  marginBottom: 16,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t("locationName")}
              placeholderTextColor={colors.muted}
            />

            {/* Format Tabs */}
            <View style={styles.tabRow}>
              {formatTabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: format === tab.key ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setFormat(tab.key)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: format === tab.key ? "#fff" : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Decimal Format */}
            {format === "decimal" && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t("latitude")}</Text>
                {renderInput(decLat, setDecLat, t("latExample"))}
                <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 12 }]}>{t("longitude")}</Text>
                {renderInput(decLon, setDecLon, t("lonExample"))}
              </View>
            )}

            {/* DMS Format */}
            {format === "dms" && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t("latitude")}</Text>
                <View style={styles.dmsRow}>
                  {renderDirToggle(dmsLatDir, ["N", "S"], () => setDmsLatDir((d) => (d === "N" ? "S" : "N")))}
                  {renderInput(dmsLatDeg, setDmsLatDeg, t("degrees"), 70)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>°</Text>
                  {renderInput(dmsLatMin, setDmsLatMin, t("minutes"), 70)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>′</Text>
                  {renderInput(dmsLatSec, setDmsLatSec, t("seconds"), 70)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>″</Text>
                </View>
                <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 12 }]}>{t("longitude")}</Text>
                <View style={styles.dmsRow}>
                  {renderDirToggle(dmsLonDir, ["E", "W"], () => setDmsLonDir((d) => (d === "E" ? "W" : "E")))}
                  {renderInput(dmsLonDeg, setDmsLonDeg, t("degrees"), 70)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>°</Text>
                  {renderInput(dmsLonMin, setDmsLonMin, t("minutes"), 70)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>′</Text>
                  {renderInput(dmsLonSec, setDmsLonSec, t("seconds"), 70)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>″</Text>
                </View>
              </View>
            )}

            {/* Garmin Format */}
            {format === "garmin" && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t("latitude")}</Text>
                <View style={styles.dmsRow}>
                  {renderDirToggle(garLatDir, ["N", "S"], () => setGarLatDir((d) => (d === "N" ? "S" : "N")))}
                  {renderInput(garLatDeg, setGarLatDeg, t("degrees"), 80)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>°</Text>
                  {renderInput(garLatMin, setGarLatMin, t("minutes"), 100)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>′</Text>
                </View>
                <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 12 }]}>{t("longitude")}</Text>
                <View style={styles.dmsRow}>
                  {renderDirToggle(garLonDir, ["E", "W"], () => setGarLonDir((d) => (d === "E" ? "W" : "E")))}
                  {renderInput(garLonDeg, setGarLonDeg, t("degrees"), 80)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>°</Text>
                  {renderInput(garLonMin, setGarLonMin, t("minutes"), 100)}
                  <Text style={[styles.dmsSymbol, { color: colors.muted }]}>′</Text>
                </View>
              </View>
            )}

            {/* Save Button */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => { resetFields(); onClose(); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  {t("save")}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalHeaderRTL: {
    flexDirection: "row-reverse",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  dmsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  dmsSymbol: {
    fontSize: 18,
    fontWeight: "600",
  },
  dirBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dirBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
