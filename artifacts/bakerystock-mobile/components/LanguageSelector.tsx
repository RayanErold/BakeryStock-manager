import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

export function LanguageSelector() {
  const colors = useColors();
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fr" : "en");
  };

  return (
    <Pressable
      onPress={toggleLanguage}
      style={[
        styles.trigger,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
        },
      ]}
      testID="language-selector"
    >
      <Feather name="globe" size={13} color={colors.primary} />
      <Text
        style={[
          styles.label,
          { color: colors.foreground, fontFamily: "Outfit_600SemiBold" },
        ]}
      >
        {language.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
  },
});
