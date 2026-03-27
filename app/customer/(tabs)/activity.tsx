import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { createRequest } from "../../../lib/api";

const TRADES = [
  { emoji: "⚡", label: "Electrical" },
  { emoji: "🔧", label: "Plumbing" },
  { emoji: "❄️", label: "HVAC" },
  { emoji: "🔌", label: "Appliance" },
  { emoji: "🪛", label: "Handyman" },
];

export default function CustomerActivityTab() {
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
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Activity</Text>

          {/* Request Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Get help now</Text>
            <Text style={styles.cardSubtitle}>
              Describe your issue and we'll match you with a nearby pro.
            </Text>

            {/* Trade selector */}
            <View style={styles.section}>
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
            </View>

            {/* Description */}
            <View style={styles.section}>
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
            </View>

            {/* Location row */}
            <View style={styles.locationRow}>
              <View style={styles.locationIconBox}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color="#1A4230" />
              </View>
              <Text style={styles.locationText}>
                {location ? "Location captured — nearby pros will see your request." : "Location unavailable — all pros will see your request."}
              </Text>
              <View style={[styles.locationDot, { backgroundColor: location ? "#1A4230" : "#D1D5DB" }]} />
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
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

          {/* Info cards */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#1A4230" />
              </View>
              <Text style={styles.infoValue}>~2 min</Text>
              <Text style={styles.infoLabel}>Avg match time</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#1A4230" />
              </View>
              <Text style={styles.infoValue}>Vetted</Text>
              <Text style={styles.infoLabel}>All pros</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}>
                <MaterialCommunityIcons name="video-outline" size={18} color="#1A4230" />
              </View>
              <Text style={styles.infoValue}>Video</Text>
              <Text style={styles.infoLabel}>Consultation</Text>
            </View>
          </View>
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
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
    gap: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: "#111",
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "#5A5A5A",
    marginTop: -12,
    lineHeight: 19,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.77,
    textTransform: "uppercase",
    color: "#111",
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
    fontWeight: "400",
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
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9A9A9A",
    textAlign: "center",
  },
});
