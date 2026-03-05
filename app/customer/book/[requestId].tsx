import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { CalSlot, createCalBooking, getCalSlots } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { BOOKING_TIMEZONE } from "../../../lib/config";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BOOKING_TIMEZONE,
  });
}

function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function BookScreen() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { session } = useAuth();
  const { colors } = useTheme();

  const [dates, setDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<{ [date: string]: CalSlot[] }>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState(session?.user?.user_metadata?.full_name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Build next 7 days
  useEffect(() => {
    const nextDays: Date[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      nextDays.push(d);
    }
    setDates(nextDays);
    setSelectedDate(nextDays[0]);
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !requestId) return;
    const dateKey = toISODateString(selectedDate);
    if (slots[dateKey]) return;

    setLoadingSlots(true);
    setSelectedSlot(null);

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    getCalSlots(requestId, start.toISOString(), end.toISOString())
      .then((data) => setSlots((prev) => ({ ...prev, ...data })))
      .catch(() => setError("Failed to load available times."))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, requestId]);

  const handleBook = async () => {
    setError(null);
    if (!selectedSlot) { setError("Please select a time."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }

    setBooking(true);
    try {
      await createCalBooking(requestId, selectedSlot, {
        name: name.trim(),
        email: email.trim(),
        timeZone: BOOKING_TIMEZONE,
      });
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBooking(false);
    }
  };

  if (confirmed) {
    return (
      <AuthGate>
        <RoleGuard requiredRole="customer">
          <Screen centered>
            <Text variant="headlineMedium">Booked!</Text>
            <Text style={{ marginTop: 8, marginBottom: 32, textAlign: "center" }}>
              Your onsite visit is confirmed. Check your email for details.
            </Text>
            <Button mode="contained" onPress={() => router.replace(`/customer/request/${requestId}`)}>
              Back to request
            </Button>
          </Screen>
        </RoleGuard>
      </AuthGate>
    );
  }

  const dateKey = selectedDate ? toISODateString(selectedDate) : null;
  const availableSlots = dateKey ? (slots[dateKey] ?? []) : [];

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <ScrollView>
            <Text variant="headlineSmall">Book onsite visit</Text>
            <Text style={{ marginTop: 4, marginBottom: 16, opacity: 0.6 }}>
              Pick a date and time for the pro to come to you.
            </Text>

            {/* Date selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {dates.map((date) => {
                  const isSelected = selectedDate && toISODateString(date) === toISODateString(selectedDate);
                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      onPress={() => { setSelectedDate(date); setSelectedSlot(null); }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                      }}
                    >
                      <Text style={{ color: isSelected ? colors.onPrimary : colors.onSurfaceVariant, fontWeight: "600" }}>
                        {formatDate(date)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Time slots */}
            {loadingSlots ? (
              <ActivityIndicator style={{ marginVertical: 24 }} />
            ) : availableSlots.length === 0 ? (
              <Text style={{ opacity: 0.5, marginBottom: 16 }}>No available times on this day.</Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.time;
                  return (
                    <TouchableOpacity
                      key={slot.time}
                      onPress={() => setSelectedSlot(slot.time)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.primary : colors.outline,
                        backgroundColor: isSelected ? colors.primaryContainer : colors.surface,
                      }}
                    >
                      <Text style={{ color: isSelected ? colors.primary : colors.onSurface }}>
                        {formatTime(slot.time)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Attendee info */}
            <TextInput
              label="Your name"
              value={name}
              onChangeText={setName}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Your email"
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
            />

            <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>

            <View style={{ marginTop: 8 }}>
              <Button mode="contained" loading={booking} onPress={handleBook}>
                Confirm booking
              </Button>
            </View>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}
