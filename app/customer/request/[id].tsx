import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
import { useStripe } from "@stripe/stripe-react-native";

import { AuthGate } from "../../../components/AuthGate";
import { Screen } from "../../../components/Screen";
import { RoleGuard } from "../../../components/RoleGuard";
import { getRequest, createPaymentIntent, confirmPayment } from "../../../lib/api";
import { Outcome, Request } from "../../../lib/types";

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
      const { clientSecret, amount, calUsername: username } = await createPaymentIntent(requestId);
      setCalUsername(username);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Tradable",
        intentConfiguration: {
          mode: { amount, currencyCode: "USD" },
          confirmHandler: async (paymentMethod, _, intentCreationCallback) => {
            intentCreationCallback({ clientSecret });
          },
        },
      });

      if (initError) throw new Error(initError.message);

      const { error: presentError, paymentOption } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") setPayError(presentError.message);
        return;
      }

      // Extract paymentIntentId from clientSecret (format: pi_xxx_secret_yyy)
      const paymentIntentId = clientSecret.split("_secret_")[0];
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
    <Card style={{ marginTop: 16 }}>
      <Card.Title title="Consultation summary" />
      <Card.Content>
        <Text>Diagnosis: {outcome.diagnosis}</Text>
        <Text>Estimate: {estimateRange}</Text>
        <Text>Onsite needed: {outcome.onsiteNeeded ? "Yes" : "No"}</Text>
      </Card.Content>
      {outcome.onsiteNeeded ? (
        <Card.Actions style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          {paid ? (
            <Button
              mode="contained"
              icon="calendar"
              onPress={() => calUsername && Linking.openURL(`https://cal.com/${calUsername}`)}
            >
              Open booking page
            </Button>
          ) : (
            <Button
              mode="contained"
              icon="credit-card"
              loading={paying}
              onPress={handlePayAndBook}
            >
              Pay & book onsite visit
            </Button>
          )}
          {payError ? (
            <Text style={{ color: "red", fontSize: 13 }}>{payError}</Text>
          ) : null}
        </Card.Actions>
      ) : null}
    </Card>
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

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <ScrollView
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequest} />}
          >
            <Text variant="headlineSmall">Request status</Text>
            {error ? <Text style={{ marginTop: 8 }}>{error}</Text> : null}
            {request ? (
              <Card style={{ marginTop: 16 }}>
                <Card.Title title={request.trade} subtitle={`Status: ${request.status}`} />
                <Card.Content>
                  <Text>{request.description}</Text>
                </Card.Content>
                <Card.Actions>
                  <Button
                    mode="contained"
                    disabled={!canJoin}
                    onPress={() => router.push(`/call/${request.id}`)}
                  >
                    Join call
                  </Button>
                </Card.Actions>
              </Card>
            ) : null}
            {request?.status === "matched" && !request?.outcome ? (
              <Card style={{ marginTop: 16 }}>
                <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <ActivityIndicator size="small" />
                  <Text>Waiting for your pro to submit their summary...</Text>
                </Card.Content>
              </Card>
            ) : null}
            {request?.outcome ? <OutcomeCard outcome={request.outcome} requestId={id} /> : null}
            <View style={{ marginTop: 16 }}>
              <Button mode="outlined" onPress={loadRequest}>Refresh</Button>
            </View>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}
