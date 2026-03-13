import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { useRole } from "../../../lib/role";
import { supabase } from "../../../lib/supabase";
import { useState } from "react";

export default function CustomerProfileTab() {
  const { clearRole } = useRole();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await clearRole();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <Text style={styles.heading}>Profile</Text>
          <View style={styles.placeholder}>
            <Text style={styles.emoji}>👤</Text>
            <Text style={styles.label}>Profile tab</Text>
          </View>
          <Button
            mode="text"
            onPress={handleSignOut}
            loading={signingOut}
            style={styles.signOutButton}
            labelStyle={styles.signOutLabel}
            icon="logout"
          >
            Sign Out
          </Button>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5, marginTop: 8, marginBottom: 20 },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emoji: { fontSize: 48 },
  label: { fontSize: 16, color: "#94A3B8" },
  signOutButton: { marginBottom: 8 },
  signOutLabel: { color: "#DC2626", fontSize: 14 },
});
