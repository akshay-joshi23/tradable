import { Stack } from "expo-router";

export default function ProLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ title: "Profile Setup" }} />
      <Stack.Screen name="outcome/[callId]" options={{ title: "Submit Outcome" }} />
      <Stack.Screen name="call-detail/[id]" options={{ title: "Call Details" }} />
      <Stack.Screen name="edit/profile" options={{ headerShown: false }} />
      <Stack.Screen name="edit/certifications" options={{ headerShown: false }} />
      <Stack.Screen name="edit/service-area" options={{ headerShown: false }} />
      <Stack.Screen name="edit/fee" options={{ headerShown: false }} />
    </Stack>
  );
}
