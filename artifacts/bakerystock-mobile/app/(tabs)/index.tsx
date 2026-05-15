import { Feather } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
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
import { useOfflineQueue } from "@/context/OfflineQueueContext";
import { BranchSelector } from "@/components/BranchSelector";
import { StatCard } from "@/components/StatCard";
import { MovementCard } from "@/components/MovementCard";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/constants/i18n";

function formatLastSynced(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedBranchId } = useBranch();
  const { isOnline, pendingCount, lastSyncedAt, isSyncing, syncNow } = useOfflineQueue();
  const isWeb = Platform.OS === "web";

  const {
    data: summary,
    isLoading: loadingDash,
    refetch: refetchDash,
    isRefetching: refreshingDash,
  } = useGetDashboardSummary(
    selectedBranchId ? { branchId: selectedBranchId } : {},
    { query: { refetchInterval: isOnline ? 30000 : undefined } }
  );

  const {
    data: movements,
    isLoading: loadingMoves,
    refetch: refetchMoves,
    isRefetching: refreshingMoves,
  } = useListStockMovements(
    { branchId: selectedBranchId ?? undefined, limit: 10 },
    { query: { refetchInterval: isOnline ? 30000 : undefined } }
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

      {/* Offline banner */}
      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
          <Feather name="wifi-off" size={14} color={colors.destructive} />
          <Text style={[styles.offlineBannerText, { color: colors.destructive, fontFamily: "Outfit_500Medium" }]}>
            {t("offlineBanner")}
          </Text>
        </View>
      )}

      {/* Sync queue indicator */}
      {(pendingCount > 0 || isSyncing) && (
        <Pressable
          style={[styles.syncRow, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}
          onPress={isOnline ? syncNow : undefined}
        >
          {isSyncing ? (
            <ActivityIndicator size={12} color={colors.primary} />
          ) : (
            <Feather name="upload-cloud" size={14} color={colors.primary} />
          )}
          <Text style={[styles.syncRowText, { color: colors.primary, fontFamily: "Outfit_500Medium" }]}>
            {isSyncing
              ? t("syncing")
              : `${pendingCount} ${t("pendingSync")}${isOnline ? " · " + t("syncNow") : ""}`}
          </Text>
        </Pressable>
      )}

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
                  value={summary?.lowStockCount ?? 0}
                  icon="alert-triangle"
                  tint={summary && summary.lowStockCount > 0 ? "destructive" : "primary"}
                />
              </View>
              <View style={styles.statRow}>
                <StatCard
                  label={t("movementsToday")}
                  value={summary?.movementsToday ?? 0}
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

            {/* Last synced footer */}
            {lastSyncedAt && (
              <View style={styles.lastSyncRow}>
                <Feather name="check-circle" size={11} color={colors.mutedForeground} />
                <Text style={[styles.lastSyncText, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
                  {t("lastSynced")} {formatLastSynced(lastSyncedAt)}
                </Text>
              </View>
            )}

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
  container: { flex: 1 },
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
  appName: { fontSize: 22 },
  subtitle: { fontSize: 13, marginTop: 1 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  offlineBannerText: { fontSize: 12, flex: 1 },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  syncRowText: { fontSize: 12 },
  content: { paddingTop: 16, gap: 8 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  statsGrid: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  statRow: { flexDirection: "row", gap: 10 },
  lastSyncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  lastSyncText: { fontSize: 11 },
  section: { marginTop: 8, gap: 0 },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
});
