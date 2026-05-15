import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { StockMovement } from "@workspace/api-client-react";
import { movementTypeLabels } from "@/constants/i18n";

interface MovementCardProps {
  movement: StockMovement;
}

const typeColors: Record<string, { bg: string; icon: keyof typeof Feather.glyphMap }> = {
  stock_in: { bg: "#4A7C4E", icon: "arrow-down-circle" },
  used_in_production: { bg: "#D97706", icon: "tool" },
  sold: { bg: "#5A6E8A", icon: "shopping-bag" },
  damaged: { bg: "#CC2020", icon: "alert-triangle" },
  missing_lost: { bg: "#8A5A2E", icon: "help-circle" },
  returned: { bg: "#6A7A5A", icon: "rotate-ccw" },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function MovementCard({ movement }: MovementCardProps) {
  const colors = useColors();
  const typeInfo = typeColors[movement.type] ?? { bg: colors.primary, icon: "activity" as const };
  const isPositive = movement.type === "stock_in" || movement.type === "returned";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: typeInfo.bg + "25" }]}>
        <Feather name={typeInfo.icon} size={16} color={typeInfo.bg} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.itemName, { color: colors.foreground, fontFamily: "Outfit_600SemiBold" }]} numberOfLines={1}>
          {movement.itemName ?? "Article inconnu"}
        </Text>
        <Text style={[styles.type, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
          {movementTypeLabels[movement.type] ?? movement.type}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.qty, { color: isPositive ? "#4A7C4E" : colors.accent, fontFamily: "Outfit_700Bold" }]}>
          {isPositive ? "+" : "-"}{movement.quantity}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
          {formatTime(movement.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
  },
  type: {
    fontSize: 12,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  qty: {
    fontSize: 16,
  },
  time: {
    fontSize: 11,
  },
});
