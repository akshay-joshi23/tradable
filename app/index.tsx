import { Redirect } from "expo-router";
import { ActivityIndicator, Text } from "react-native-paper";

import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  if (authLoading || roleLoading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (role === "customer") {
    return <Redirect href="/customer/new-request" />;
  }

  if (role === "pro") {
    return <Redirect href="/pro/dashboard" />;
  }

  // Session exists but no role yet — wait, don't redirect (avoids login loop)
  return (
    <Screen centered>
      <ActivityIndicator />
    </Screen>
  );
}
