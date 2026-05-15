import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { InventoryItem } from "@workspace/api-client-react";
import { t } from "@/constants/i18n";

interface InventoryCardProps {
  item: InventoryItem;
}

export function InventoryCard({ item }: InventoryCardProps) {
  const colors = useColors();
  const isLow = item.isLowStock;
  const statusColor = isLow ? colors.destructive : colors.success;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isLow ? colors.destructive + "40" : colors.border }]}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Outfit_600SemiBold" }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Outfit_600SemiBold" }]}>
            {isLow ? t("lowStockLabel") : t("normal")}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.metaItem}>
          <Feather name="layers" size={12} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
            {item.category}
          </Text>
        </View>
        <View style={styles.quantityRow}>
          <Text style={[styles.qty, { color: isLow ? colors.destructive : colors.foreground, fontFamily: "Outfit_700Bold" }]}>
            {item.quantity}
          </Text>
          <Text style={[styles.unit, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
            {" "}{item.unit}
          </Text>
          {isLow && (
            <Text style={[styles.threshold, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
              {" "}/ {item.minThreshold} min
            </Text>
          )}
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 15,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 12,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  qty: {
    fontSize: 20,
  },
  unit: {
    fontSize: 13,
  },
  threshold: {
    fontSize: 12,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  branch: {
    fontSize: 11,
  },
});
