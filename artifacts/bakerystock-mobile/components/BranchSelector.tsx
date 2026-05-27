import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useListBranches } from "@workspace/api-client-react";
import { useBranch } from "@/context/BranchContext";
import { useTranslation } from "@/constants/i18n";

export function BranchSelector() {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const { data: branches } = useListBranches();
  const { t } = useTranslation();

  const selected = branches?.find((b) => b.id === selectedBranchId);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        testID="branch-selector"
      >
        <Feather name="map-pin" size={13} color={colors.primary} />
        <Text style={[styles.label, { color: colors.foreground, fontFamily: "Outfit_500Medium" }]} numberOfLines={1}>
          {selected ? selected.name : t("allBranches")}
        </Text>
        <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Outfit_700Bold" }]}>
              {t("chooseBranch")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                style={[styles.option, selectedBranchId === null && { backgroundColor: colors.primary + "20" }]}
                onPress={() => { setSelectedBranchId(null); setOpen(false); }}
              >
                <Text style={[styles.optionText, { color: colors.foreground, fontFamily: selectedBranchId === null ? "Outfit_600SemiBold" : "Outfit_400Regular" }]}>
                  {t("allBranches")}
                </Text>
                {selectedBranchId === null && <Feather name="check" size={16} color={colors.primary} />}
              </Pressable>
              {branches?.map((branch) => (
                <Pressable
                  key={branch.id}
                  style={[styles.option, selectedBranchId === branch.id && { backgroundColor: colors.primary + "20" }]}
                  onPress={() => { setSelectedBranchId(branch.id); setOpen(false); }}
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionText, { color: colors.foreground, fontFamily: selectedBranchId === branch.id ? "Outfit_600SemiBold" : "Outfit_400Regular" }]}>
                      {branch.name}
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }]}>
                      {branch.city}
                    </Text>
                  </View>
                  {selectedBranchId === branch.id && <Feather name="check" size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
  },
  label: {
    fontSize: 13,
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: 380,
  },
  sheetTitle: {
    fontSize: 17,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
  },
  optionSub: {
    fontSize: 12,
  },
});
