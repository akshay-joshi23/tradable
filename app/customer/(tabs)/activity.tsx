import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { Screen } from "../../../components/Screen";
import { RoleGuard } from "../../../components/RoleGuard";
import { createRequest } from "../../../lib/api";

const trades = [
  { label: "Plumbing", emoji: "🚿" },
  { label: "Electrical", emoji: "⚡" },
  { label: "HVAC", emoji: "❄️" },
  { label: "Appliance", emoji: "🔌" },
  { label: "Handyman", emoji: "🔧" },
];

export default function CustomerActivityTab() {
  const router = useRouter();
  const [trade, setTrade] = useState(trades[0].label);
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
    if (!description.trim()) {
      setError("Please add a short description.");
      return;
    }
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

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>Instant Match</Text>
            <Text style={styles.subheading}>Get matched with an available pro right now.</Text>

            <Text style={styles.sectionLabel}>Select a trade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tradeScroll}>
              {trades.map((t) => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.tradeChip, trade === t.label && styles.tradeChipActive]}
                  onPress={() => setTrade(t.label)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tradeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.tradeLabel, trade === t.label && styles.tradeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Describe the issue</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. My kitchen sink has been leaking for two days..."
              multiline
              numberOfLines={5}
              value={description}
              onChangeText={setDescription}
              style={styles.textarea}
            />

            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>
                {location
                  ? "Location captured — nearby pros will see your request."
                  : "Location unavailable — all pros will see your request."}
              </Text>
            </View>

            <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>

            <Button
              mode="contained"
              loading={submitting}
              onPress={handleSubmit}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Find a Pro Now
            </Button>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5, marginTop: 8 },
  subheading: { fontSize: 15, color: "#475569", marginTop: 4, marginBottom: 24 },
  sectionLabel: {
    fontSize: 13, fontWeight: "700", color: "#059669",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
  },
  tradeScroll: { marginBottom: 24 },
  tradeChip: {
    alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16, marginRight: 10,
    borderWidth: 1.5, borderColor: "#D1FAE5", minWidth: 80,
    shadowColor: "#064E3B", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  tradeChipActive: { backgroundColor: "#D1FAE5", borderColor: "#065F46" },
  tradeEmoji: { fontSize: 22, marginBottom: 4 },
  tradeLabel: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  tradeLabelActive: { color: "#065F46" },
  textarea: { backgroundColor: "#FFFFFF", marginBottom: 16 },
  locationRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#ECFDF5", borderRadius: 10, padding: 12, marginBottom: 8,
  },
  locationIcon: { fontSize: 16 },
  locationText: { fontSize: 13, color: "#065F46", flex: 1 },
  submitButton: { marginTop: 8, marginBottom: 32, borderRadius: 12 },
  submitButtonContent: { height: 50 },
});
