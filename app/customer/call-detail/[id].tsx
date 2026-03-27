import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { listCustomerCalls, CustomerCall } from "../../../lib/api";

export default function CustomerCallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Bookings</Text>
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : call ? (
              <>
                <Text style={styles.title}>{call.trade}</Text>
                <Text style={styles.date}>{formattedDate}</Text>

                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Your Issue</Text>
                  <Text style={styles.bodyText}>{call.description}</Text>
                </View>

                {call.outcome ? (
                  <>
                    <View style={styles.card}>
                      <Text style={styles.sectionLabel}>Pro's Diagnosis</Text>
                      <Text style={styles.bodyText}>{call.outcome.diagnosis}</Text>
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.sectionLabel}>Summary</Text>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Estimate</Text>
                        <Text style={styles.summaryValue}>{estimateText}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Onsite visit needed</Text>
                        <Text style={styles.summaryValue}>
                          {call.outcome.onsiteNeeded ? "Yes" : "No"}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyBanner}>
                    <Text style={styles.emptyText}>No diagnosis has been recorded yet.</Text>
                  </View>
                )}
              </>
            ) : null}
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
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: "#9A9A9A",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#9A9A9A",
  },
  bodyText: {
    fontSize: 14,
    color: "#111",
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#5A5A5A",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  emptyBanner: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9A9A9A",
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    color: "#9A9A9A",
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
  },
});
