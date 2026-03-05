import { Redirect, useRouter } from "expo-router";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  // Only skip login if we have both a session and a role
  if (!authLoading && !roleLoading && session && role) {
    return <Redirect href="/" />;
  }

  return (
    <Screen centered>
      <Text variant="headlineMedium">Welcome to Tradable</Text>
      <Text style={{ marginTop: 8, marginBottom: 40, textAlign: "center" }}>
        How are you using Tradable?
      </Text>
      <View style={{ width: "100%", gap: 16 }}>
        <Button mode="contained" onPress={() => router.push("/login/customer")}>
          I'm a Customer
        </Button>
        <Button mode="outlined" onPress={() => router.push("/login/pro")}>
          I'm a Pro
        </Button>
      </View>
    </Screen>
  );
}
