import { Stack } from "expo-router";

export default function CustomerLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-request" options={{ title: "New Request" }} />
      <Stack.Screen name="request/[id]" options={{ title: "Request Details" }} />
      <Stack.Screen name="book/[requestId]" options={{ title: "Book Appointment" }} />
      <Stack.Screen name="call-detail/[id]" options={{ title: "Call Details" }} />
      <Stack.Screen name="pro/[id]" options={{ title: "Pro Profile" }} />
      <Stack.Screen name="call-complete/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="pros" options={{ headerShown: false }} />
    </Stack>
  );
}
