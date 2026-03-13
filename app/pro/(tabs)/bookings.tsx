import { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { getProProfile } from "../../../lib/api";

export default function BookingsTab() {
  const [calUsername, setCalUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProProfile()
      .then((profile) => setCalUsername(profile?.cal_username ?? null))
      .catch(() => setCalUsername(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <Text style={styles.heading}>Bookings</Text>
          <Text style={styles.subheading}>Upcoming in-person visits from your customers</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#065F46" />
            </View>
          ) : calUsername ? (
            <View style={styles.content}>
              <View style={styles.card}>
                <Text style={styles.cardEmoji}>📅</Text>
                <Text style={styles.cardTitle}>Manage your bookings on Cal.com</Text>
                <Text style={styles.cardBody}>
                  Customers book in-person visits directly through your Cal.com page after a consultation.
                  View, reschedule, or cancel bookings from your Cal.com dashboard.
                </Text>
                <Button
                  mode="contained"
                  onPress={() => Linking.openURL(`https://app.cal.com/bookings/upcoming`)}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  icon="open-in-new"
                >
                  Open Cal.com
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => Linking.openURL(`https://cal.com/${calUsername}`)}
                  style={styles.secondaryButton}
                  contentStyle={styles.buttonContent}
                >
                  View your booking page
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🗓️</Text>
              <Text style={styles.emptyTitle}>Cal.com not set up</Text>
              <Text style={styles.emptySubtitle}>
                Complete your profile setup to enable customer bookings.
              </Text>
            </View>
          )}
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5, marginTop: 8 },
  subheading: { fontSize: 14, color: "#475569", marginTop: 2, marginBottom: 24 },
  loadingContainer: { alignItems: "center", paddingVertical: 60 },
  content: { flex: 1 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    alignItems: "center",
    gap: 12,
  },
  cardEmoji: { fontSize: 40, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  cardBody: { fontSize: 14, color: "#475569", textAlign: "center", lineHeight: 21 },
  button: { borderRadius: 10, width: "100%", marginTop: 4 },
  secondaryButton: { borderRadius: 10, width: "100%", borderColor: "#D1FAE5" },
  buttonContent: { height: 46 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#0F172A" },
  emptySubtitle: { fontSize: 14, color: "#475569", marginTop: 4, textAlign: "center", paddingHorizontal: 32 },
});
