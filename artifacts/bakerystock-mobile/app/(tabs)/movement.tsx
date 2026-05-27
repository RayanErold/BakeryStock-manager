import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import {
  useCreateStockMovement,
  useListBranches,
  useListInventoryItems,
} from "@workspace/api-client-react";
import type { InventoryItem } from "@workspace/api-client-react";
import { useTranslation } from "@/constants/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useOfflineQueue } from "@/context/OfflineQueueContext";

export default function MovementScreen() {
  const colors = useColors();
  const { t, getMovementTypes } = useTranslation();
  const movementTypes = getMovementTypes();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const { isOnline, pendingCount, isSyncing, queueMovement, syncNow } = useOfflineQueue();

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("stock_in");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const { data: branches } = useListBranches();
  const { data: allItems } = useListInventoryItems({});
  const { mutate: createMovement, isPending } = useCreateStockMovement();

  const filteredItems = allItems?.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  ) ?? [];

  const selectedItem = allItems?.find((i) => i.id === selectedItemId);

  const canSubmit = selectedItemId !== null && quantity.length > 0 && parseFloat(quantity) > 0 && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedItem) return;

    const branchId = selectedItem.branchId;
    if (!branchId) {
      Alert.alert("Erreur", "Cet article n'a pas de succursale associée.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const movementData = {
      itemId: selectedItem.id,
      branchId,
      type: selectedType as "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned",
      quantity: parseFloat(quantity),
      note: note.trim() || undefined,
    };

    if (!isOnline) {
      await queueMovement(movementData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("savedOffline"), t("savedOfflineDetail"));
      setSelectedItemId(null);
      setQuantity("");
      setNote("");
      setSelectedType("stock_in");
      return;
    }

    createMovement(
      { data: movementData },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Succès", t("submitSuccess"));
          setSelectedItemId(null);
          setQuantity("");
          setNote("");
          setSelectedType("stock_in");
          queryClient.invalidateQueries();
        },
        onError: async () => {
          await queueMovement(movementData);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(t("savedOffline"), t("savedOfflineDetail"));
          setSelectedItemId(null);
          setQuantity("");
          setNote("");
          setSelectedType("stock_in");
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Outfit_700Bold" }]}>
          {t("recordMovement")}
        </Text>
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
          style={[styles.syncBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "35" }]}
          onPress={isOnline ? syncNow : undefined}
        >
          {isSyncing ? (
            <ActivityIndicator size={12} color={colors.primary} />
          ) : (
            <Feather name="upload-cloud" size={14} color={colors.primary} />
          )}
          <Text style={[styles.syncBadgeText, { color: colors.primary, fontFamily: "Outfit_500Medium" }]}>
            {isSyncing
              ? t("syncing")
              : `${pendingCount} ${t("pendingSync")}${isOnline ? " · " + t("syncNow") : ""}`}
          </Text>
        </Pressable>
      )}

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[styles.form, { paddingBottom: bottomPadding + 90 }]}
        bottomOffset={60}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Outfit_500Medium" }]}>
          {t("item").toUpperCase()}
        </Text>
        <Pressable
          style={[styles.picker, { backgroundColor: colors.card, borderColor: selectedItem ? colors.primary : colors.border }]}
          onPress={() => setItemPickerOpen(true)}
          testID="item-picker"
        >
          {selectedItem ? (
            <View style={styles.pickerContent}>
              <Text style={[styles.pickerSelected, { color: colors.foreground, fontFamily: "Outfit_600SemiBold" }]}>
                {selectedItem.name}
              </Text>
              <Text style={[styles.pickerSub, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
                {selectedItem.quantity} {selectedItem.unit} · {selectedItem.category}
              </Text>
            </View>
          ) : (
            <Text style={[styles.pickerPlaceholder, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
              {t("selectItem")}
            </Text>
          )}
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Outfit_500Medium" }]}>
          {t("selectType").toUpperCase()}
        </Text>
        <View style={styles.typeGrid}>
          {movementTypes.map((mt) => {
            const isSelected = selectedType === mt.value;
            return (
              <Pressable
                key={mt.value}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: isSelected ? colors.primary + "25" : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedType(mt.value)}
                testID={`type-${mt.value}`}
              >
                <Feather
                  name={mt.icon}
                  size={16}
                  color={isSelected ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    {
                      color: isSelected ? colors.primary : colors.mutedForeground,
                      fontFamily: isSelected ? "Outfit_600SemiBold" : "Outfit_400Regular",
                    },
                  ]}
                  numberOfLines={2}
                >
                  {mt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Outfit_500Medium" }]}>
          {t("quantity").toUpperCase()}
        </Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground, fontFamily: "Outfit_600SemiBold" }]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            testID="quantity-input"
          />
          {selectedItem && (
            <Text style={[styles.unitLabel, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
              {selectedItem.unit}
            </Text>
          )}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Outfit_500Medium" }]}>
          {t("note").toUpperCase()}
        </Text>
        <View style={[styles.textAreaWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textArea, { color: colors.foreground, fontFamily: "Outfit_400Regular" }]}
            value={note}
            onChangeText={setNote}
            placeholder={t("note")}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            testID="note-input"
          />
        </View>

        <Pressable
          style={[
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? (isOnline ? colors.primary : colors.destructive) : colors.muted,
              opacity: canSubmit ? 1 : 0.6,
            },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="submit-movement"
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name={isOnline ? "check" : "save"} size={18} color="#fff" />
              <Text style={[styles.submitText, { fontFamily: "Outfit_700Bold" }]}>
                {isOnline ? t("submit") : t("savedOffline")}
              </Text>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      <Modal visible={itemPickerOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Outfit_700Bold" }]}>
                Choisir un article
              </Text>
              <Pressable onPress={() => setItemPickerOpen(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground, fontFamily: "Outfit_400Regular" }]}
                value={itemSearch}
                onChangeText={setItemSearch}
                placeholder={t("search")}
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filteredItems.map((item: InventoryItem) => (
                <Pressable
                  key={item.id}
                  style={[styles.itemOption, selectedItemId === item.id && { backgroundColor: colors.primary + "20" }]}
                  onPress={() => {
                    setSelectedItemId(item.id);
                    setItemPickerOpen(false);
                    setItemSearch("");
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemOptionName, { color: colors.foreground, fontFamily: "Outfit_600SemiBold" }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.itemOptionSub, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
                      {item.quantity} {item.unit} · {item.category}
                      {item.branchName ? ` · ${item.branchName}` : ""}
                    </Text>
                  </View>
                  {item.isLowStock && (
                    <View style={[styles.lowBadge, { backgroundColor: colors.destructive + "20" }]}>
                      <Text style={[styles.lowBadgeText, { color: colors.destructive, fontFamily: "Outfit_600SemiBold" }]}>
                        Faible
                      </Text>
                    </View>
                  )}
                  {selectedItemId === item.id && (
                    <Feather name="check" size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
              {filteredItems.length === 0 && (
                <Text style={[styles.noResults, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
                  {t("noResults")}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  offlineBannerText: { fontSize: 12, flex: 1 },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  syncBadgeText: { fontSize: 12 },
  form: { padding: 16, gap: 6 },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  pickerContent: { flex: 1, gap: 2 },
  pickerSelected: { fontSize: 16 },
  pickerSub: { fontSize: 12 },
  pickerPlaceholder: { flex: 1, fontSize: 15 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  typeButton: {
    width: "31%",
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  typeLabel: { fontSize: 11, textAlign: "center" as const },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  input: { flex: 1, fontSize: 24, padding: 0 },
  unitLabel: { fontSize: 16 },
  textAreaWrap: { borderRadius: 12, borderWidth: 1.5, padding: 14 },
  textArea: {
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: "top" as const,
    padding: 0,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
  },
  submitText: { color: "#fff", fontSize: 17 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 16,
    maxHeight: "80%",
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  itemOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 8,
  },
  itemOptionName: { fontSize: 15 },
  itemOptionSub: { fontSize: 12, marginTop: 2 },
  lowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  lowBadgeText: { fontSize: 11 },
  noResults: { textAlign: "center", paddingVertical: 24, fontSize: 14 },
});
