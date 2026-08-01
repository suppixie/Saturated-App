import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { C, F, glass } from "../theme";

/**
 * Archived on 2026-08-01. This screen is intentionally not connected to the
 * Settings menu, but remains here so it can be restored later.
 */
export default function AboutSaturatedScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack}>
          <ArrowLeft size={28} color={C.ink} />
        </Pressable>
        <Text style={styles.heading}>About Saturated</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.logo}>Saturated</Text>
        <Text style={styles.copy}>
          Discover beverages, track what you have tried, share thoughtful
          reviews and see what your buddies are drinking.
        </Text>
        <View style={styles.summary}>
          <Text style={styles.copy}>Version 1.0.0</Text>
          <Text style={styles.copy}>iOS and Android</Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open the Saturated GitHub repository"
          onPress={() =>
            Linking.openURL("https://github.com/suppixie/Saturated-App")
          }
          style={styles.link}
        >
          <ExternalLink size={16} color={C.teal} />
          <Text style={styles.linkText}>Project repository</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream, paddingHorizontal: 32 },
  header: {
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heading: { fontFamily: F.display, fontSize: 26, color: C.red },
  card: {
    ...glass,
    borderRadius: 23,
    padding: 22,
    gap: 16,
  },
  logo: {
    fontFamily: F.display,
    fontSize: 25,
    color: C.red,
    textAlign: "center",
  },
  copy: { fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: C.ink },
  summary: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(43,73,89,.06)",
    gap: 5,
  },
  link: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  linkText: { fontFamily: F.bold, fontSize: 12, color: C.teal },
});
