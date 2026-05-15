import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { LowStockItem } from "@workspace/api-client-react";

interface AlertCardProps {
  item: LowStockItem;
}

export function AlertCard({ item }: AlertCardProps) {
  const colors = useColors();
  const deficit = item.minThreshold - item.quantity;
  const severity = item.quantity === 0 ? "critical" : deficit / item.minThreshold > 0.5 ? "high" : "medium";
  const severityColor =
    severity === "critical" ? colors.destructive :
    severity === "high" ? colors.accent :
    colors.warning;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: severityColor + "50", borderLeftColor: severityColor, borderLeftWidth: 3 }]}>
      <View style={[styles.iconWrap, { backgroundColor: severityColor + "20" }]}>
        <Feather name="alert-triangle" size={18} color={severityColor} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground, fontFamily: "Outfit_600SemiBold" }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>Actuel</Text>
            <Text style={[styles.statValue, { color: severityColor, fontFamily: "Outfit_700Bold" }]}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>Minimum</Text>
            <Text style={[styles.statValue, { color: colors.mutedForeground, fontFamily: "Outfit_600SemiBold" }]}>
              {item.minThreshold} {item.unit}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>Déficit</Text>
            <Text style={[styles.statValue, { color: severityColor, fontFamily: "Outfit_700Bold" }]}>
              -{deficit.toFixed(1)}
            </Text>
          </View>
        </View>
        {item.branchName ? (
          <View style={styles.branchRow}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.branch, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
              {" "}{item.branchName}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: 15,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stat: {
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
  },
  divider: {
    width: 1,
    height: 24,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  branch: {
    fontSize: 11,
  },
});
