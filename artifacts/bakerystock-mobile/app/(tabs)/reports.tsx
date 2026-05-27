import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useListBranches } from "@workspace/api-client-react";
import { useBranch } from "@/context/BranchContext";
import { useTranslation } from "@/constants/i18n";

interface ReportTypeOption {
  value: string;
  labelFr: string;
  labelEn: string;
  icon: keyof typeof Feather.glyphMap;
  descFr: string;
  descEn: string;
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    value: "daily",
    labelFr: "Rapport Journalier",
    labelEn: "Daily Report",
    icon: "calendar",
    descFr: "Résumé complet de la journée courante.",
    descEn: "Complete summary of the current day.",
  },
  {
    value: "weekly",
    labelFr: "Rapport Hebdomadaire",
    labelEn: "Weekly Report",
    icon: "layers",
    descFr: "Vue d'ensemble sur les 7 derniers jours.",
    descEn: "Overview of the past 7 days.",
  },
  {
    value: "missing",
    labelFr: "Articles Manquants",
    labelEn: "Missing Items",
    icon: "help-circle",
    descFr: "Pertes et écarts d'inventaire signalés.",
    descEn: "Reported stock shrinkages and losses.",
  },
  {
    value: "damaged",
    labelFr: "Articles Endommagés",
    labelEn: "Damaged Items",
    icon: "alert-triangle",
    descFr: "Pertes dues à la casse ou détérioration.",
    descEn: "Losses from breakage or deterioration.",
  },
  {
    value: "branch",
    labelFr: "Activité par Succursale",
    labelEn: "Branch Activity",
    icon: "map-pin",
    descFr: "Détails comparatifs des mouvements.",
    descEn: "Comparative branch movements details.",
  },
];

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const { selectedBranchId } = useBranch();
  const { data: branches } = useListBranches();

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const [reportType, setReportType] = useState("daily");
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [generating, setGenerating] = useState(false);

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN || "localhost:3000";
      const protocol = domain.includes("localhost") ? "http" : "https";
      const baseUrl = `${protocol}://${domain}`;

      const params = new URLSearchParams({
        type: reportType,
        format,
        startDate,
        endDate,
      });

      if (selectedBranchId) {
        params.append("branchId", String(selectedBranchId));
      }

      const reportUrl = `${baseUrl}/api/reports?${params.toString()}`;

      const supported = await Linking.canOpenURL(reportUrl);
      if (supported) {
        await Linking.openURL(reportUrl);
      } else {
        Alert.alert(
          language === "fr" ? "Erreur" : "Error",
          language === "fr"
            ? "Impossible d'ouvrir l'URL du rapport."
            : "Cannot open the report URL."
        );
      }
    } catch (err) {
      Alert.alert(
        language === "fr" ? "Erreur" : "Error",
        language === "fr"
          ? "Une erreur est survenue lors de la génération."
          : "An error occurred during report generation."
      );
    } finally {
      setGenerating(false);
    }
  };

  const selectedBranchName = selectedBranchId
    ? branches?.find((b) => b.id === selectedBranchId)?.name ?? ""
    : language === "fr"
    ? "Toutes les succursales"
    : "All Branches";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Outfit_700Bold" }]}>
          {language === "fr" ? "Rapports" : "Reports"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
          {selectedBranchName}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 90 }]}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Outfit_600SemiBold" }]}>
          {language === "fr" ? "TYPE DE RAPPORT" : "REPORT TYPE"}
        </Text>
        <View style={styles.list}>
          {REPORT_TYPES.map((option) => {
            const isSelected = reportType === option.value;
            const label = language === "fr" ? option.labelFr : option.labelEn;
            const desc = language === "fr" ? option.descFr : option.descEn;

            return (
              <Pressable
                key={option.value}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? colors.primary + "15" : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setReportType(option.value)}
              >
                <View style={[styles.iconBox, { backgroundColor: isSelected ? colors.primary + "20" : colors.secondary }]}>
                  <Feather name={option.icon} size={18} color={isSelected ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: colors.foreground,
                        fontFamily: isSelected ? "Outfit_600SemiBold" : "Outfit_500Medium",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
                    {desc}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Outfit_600SemiBold", marginTop: 14 }]}>
          {language === "fr" ? "PÉRIODE" : "PERIOD"}
        </Text>
        <View style={styles.presets}>
          <Pressable style={[styles.presetBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => handlePreset(0)}>
            <Text style={[styles.presetText, { color: colors.foreground, fontFamily: "Outfit_500Medium" }]}>
              {language === "fr" ? "Aujourd'hui" : "Today"}
            </Text>
          </Pressable>
          <Pressable style={[styles.presetBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => handlePreset(7)}>
            <Text style={[styles.presetText, { color: colors.foreground, fontFamily: "Outfit_500Medium" }]}>
              7 {language === "fr" ? "jours" : "days"}
            </Text>
          </Pressable>
          <Pressable style={[styles.presetBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => handlePreset(30)}>
            <Text style={[styles.presetText, { color: colors.foreground, fontFamily: "Outfit_500Medium" }]}>
              30 {language === "fr" ? "jours" : "days"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground, fontFamily: "Outfit_500Medium" }]}>
              {language === "fr" ? "Date de début" : "Start Date"}
            </Text>
            <View style={[styles.dateInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.dateInput, { color: colors.foreground, fontFamily: "Outfit_500Medium" }]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground, fontFamily: "Outfit_500Medium" }]}>
              {language === "fr" ? "Date de fin" : "End Date"}
            </Text>
            <View style={[styles.dateInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.dateInput, { color: colors.foreground, fontFamily: "Outfit_500Medium" }]}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Outfit_600SemiBold", marginTop: 14 }]}>
          {language === "fr" ? "FORMAT D'EXPORT" : "EXPORT FORMAT"}
        </Text>
        <View style={styles.formats}>
          <Pressable
            style={[
              styles.formatBtn,
              {
                backgroundColor: format === "pdf" ? colors.primary + "15" : colors.card,
                borderColor: format === "pdf" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFormat("pdf")}
          >
            <Feather name="file-text" size={16} color={format === "pdf" ? colors.primary : colors.mutedForeground} />
            <Text
              style={[
                styles.formatText,
                {
                  color: format === "pdf" ? colors.primary : colors.foreground,
                  fontFamily: "Outfit_600SemiBold",
                },
              ]}
            >
              PDF Document
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.formatBtn,
              {
                backgroundColor: format === "csv" ? colors.primary + "15" : colors.card,
                borderColor: format === "csv" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFormat("csv")}
          >
            <Feather name="download" size={16} color={format === "csv" ? colors.primary : colors.mutedForeground} />
            <Text
              style={[
                styles.formatText,
                {
                  color: format === "csv" ? colors.primary : colors.foreground,
                  fontFamily: "Outfit_600SemiBold",
                },
              ]}
            >
              CSV Spreadsheet
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.generateBtn,
            {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="trending-up" size={18} color="#fff" />
              <Text style={[styles.generateBtnText, { fontFamily: "Outfit_700Bold" }]}>
                {language === "fr" ? "Générer le Rapport" : "Generate Report"}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 22 },
  subtitle: { fontSize: 13, marginTop: 2 },
  content: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  list: { gap: 8 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { fontSize: 14 },
  optionDesc: { fontSize: 11, marginTop: 1 },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  presets: { flexDirection: "row", gap: 8, marginBottom: 4 },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: { fontSize: 12 },
  dateRow: { flexDirection: "row", gap: 12 },
  dateLabel: { fontSize: 11, marginBottom: 4 },
  dateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInput: { flex: 1, fontSize: 13, padding: 0 },
  formats: { flexDirection: "row", gap: 10 },
  formatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  formatText: { fontSize: 12 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
  },
  generateBtnText: { color: "#fff", fontSize: 15 },
});
