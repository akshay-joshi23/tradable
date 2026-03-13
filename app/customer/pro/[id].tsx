import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { listPros, ProSummary } from "../../../lib/api";

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: "🚿",
  Electrical: "⚡",
  HVAC: "❄️",
  Appliance: "🔌",
  Handyman: "🔧",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function CustomerProDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [pro, setPro] = useState<ProSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPros()
      .then((pros) => {
        const found = pros.find((p) => p.user_id === id) ?? null;
        if (!found) setError("Pro not found.");
        else setPro(found);
      })
      .catch(() => setError("Failed to load pro details."))
      .finally(() => setLoading(false));
  }, [id]);

  const emoji = pro ? (TRADE_EMOJI[pro.trade] ?? "🔧") : "";
  const name = pro ? (pro.display_name ?? pro.full_name ?? "Pro") : "";
  const price = pro ? `$${Math.round(pro.consultation_price_cents / 100)}` : "";

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Button
              icon="arrow-left"
              mode="text"
              onPress={() => router.back()}
              style={styles.backButton}
              labelStyle={styles.backLabel}
            >
              Browse
            </Button>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#065F46" />
              </View>
            ) : error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : pro ? (
              <>
                <View style={styles.heroSection}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </View>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.trade}>{pro.trade}</Text>
                </View>

                <View style={styles.priceCard}>
                  <Text style={styles.priceAmount}>{price}</Text>
                  <Text style={styles.priceLabel}>per consultation</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Details</Text>
                  <View style={styles.infoCard}>
                    <InfoRow label="Specialty" value={pro.trade} />
                    {pro.years_of_experience != null && (
                      <>
                        <View style={styles.divider} />
                        <InfoRow label="Experience" value={`${pro.years_of_experience} years`} />
                      </>
                    )}
                    {pro.certifications ? (
                      <>
                        <View style={styles.divider} />
                        <InfoRow label="Certifications" value={pro.certifications} />
                      </>
                    ) : null}
                  </View>
                </View>

                {pro.cal_username ? (
                  <View style={styles.bookingSection}>
                    <Button
                      mode="contained"
                      onPress={() => Linking.openURL(`https://cal.com/${pro.cal_username}`)}
                      style={styles.bookButton}
                      contentStyle={styles.bookButtonContent}
                      icon="calendar-plus"
                    >
                      Book a Consultation
                    </Button>
                    <Text style={styles.bookNote}>
                      You'll be taken to their booking page to pick a time.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noBookingBanner}>
                    <Text style={styles.noBookingText}>This pro hasn't set up online booking yet.</Text>
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  backButton: { alignSelf: "flex-start", marginLeft: -8, marginBottom: 8 },
  backLabel: { color: "#065F46", fontSize: 14 },
  loadingContainer: { alignItems: "center", paddingVertical: 60 },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14 },
  errorText: { color: "#DC2626", fontSize: 14 },
  heroSection: { alignItems: "center", marginBottom: 20, gap: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#D1FAE5", alignItems: "center",
    justifyContent: "center", marginBottom: 4,
  },
  avatarEmoji: { fontSize: 36 },
  name: { fontSize: 22, fontWeight: "700", color: "#064E3B" },
  trade: { fontSize: 14, fontWeight: "600", color: "#065F46" },
  priceCard: {
    backgroundColor: "#ECFDF5", borderRadius: 14,
    padding: 16, alignItems: "center", marginBottom: 24,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  priceAmount: { fontSize: 32, fontWeight: "800", color: "#064E3B" },
  priceLabel: { fontSize: 13, color: "#475569", marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#059669",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
  },
  infoCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14,
    borderWidth: 1, borderColor: "#D1FAE5", overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: "#475569" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#0F172A", maxWidth: "60%", textAlign: "right" },
  divider: { height: 1, backgroundColor: "#F0FDF4" },
  bookingSection: { gap: 10, marginBottom: 32 },
  bookButton: { borderRadius: 12 },
  bookButtonContent: { height: 52 },
  bookNote: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
  noBookingBanner: {
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#D1FAE5",
  },
  noBookingText: { fontSize: 14, color: "#94A3B8", textAlign: "center" },
});
