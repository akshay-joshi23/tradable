import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator, Button, HelperText, Text, TextInput } from "react-native-paper";

import { Screen } from "./Screen";
import { getAuthRedirectUri, signInWithGoogle } from "../lib/auth-helpers";
import { useAuth } from "../lib/auth";
import { useRole, Role } from "../lib/role";
import { supabase } from "../lib/supabase";

type Props = {
  role: Role;
  title: string;
  subtitle: string;
};

export function LoginForm({ role, title, subtitle }: Props) {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { setRole } = useRole();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      setRole(role).then(() => router.replace("/"));
    }
  }, [loading, session]);

  if (!loading && session) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }

  const handleSendLink = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setSending(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: getAuthRedirectUri() },
    });
    setSending(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setMessage("Magic link sent. Check your email to finish signing in.");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen>
      <Text variant="headlineSmall">{title}</Text>
      <Text style={{ marginTop: 8, marginBottom: 16 }}>{subtitle}</Text>
      <View style={{ marginBottom: 16 }}>
        <Button
          mode="contained"
          loading={googleLoading}
          onPress={handleGoogleSignIn}
          icon="google"
        >
          Sign in with Google
        </Button>
      </View>
      <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
        Or sign in with email
      </Text>
      <TextInput
        label="Email"
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      {message ? (
        <HelperText type="info" visible>
          {message}
        </HelperText>
      ) : null}
      <View style={{ marginTop: 8 }}>
        <Button mode="contained" loading={sending} onPress={handleSendLink}>
          Send magic link
        </Button>
      </View>
      <Button mode="text" onPress={() => router.back()} style={{ marginTop: 16 }}>
        Back
      </Button>
    </Screen>
  );
}
