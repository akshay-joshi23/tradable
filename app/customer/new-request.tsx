import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { createRequest } from "../../lib/api";

const TRADES = [
  { emoji: "⚡", label: "Electrical" },
  { emoji: "🔧", label: "Plumbing" },
  { emoji: "❄️", label: "HVAC" },
  { emoji: "🔌", label: "Appliance" },
  { emoji: "🪛", label: "Handyman" },
];

export default function NewRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trade, setTrade] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      });
    });
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!trade) { setError("Please select a trade."); return; }
    if (!description.trim()) { setError("Please describe the issue."); return; }
    setSubmitting(true);
    try {
      const request = await createRequest(trade, description.trim(), location ?? undefined);
      router.push(`/customer/request/${request.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!trade && description.trim().length > 0;

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>New Request</Text>
            <Text style={styles.subtitle}>Tell us what you need help with.</Text>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>What do you need help with?</Text>
              <View style={styles.tradeGrid}>
                {TRADES.map((t) => {
                  const active = trade === t.label;
                  return (
                    <TouchableOpacity
                      key={t.label}
                      style={[styles.tradePill, active && styles.tradePillActive]}
                      onPress={() => setTrade(t.label)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.tradeEmoji}>{t.emoji}</Text>
                      <Text style={[styles.tradeLabel, active && styles.tradeLabelActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Describe your issue</Text>
              <TextInput
                style={styles.textarea}
                placeholder="E.g., My kitchen sink is leaking and water won't drain..."
                placeholderTextColor="#9A9A9A"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.locationRow}>
                <View style={styles.locationIconBox}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color="#1A4230" />
                </View>
                <Text style={styles.locationText}>
                  {location
                    ? "Location captured — nearby pros will see your request."
                    : "Location unavailable — all pros will see your request."}
                </Text>
                <View style={[styles.locationDot, { backgroundColor: location ? "#1A4230" : "#D1D5DB" }]} />
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? "Creating request…" : "Find a Pro → Pay to start"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A4230",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#5A5A5A",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#9A9A9A",
  },
  tradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tradePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9F8F6",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  tradePillActive: {
    backgroundColor: "#1A4230",
    borderColor: "#1A4230",
  },
  tradeEmoji: {
    fontSize: 14,
  },
  tradeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  tradeLabelActive: {
    color: "#FFF",
  },
  textarea: {
    backgroundColor: "#F9F8F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 14,
    minHeight: 110,
    fontSize: 14,
    color: "#111",
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EDF2EF",
    borderRadius: 10,
    padding: 12,
  },
  locationIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: "#1A4230",
    lineHeight: 17,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#1A4230",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
