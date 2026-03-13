import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { listCustomerCalls, CustomerCall } from "../../../lib/api";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function CustomerCallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [call, setCall] = useState<CustomerCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCustomerCalls()
      .then((calls) => {
        const found = calls.find((c) => c.id === id) ?? null;
        if (!found) setError("Call not found.");
        else setCall(found);
      })
      .catch(() => setError("Failed to load call details."))
      .finally(() => setLoading(false));
  }, [id]);

  const formattedDate = call
    ? new Date(call.created_at).toLocaleString([], {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const estimateText =
    call?.outcome?.estimateMin != null && call?.outcome?.estimateMax != null
      ? `$${call.outcome.estimateMin} – $${call.outcome.estimateMax}`
      : "Not provided";

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
              Bookings
            </Button>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#065F46" />
              </View>
            ) : error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : call ? (
              <>
                <View style={styles.header}>
                  <Text style={styles.trade}>{call.trade}</Text>
                  <Text style={styles.date}>{formattedDate}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Your Issue</Text>
                  <Text style={styles.bodyText}>{call.description}</Text>
                </View>

                {call.outcome ? (
                  <>
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Pro's Diagnosis</Text>
                      <Text style={styles.bodyText}>{call.outcome.diagnosis}</Text>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Summary</Text>
                      <View style={styles.summaryCard}>
                        <DetailRow label="Estimate" value={estimateText} />
                        <View style={styles.divider} />
                        <DetailRow
                          label="Onsite visit needed"
                          value={call.outcome.onsiteNeeded ? "Yes" : "No"}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.noOutcomeBanner}>
                    <Text style={styles.noOutcomeText}>No diagnosis has been recorded yet.</Text>
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
  header: { marginBottom: 24 },
  trade: { fontSize: 24, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5 },
  date: { fontSize: 13, color: "#475569", marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#059669",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
  },
  bodyText: { fontSize: 15, color: "#334155", lineHeight: 23 },
  summaryCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14,
    borderWidth: 1, borderColor: "#D1FAE5", overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
  },
  label: { fontSize: 14, color: "#475569" },
  value: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  divider: { height: 1, backgroundColor: "#F0FDF4" },
  noOutcomeBanner: {
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#D1FAE5",
  },
  noOutcomeText: { fontSize: 14, color: "#94A3B8", textAlign: "center" },
});
