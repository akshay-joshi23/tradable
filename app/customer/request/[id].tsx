import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { useStripe } from "@stripe/stripe-react-native";

import { AuthGate } from "../../../components/AuthGate";
import { Screen } from "../../../components/Screen";
import { RoleGuard } from "../../../components/RoleGuard";
import { getRequest, createPaymentIntent, confirmPayment } from "../../../lib/api";
import { Outcome, Request } from "../../../lib/types";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  open:     { label: "Looking for a pro",     color: "#D97706", bg: "#FFFBEB", emoji: "🔍" },
  matched:  { label: "Pro matched",            color: "#065F46", bg: "#ECFDF5", emoji: "👋" },
  in_call:  { label: "In consultation",        color: "#065F46", bg: "#ECFDF5", emoji: "📹" },
  completed:{ label: "Completed",              color: "#059669", bg: "#ECFDF5", emoji: "✅" },
  canceled: { label: "Canceled",               color: "#DC2626", bg: "#FEF2F2", emoji: "❌" },
};

function OutcomeCard({ outcome, requestId }: { outcome: Outcome; requestId: string }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [calUsername, setCalUsername] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const estimateRange =
    outcome.estimateMin != null && outcome.estimateMax != null
      ? `$${outcome.estimateMin} – $${outcome.estimateMax}`
      : "Not provided";

  const handlePayAndBook = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const { clientSecret, paymentIntentId, calUsername: username } = await createPaymentIntent(requestId);
      setCalUsername(username);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Tradable",
      });

      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") setPayError(presentError.message);
        return;
      }

      await confirmPayment(requestId, paymentIntentId);
      setPaid(true);
      if (username) Linking.openURL(`https://cal.com/${username}`);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.outcomeCard}>
      <Text style={styles.outcomeTitle}>Consultation Summary</Text>

      <View style={styles.outcomeRow}>
        <Text style={styles.outcomeLabel}>Diagnosis</Text>
        <Text style={styles.outcomeValue}>{outcome.diagnosis}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.outcomeRow}>
        <Text style={styles.outcomeLabel}>Estimate</Text>
        <Text style={styles.outcomeValue}>{estimateRange}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.outcomeRow}>
        <Text style={styles.outcomeLabel}>Onsite visit</Text>
        <Text style={[styles.outcomeValue, { color: outcome.onsiteNeeded ? "#065F46" : "#475569" }]}>
          {outcome.onsiteNeeded ? "Recommended" : "Not needed"}
        </Text>
      </View>

      <View style={styles.bookingSection}>
        {paid ? (
          <>
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>✓ Payment confirmed — thank you!</Text>
            </View>
            {outcome.onsiteNeeded && calUsername ? (
              <Button
                mode="contained"
                icon="calendar"
                onPress={() => Linking.openURL(`https://cal.com/${calUsername}`)}
                style={styles.bookButton}
                contentStyle={styles.bookButtonContent}
              >
                Book onsite visit
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.bookingHint}>
              Pay your pro for this consultation.
            </Text>
            <Button
              mode="contained"
              icon="credit-card"
              loading={paying}
              onPress={handlePayAndBook}
              style={styles.bookButton}
              contentStyle={styles.bookButtonContent}
            >
              Pay for consultation
            </Button>
          </>
        )}
        {payError ? <Text style={styles.payError}>{payError}</Text> : null}
      </View>
    </View>
  );
}

export default function RequestStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const waitingForOutcome = request?.status === "matched" && !request?.outcome;
    if (!waitingForOutcome) return;
    const interval = setInterval(loadRequest, 3000);
    return () => clearInterval(interval);
  }, [request?.status, request?.outcome, loadRequest]);

  const canJoin = request?.status === "matched" || request?.status === "in_call";
  const statusConfig = STATUS_CONFIG[request?.status ?? "open"];

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequest} tintColor="#065F46" />}
          >
            <Text style={styles.heading}>Your Request</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {request ? (
              <>
                <View style={styles.requestCard}>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig?.bg ?? "#F1F5F9" }]}>
                    <Text style={styles.statusEmoji}>{statusConfig?.emoji}</Text>
                    <Text style={[styles.statusLabel, { color: statusConfig?.color ?? "#64748B" }]}>
                      {statusConfig?.label ?? request.status}
                    </Text>
                  </View>

                  <Text style={styles.tradeTitle}>{request.trade}</Text>
                  <Text style={styles.descriptionText}>{request.description}</Text>

                  {canJoin ? (
                    <Button
                      mode="contained"
                      icon="video"
                      onPress={() => router.push(`/call/${request.id}`)}
                      style={styles.joinButton}
                      contentStyle={styles.joinButtonContent}
                    >
                      Join consultation
                    </Button>
                  ) : (
                    <Button
                      mode="outlined"
                      icon="video-off"
                      disabled
                      style={styles.joinButton}
                      contentStyle={styles.joinButtonContent}
                    >
                      Waiting for pro
                    </Button>
                  )}
                </View>

                {request.status === "matched" && !request.outcome ? (
                  <View style={styles.waitingCard}>
                    <ActivityIndicator size="small" color="#065F46" />
                    <Text style={styles.waitingText}>
                      Waiting for your pro to submit their summary...
                    </Text>
                  </View>
                ) : null}

                {request.outcome ? (
                  <OutcomeCard outcome={request.outcome} requestId={id} />
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#064E3B",
    letterSpacing: -0.5,
    marginTop: 8,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 14,
  },
  statusEmoji: { fontSize: 13 },
  statusLabel: { fontSize: 13, fontWeight: "600" },
  tradeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#064E3B",
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 18,
  },
  joinButton: { borderRadius: 10 },
  joinButtonContent: { height: 46 },
  waitingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  waitingText: { fontSize: 14, color: "#065F46", flex: 1 },
  outcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  outcomeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#064E3B",
    marginBottom: 16,
  },
  outcomeRow: {
    paddingVertical: 10,
  },
  outcomeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  outcomeValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0FDF4",
  },
  bookingSection: {
    marginTop: 20,
  },
  bookingHint: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
  },
  bookButton: { borderRadius: 10 },
  bookButtonContent: { height: 48 },
  paidBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  paidText: { color: "#059669", fontWeight: "600", fontSize: 14 },
  payError: { color: "#DC2626", fontSize: 13, marginTop: 8 },
});
