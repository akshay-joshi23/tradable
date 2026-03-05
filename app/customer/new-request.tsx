import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, HelperText, RadioButton, Text, TextInput } from "react-native-paper";

import { AuthGate } from "../../components/AuthGate";
import { Screen } from "../../components/Screen";
import { RoleGuard } from "../../components/RoleGuard";
import { createRequest } from "../../lib/api";

const trades = ["Plumbing", "Electrical", "HVAC", "Appliance", "Handyman"];

export default function NewRequestScreen() {
  const router = useRouter();
  const [trade, setTrade] = useState(trades[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Request location permission on mount
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
          <ScrollView>
            <Text variant="headlineSmall">New repair request</Text>
            <Text style={{ marginTop: 8, marginBottom: 12 }}>
              Pick a trade and describe the issue.
            </Text>
            <Text variant="titleMedium">Trade</Text>
            <RadioButton.Group onValueChange={setTrade} value={trade}>
              {trades.map((item) => (
                <RadioButton.Item key={item} label={item} value={item} />
              ))}
            </RadioButton.Group>
            <TextInput
              label="Description"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
            {location ? (
              <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
                Location captured — nearby pros will see your request.
              </Text>
            ) : (
              <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
                Location unavailable — your request will be visible to all pros.
              </Text>
            )}
            <HelperText type="error" visible={Boolean(error)}>
              {error}
            </HelperText>
            <View style={{ marginTop: 12 }}>
              <Button mode="contained" loading={submitting} onPress={handleSubmit}>
                Create request
              </Button>
            </View>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}
