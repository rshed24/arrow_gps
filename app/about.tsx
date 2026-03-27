import { Text, View, StyleSheet, TouchableOpacity, Image, Linking, Share, Platform } from "react-native";
import * as StoreReview from "expo-store-review";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";

export default function AboutScreen() {
  const colors = useColors();
  const { t, language, isRTL, toggleLanguage } = useLanguage();
  const router = useRouter();

  const handleVisitWebsite = () => {
    Linking.openURL("https://desertsa.com");
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: t("shareAppMessage"),
      });
    } catch {}
  };

  const handleRateApp = async () => {
    if (Platform.OS === "web") return;
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      }
    } catch {}
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("aboutApp")}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <MaterialIcons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={26}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {/* App Icon */}
        <View style={styles.iconContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </View>

        {/* App Name & Version */}
        <Text style={[styles.appName, { color: colors.foreground }]}>
          {t("appName")}
        </Text>
        <Text style={[styles.version, { color: colors.muted }]}>
          {t("version")}
        </Text>

        {/* Developed By */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.developedBy, { color: colors.foreground }]}>
            {t("developedBy")}
          </Text>
        </View>

        {/* Visit Website Button */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleVisitWebsite}
          activeOpacity={0.8}
        >
          <MaterialIcons name="language" size={22} color="#fff" />
          <Text style={styles.primaryButtonText}>{t("visitWebsite")}</Text>
        </TouchableOpacity>

        {/* Rate & Share Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleRateApp}
            activeOpacity={0.7}
          >
            <MaterialIcons name="star" size={20} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              {t("rateApp")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleShareApp}
            activeOpacity={0.7}
          >
            <MaterialIcons name="share" size={20} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              {t("shareApp")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language Switcher */}
        <View style={[styles.languageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.languageRow, isRTL && styles.languageRowRTL]}>
            <TouchableOpacity
              style={[
                styles.langBadge,
                { backgroundColor: colors.primary + "30" },
              ]}
              onPress={toggleLanguage}
            >
              <Text style={[styles.langBadgeText, { color: colors.primary }]}>
                {language === "ar" ? "العربية" : "English"}
              </Text>
            </TouchableOpacity>
            <View style={[styles.languageLabelRow, isRTL && styles.languageLabelRowRTL]}>
              <Text style={[styles.languageLabel, { color: colors.foreground }]}>
                {t("language")}
              </Text>
              <MaterialIcons name="translate" size={22} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={{ flex: 1 }} />
        <Text style={[styles.footer, { color: colors.muted }]}>
          desertsa.com
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#F5A623",
    marginBottom: 16,
  },
  iconContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  appIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  version: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  developedBy: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  languageCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  languageRowRTL: {
    flexDirection: "row-reverse",
  },
  languageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  languageLabelRowRTL: {
    flexDirection: "row-reverse",
  },
  languageLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  langBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  langBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    fontSize: 14,
    paddingBottom: 20,
  },
});
