import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetDashboardSummary, useListStockMovements } from "@workspace/api-client-react";
import { useBranch } from "@/context/BranchContext";
import { BranchSelector } from "@/components/BranchSelector";
import { StatCard } from "@/components/StatCard";
import { MovementCard } from "@/components/MovementCard";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/constants/i18n";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedBranchId } = useBranch();
  const isWeb = Platform.OS === "web";

  const {
    data: summary,
    isLoading: loadingDash,
    refetch: refetchDash,
    isRefetching: refreshingDash,
  } = useGetDashboardSummary(
    selectedBranchId ? { branchId: selectedBranchId } : {},
    { query: { refetchInterval: 30000 } }
  );

  const {
    data: movements,
    isLoading: loadingMoves,
    refetch: refetchMoves,
    isRefetching: refreshingMoves,
  } = useListStockMovements(
    { branchId: selectedBranchId ?? undefined, limit: 10 },
    { query: { refetchInterval: 30000 } }
  );

  const isRefreshing = refreshingDash || refreshingMoves;

  const onRefresh = useCallback(() => {
    refetchDash();
    refetchMoves();
  }, [refetchDash, refetchMoves]);

  const isLoading = loadingDash && loadingMoves;

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.appName, { color: colors.primary, fontFamily: "Outfit_700Bold" }]}>
              BakeryStock
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
              {t("dashboard")}
            </Text>
          </View>
          <BranchSelector />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statRow}>
                <StatCard
                  label={t("totalItems")}
                  value={summary?.totalItems ?? 0}
                  icon="package"
                  tint="primary"
                />
                <StatCard
                  label={t("lowStock")}
                  value={summary?.lowStockItems ?? 0}
                  icon="alert-triangle"
                  tint={summary && summary.lowStockItems > 0 ? "destructive" : "primary"}
                />
              </View>
              <View style={styles.statRow}>
                <StatCard
                  label={t("movementsToday")}
                  value={summary?.totalMovementsToday ?? 0}
                  icon="activity"
                  tint="primary"
                />
                <StatCard
                  label={t("damagedToday")}
                  value={summary?.damagedToday ?? 0}
                  icon="x-circle"
                  tint={summary && summary.damagedToday > 0 ? "accent" : "primary"}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Outfit_700Bold" }]}>
                {t("recentMovements")}
              </Text>
              {loadingMoves ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
              ) : movements && movements.length > 0 ? (
                movements.slice(0, 8).map((m) => (
                  <MovementCard key={m.id} movement={m} />
                ))
              ) : (
                <EmptyState
                  icon="activity"
                  title={t("noMovements")}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appName: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  content: {
    paddingTop: 16,
    gap: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  statsGrid: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  section: {
    marginTop: 8,
    gap: 0,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
});
