import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStripe } from "@stripe/stripe-react-native";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getRequest, createPaymentIntent, confirmPayment } from "../../../lib/api";
import { Outcome, Request } from "../../../lib/types";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  open:      { label: "Looking for a pro",  color: "#D97706", bg: "#FFFBEB", emoji: "🔍" },
  matched:   { label: "Pro matched",        color: "#1A4230", bg: "#EDF2EF", emoji: "👋" },
  in_call:   { label: "In consultation",    color: "#1A4230", bg: "#EDF2EF", emoji: "📹" },
  completed: { label: "Completed",          color: "#1A4230", bg: "#EDF2EF", emoji: "✅" },
  canceled:  { label: "Canceled",           color: "#DC2626", bg: "#FEF2F2", emoji: "❌" },
  expired:   { label: "Expired",            color: "#6B7280", bg: "#F3F4F6", emoji: "⏰" },
};

function OutcomeCard({ outcome, requestId }: { outcome: Outcome; requestId: string }) {
  const router = useRouter();

  const estimateRange =
    outcome.estimateMin != null && outcome.estimateMax != null
      ? `$${outcome.estimateMin} – $${outcome.estimateMax}`
      : "Not provided";

  return (
    <View style={styles.outcomeCard}>
      <Text style={styles.sectionLabel}>Consultation Summary</Text>

      <View style={styles.outcomeSection}>
        <Text style={styles.outcomeSectionLabel}>Diagnosis</Text>
        <Text style={styles.outcomeSectionValue}>{outcome.diagnosis}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.outcomeRow}>
        <Text style={styles.outcomeRowLabel}>Estimate</Text>
        <Text style={styles.outcomeRowValue}>{estimateRange}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.outcomeRow}>
        <Text style={styles.outcomeRowLabel}>Onsite visit</Text>
        <Text style={[styles.outcomeRowValue, { color: outcome.onsiteNeeded ? "#1A4230" : "#5A5A5A" }]}>
          {outcome.onsiteNeeded ? "Recommended" : "Not needed"}
        </Text>
      </View>

      {outcome.onsiteNeeded && (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => router.push(`/customer/book/${requestId}`)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="calendar-plus" size={18} color="#FFF" />
          <Text style={styles.bookButtonText}>Book onsite visit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RequestStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const loadRequest = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await getRequest(id);
      setRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load request.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadRequest(); }, [loadRequest]);

  useEffect(() => {
    const shouldPoll =
      (request?.status === "open" || request?.status === "matched") &&
      request?.payment_status !== "paid" &&
      request?.status !== "expired";
    if (!shouldPoll) return;
    const interval = setInterval(loadRequest, 3000);
    return () => clearInterval(interval);
  }, [request?.status, request?.payment_status, loadRequest]);

  const handlePay = async () => {
    if (!id) return;
    setPaying(true);
    setPayError(null);
    try {
      const { clientSecret, paymentIntentId } = await createPaymentIntent(id);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Tradable",
        applePay: {
          merchantCountryCode: "US",
        },
        merchantIdentifier: "merchant.com.akshayjoshi.tradable",
        style: "automatic",
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") setPayError(presentError.message);
        return;
      }

      await confirmPayment(id, paymentIntentId);
      await loadRequest();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  const isPaid = request?.payment_status === "paid";
  const isMatched = request?.status === "matched";
  const isInCall = request?.status === "in_call";
  const statusConfig = STATUS_CONFIG[request?.status ?? "open"];

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequest} tintColor="#1A4230" />}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace("/customer")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Home</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Your Request</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {request && (
              <>
                <View style={styles.requestCard}>
                  {/* Status badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig?.bg ?? "#F9F8F6" }]}>
                    <Text style={styles.statusEmoji}>{statusConfig?.emoji}</Text>
                    <Text style={[styles.statusLabel, { color: statusConfig?.color ?? "#5A5A5A" }]}>
                      {statusConfig?.label ?? request.status}
                    </Text>
                  </View>

                  <Text style={styles.tradeTitle}>{request.trade}</Text>
                  <Text style={styles.descriptionText}>{request.description}</Text>

                  {/* Waiting for pro */}
                  {request.status === "open" && (
                    <View style={styles.waitingRow}>
                      <ActivityIndicator size="small" color="#D97706" />
                      <Text style={styles.waitingText}>Matching you with a nearby pro…</Text>
                    </View>
                  )}

                  {/* Expired */}
                  {request.status === "expired" && (
                    <View style={styles.expiredSection}>
                      <Text style={styles.expiredText}>
                        No pros were available in time. Post a new request to try again.
                      </Text>
                      <TouchableOpacity
                        style={styles.newRequestButton}
                        onPress={() => router.replace("/customer/new-request")}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.newRequestButtonText}>Post a new request</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Pay to unlock */}
                  {isMatched && !isPaid && (
                    <View style={styles.paySection}>
                      <Text style={styles.paySectionHint}>
                        A pro is ready. Pay to start your consultation.
                      </Text>
                      <TouchableOpacity
                        style={[styles.payButton, paying && styles.payButtonDisabled]}
                        onPress={handlePay}
                        disabled={paying}
                        activeOpacity={0.85}
                      >
                        {paying ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <MaterialCommunityIcons name="credit-card-outline" size={18} color="#FFF" />
                        )}
                        <Text style={styles.payButtonText}>
                          {paying ? "Processing…" : "Pay & start consultation"}
                        </Text>
                      </TouchableOpacity>
                      {payError && <Text style={styles.payError}>{payError}</Text>}
                    </View>
                  )}

                  {/* Join call */}
                  {((isMatched && isPaid) || isInCall) && (
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => router.push(`/call/${request.id}`)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="video-outline" size={18} color="#FFF" />
                      <Text style={styles.joinButtonText}>
                        {isInCall ? "Rejoin consultation" : "Join consultation"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Waiting for outcome */}
                {isMatched && isPaid && !request.outcome && (
                  <View style={styles.waitingCard}>
                    <ActivityIndicator size="small" color="#1A4230" />
                    <Text style={styles.waitingCardText}>
                      Waiting for your pro to submit their summary…
                    </Text>
                  </View>
                )}

                {/* Outcome */}
                {request.outcome && (
                  <OutcomeCard outcome={request.outcome} requestId={id} />
                )}
              </>
            )}
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
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: "#DC2626", fontSize: 14 },
  requestCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusEmoji: { fontSize: 13 },
  statusLabel: { fontSize: 13, fontWeight: "600" },
  tradeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  descriptionText: {
    fontSize: 14,
    color: "#5A5A5A",
    lineHeight: 21,
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  waitingText: {
    fontSize: 14,
    color: "#5A5A5A",
    flex: 1,
  },
  paySection: {
    gap: 10,
    paddingTop: 4,
  },
  paySectionHint: {
    fontSize: 14,
    color: "#5A5A5A",
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4230",
    borderRadius: 10,
    height: 48,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  payError: { color: "#DC2626", fontSize: 13 },
  expiredSection: {
    gap: 12,
    paddingTop: 4,
  },
  expiredText: {
    fontSize: 14,
    color: "#5A5A5A",
    lineHeight: 21,
  },
  newRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4230",
    borderRadius: 10,
    height: 48,
  },
  newRequestButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4230",
    borderRadius: 10,
    height: 48,
  },
  joinButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  waitingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EDF2EF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  waitingCardText: {
    fontSize: 14,
    color: "#1A4230",
    flex: 1,
  },
  outcomeCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    gap: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#9A9A9A",
    marginBottom: 14,
  },
  outcomeSection: {
    gap: 4,
    paddingVertical: 10,
  },
  outcomeSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9A9A9A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  outcomeSectionValue: {
    fontSize: 14,
    color: "#111",
    lineHeight: 21,
    fontWeight: "400",
  },
  outcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  outcomeRowLabel: {
    fontSize: 14,
    color: "#5A5A5A",
  },
  outcomeRowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4230",
    borderRadius: 10,
    height: 46,
    marginTop: 14,
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
