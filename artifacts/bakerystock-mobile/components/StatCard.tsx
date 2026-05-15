import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  tint?: "primary" | "accent" | "destructive" | "success";
  subtitle?: string;
}

export function StatCard({ label, value, icon, tint = "primary", subtitle }: StatCardProps) {
  const colors = useColors();

  const tintColor =
    tint === "accent" ? colors.accent :
    tint === "destructive" ? colors.destructive :
    tint === "success" ? colors.success :
    colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: tintColor + "20" }]}>
        <Feather name={icon} size={18} color={tintColor} />
      </View>
      <Text style={[styles.value, { color: colors.foreground, fontFamily: "Outfit_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]} numberOfLines={1}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: tintColor, fontFamily: "Outfit_500Medium" }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: {
    fontSize: 24,
    lineHeight: 28,
  },
  label: {
    fontSize: 11,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500" as const,
  },
});
