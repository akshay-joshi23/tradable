import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { IconButton, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StripeProvider } from "@stripe/stripe-react-native";

import { AuthProvider } from "../lib/auth";
import { useRole, RoleProvider } from "../lib/role";
import { supabase } from "../lib/supabase";

function LogoutButton() {
  const { clearRole } = useRole();
  return (
    <IconButton
      icon="logout"
      size={22}
      onPress={() => {
        supabase.auth.signOut()
          .then(() => clearRole())
          .catch((err) => console.error("Logout failed:", err));
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}>
        <PaperProvider>
          <AuthProvider>
            <RoleProvider>
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerTitleAlign: "center",
                  headerRight: () => <LogoutButton />,
                }}
              >
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="login/customer" options={{ headerShown: false }} />
                <Stack.Screen name="login/pro" options={{ headerShown: false }} />
              </Stack>
            </RoleProvider>
          </AuthProvider>
        </PaperProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
