import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

import { AuthGate } from "../../components/AuthGate";
import { Screen } from "../../components/Screen";
import { RoleGuard } from "../../components/RoleGuard";
import { claimRequest, getProProfile, listOpenRequests } from "../../lib/api";
import { Request } from "../../lib/types";

export default function ProDashboardScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError(null);
    try {
      const data = await listOpenRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Check profile on mount — redirect to setup if not configured
  useEffect(() => {
    getProProfile()
      .then((profile) => {
        if (!profile) {
          router.replace("/pro/setup");
        } else {
          loadRequests();
        }
      })
      .catch(() => {
        // Profile fetch failed for a non-404 reason; still load requests
        loadRequests();
      });
  }, []);

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    try {
      const claimed = await claimRequest(requestId);
      router.push(`/call/${claimed.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim request.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <ScrollView
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequests} />}
          >
            <Text variant="headlineSmall">Open requests</Text>
            <Button mode="text" compact onPress={() => router.push("/media-test")} style={{ marginTop: 8 }}>
              Test camera/mic
            </Button>
            {error ? <Text style={{ marginTop: 8 }}>{error}</Text> : null}
            {requests.length === 0 && !loading ? (
              <Text style={{ marginTop: 16 }}>No open requests right now.</Text>
            ) : null}
            {requests.map((request) => (
              <Card key={request.id} style={{ marginTop: 16 }}>
                <Card.Title title={request.trade} subtitle={request.description} />
                <Card.Actions>
                  <Button
                    mode="contained"
                    loading={claimingId === request.id}
                    onPress={() => handleClaim(request.id)}
                  >
                    Claim
                  </Button>
                </Card.Actions>
              </Card>
            ))}
            <View style={{ marginTop: 16 }}>
              <Button mode="outlined" onPress={loadRequests}>
                Refresh
              </Button>
            </View>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}
