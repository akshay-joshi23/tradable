import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, HelperText, Switch, Text, TextInput } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { Screen } from "../../../components/Screen";
import { RoleGuard } from "../../../components/RoleGuard";
import { submitOutcome } from "../../../lib/api";

export default function OutcomeScreen() {
  const router = useRouter();
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [diagnosis, setDiagnosis] = useState("");
  const [estimateMin, setEstimateMin] = useState("");
  const [estimateMax, setEstimateMax] = useState("");
  const [onsiteNeeded, setOnsiteNeeded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!callId) {
      setError("Missing call id.");
      return;
    }
    if (!diagnosis.trim()) {
      setError("Please add a diagnosis.");
      return;
    }
    const minValue = Number(estimateMin);
    const maxValue = Number(estimateMax);
    if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
      setError("Please provide estimate numbers.");
      return;
    }
    setSubmitting(true);
    try {
      await submitOutcome(callId, {
        diagnosis: diagnosis.trim(),
        estimateMin: minValue,
        estimateMax: maxValue,
        onsiteNeeded,
      });
      router.replace("/pro/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit outcome.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <ScrollView>
            <Text variant="headlineSmall">Outcome summary</Text>
            <Text style={{ marginTop: 8, marginBottom: 12 }}>
              Provide a quick diagnosis and estimate range.
            </Text>
            <TextInput
              label="Diagnosis"
              multiline
              numberOfLines={3}
              value={diagnosis}
              onChangeText={setDiagnosis}
            />
            <View style={{ marginTop: 12 }}>
              <TextInput
                label="Estimate min ($)"
                keyboardType="numeric"
                value={estimateMin}
                onChangeText={setEstimateMin}
              />
            </View>
            <View style={{ marginTop: 12 }}>
              <TextInput
                label="Estimate max ($)"
                keyboardType="numeric"
                value={estimateMax}
                onChangeText={setEstimateMax}
              />
            </View>
            <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
              <Switch value={onsiteNeeded} onValueChange={setOnsiteNeeded} />
              <Text style={{ marginLeft: 12 }}>Onsite visit needed</Text>
            </View>
            <HelperText type="error" visible={Boolean(error)}>
              {error}
            </HelperText>
            <View style={{ marginTop: 12 }}>
              <Button mode="contained" loading={submitting} onPress={handleSubmit}>
                Submit outcome
              </Button>
            </View>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}
