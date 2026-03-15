import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

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

const TRADE_COLOR: Record<string, string> = {
  Plumbing: "#0EA5E9",
  Electrical: "#F59E0B",
  HVAC: "#6366F1",
  Appliance: "#EC4899",
  Handyman: "#059669",
};

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
      setError("Please describe the issue.");
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
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Instant Match</Text>
            <Text style={styles.subheading}>Describe your issue and we'll connect you with an available pro.</Text>

            <Text style={styles.label}>Trade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tradeScroll} contentContainerStyle={styles.tradeContent}>
              {trades.map((t) => {
                const color = TRADE_COLOR[t.label] ?? "#059669";
                const active = trade === t.label;
                return (
                  <TouchableOpacity
                    key={t.label}
                    style={[styles.tradeChip, active && { borderColor: color, backgroundColor: color + "12" }]}
                    onPress={() => setTrade(t.label)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tradeEmoji}>{t.emoji}</Text>
                    <Text style={[styles.tradeLabel, active && { color }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Describe the issue</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. My kitchen sink has been leaking for two days and the cabinet below is getting wet..."
              multiline
              numberOfLines={5}
              value={description}
              onChangeText={setDescription}
              style={styles.textarea}
              outlineColor="#E2E8F0"
              activeOutlineColor="#059669"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: location ? "#059669" : "#94A3B8" }]} />
              <Text style={styles.locationText}>
                {location
                  ? "Location captured — nearby pros will be prioritized."
                  : "Location unavailable — all pros will see your request."}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              mode="contained"
              loading={submitting}
              onPress={handleSubmit}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
              buttonColor="#059669"
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
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 28,
    lineHeight: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  tradeScroll: { flexGrow: 0, marginBottom: 28 },
  tradeContent: { gap: 8 },
  tradeChip: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minWidth: 80,
    gap: 6,
  },
  tradeEmoji: { fontSize: 20 },
  tradeLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  textarea: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    fontSize: 15,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  locationText: { fontSize: 13, color: "#64748B", flex: 1 },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: { color: "#DC2626", fontSize: 14 },
  submitButton: { marginBottom: 40, borderRadius: 10 },
  submitButtonContent: { height: 50 },
});
