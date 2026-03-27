import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
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
  const insets = useSafeAreaInsets();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { session } = useAuth();

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
          <View style={[styles.confirmedContainer, { paddingTop: insets.top }]}>
            <View style={styles.confirmedIconCircle}>
              <MaterialCommunityIcons name="calendar-check" size={44} color="#1A4230" />
            </View>
            <Text style={styles.confirmedTitle}>Booked!</Text>
            <Text style={styles.confirmedSubtitle}>
              Your onsite visit is confirmed. Check your email for details.
            </Text>
            <TouchableOpacity
              style={styles.confirmedButton}
              onPress={() => router.replace(`/customer/request/${requestId}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmedButtonText}>Back to request</Text>
            </TouchableOpacity>
          </View>
        </RoleGuard>
      </AuthGate>
    );
  }

  const dateKey = selectedDate ? toISODateString(selectedDate) : null;
  const availableSlots = dateKey ? (slots[dateKey] ?? []) : [];

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Book onsite visit</Text>
            <Text style={styles.subtitle}>
              Pick a date and time for the pro to come to you.
            </Text>

            {/* Date selector */}
            <Text style={styles.sectionLabel}>Select a date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScroll}
              contentContainerStyle={styles.dateScrollContent}
            >
              {dates.map((date) => {
                const isSelected = selectedDate && toISODateString(date) === toISODateString(selectedDate);
                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    onPress={() => { setSelectedDate(date); setSelectedSlot(null); }}
                    style={[styles.datePill, isSelected && styles.datePillActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.datePillText, isSelected && styles.datePillTextActive]}>
                      {formatDate(date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time slots */}
            <Text style={styles.sectionLabel}>Available times</Text>
            {loadingSlots ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#1A4230" size="small" />
                <Text style={styles.loadingText}>Loading times…</Text>
              </View>
            ) : availableSlots.length === 0 ? (
              <Text style={styles.noSlotsText}>No available times on this day.</Text>
            ) : (
              <View style={styles.slotGrid}>
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.time;
                  return (
                    <TouchableOpacity
                      key={slot.time}
                      onPress={() => setSelectedSlot(slot.time)}
                      style={[styles.slotPill, isSelected && styles.slotPillActive]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.slotPillText, isSelected && styles.slotPillTextActive]}>
                        {formatTime(slot.time)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Attendee info */}
            <Text style={styles.sectionLabel}>Your details</Text>
            <View style={styles.card}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor="#9A9A9A"
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#9A9A9A"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, booking && styles.submitButtonDisabled]}
              onPress={handleBook}
              disabled={booking}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>
                {booking ? "Booking…" : "Confirm booking"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A4230",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#5A5A5A",
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#9A9A9A",
    marginBottom: 10,
  },
  dateScroll: {
    marginBottom: 20,
  },
  dateScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  datePill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  datePillActive: {
    backgroundColor: "#1A4230",
    borderColor: "#1A4230",
  },
  datePillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  datePillTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 13,
    color: "#9A9A9A",
  },
  noSlotsText: {
    fontSize: 13,
    color: "#9A9A9A",
    marginBottom: 20,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  slotPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#FFF",
  },
  slotPillActive: {
    borderColor: "#1A4230",
    backgroundColor: "#EDF2EF",
  },
  slotPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  slotPillTextActive: {
    color: "#1A4230",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#9A9A9A",
  },
  input: {
    fontSize: 15,
    color: "#111",
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#1A4230",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Confirmed state
  confirmedContainer: {
    flex: 1,
    backgroundColor: "#F4F2EE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  confirmedIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  confirmedTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
  },
  confirmedSubtitle: {
    fontSize: 14,
    color: "#5A5A5A",
    textAlign: "center",
    lineHeight: 21,
  },
  confirmedButton: {
    backgroundColor: "#1A4230",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  confirmedButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
