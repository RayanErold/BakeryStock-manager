import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useListLowStockItems } from "@workspace/api-client-react";
import type { LowStockItem } from "@workspace/api-client-react";
import { useBranch } from "@/context/BranchContext";
import { BranchSelector } from "@/components/BranchSelector";
import { AlertCard } from "@/components/AlertCard";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/constants/i18n";

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedBranchId } = useBranch();
  const isWeb = Platform.OS === "web";

  const {
    data: items,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useListLowStockItems(
    { branchId: selectedBranchId ?? undefined },
    { query: { refetchInterval: 30000 } }
  );

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const renderItem = ({ item }: { item: LowStockItem }) => (
    <AlertCard item={item} />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Outfit_700Bold" }]}>
              {t("alerts")}
            </Text>
            {items && items.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.destructive }]}>
                <Text style={[styles.countText, { fontFamily: "Outfit_700Bold" }]}>
                  {items.length}
                </Text>
              </View>
            )}
          </View>
          <BranchSelector />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.loadingWrap}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
            {t("error")}
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryText, { fontFamily: "Outfit_600SemiBold" }]}>
              {t("retry")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPadding + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(items && items.length > 0)}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            items && items.length > 0 ? (
              <View style={[styles.warningBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-triangle" size={14} color={colors.destructive} />
                <Text style={[styles.warningText, { color: colors.destructive, fontFamily: "Outfit_500Medium" }]}>
                  {items.length} article{items.length > 1 ? "s" : ""} en dessous du seuil minimum
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title={t("noAlerts")}
              subtitle="Tous les niveaux de stock sont satisfaisants"
            />
          }
        />
      )}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: {
    color: "#fff",
    fontSize: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
  },
  listContent: {
    paddingTop: 12,
    gap: 0,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
  },
});
