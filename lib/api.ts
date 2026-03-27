import { OutcomePayload, ProProfile, Request } from "./types";
import { supabase } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type LiveKitTokenResponse = {
  token: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const body = await response.json().catch(() => ({ ok: false, message: "Invalid server response." }));

  if (!body.ok) {
    throw new Error(body.message || "Request failed");
  }

  return body.data as T;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export async function createRequest(
  trade: string,
  description: string,
  location?: { latitude: number; longitude: number }
): Promise<Request> {
  return request<Request>("/api/requests", {
    method: "POST",
    body: JSON.stringify({ trade, description, ...location }),
  });
}

export async function getRequest(id: string): Promise<Request> {
  return request<Request>(`/api/requests?id=${encodeURIComponent(id)}`);
}

export async function listOpenRequests(): Promise<Request[]> {
  return request<Request[]>("/api/requests?status=open");
}

export async function claimRequest(requestId: string): Promise<Request> {
  return request<Request>(`/api/requests/${requestId}/match`, {
    method: "POST",
  });
}

// ─── LiveKit ──────────────────────────────────────────────────────────────────

export async function getLiveKitToken(roomId: string): Promise<string> {
  const data = await request<LiveKitTokenResponse>("/api/livekit/token", {
    method: "POST",
    body: JSON.stringify({ roomId }),
  });
  return data.token;
}

// ─── Outcomes ─────────────────────────────────────────────────────────────────

export async function submitOutcome(callId: string, outcomePayload: OutcomePayload): Promise<void> {
  await request<void>("/api/outcomes", {
    method: "POST",
    body: JSON.stringify({ callId, ...outcomePayload }),
  });
}

// ─── Pro profile ──────────────────────────────────────────────────────────────

export async function getProProfile(): Promise<ProProfile | null> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/pro/profile`, {
    headers: { "Content-Type": "application/json", ...authHeaders },
  });

  if (response.status === 404) return null;

  const body = await response.json().catch(() => ({ ok: false, message: "Invalid server response." }));
  if (!body.ok) throw new Error(body.message || "Failed to load profile.");
  return body.data as ProProfile;
}

export async function saveProProfile(params: {
  fullName: string;
  email: string;
  phone: string;
  trade: string;
  calUsername?: string;
  consultationPriceCents: number;
  photoUrl?: string;
  displayName?: string;
  yearsOfExperience?: number;
  businessNumber?: string;
  certifications?: string;
  location?: { latitude: number; longitude: number };
  serviceRadiusMiles?: number;
}): Promise<ProProfile> {
  return request<ProProfile>("/api/pro/profile", {
    method: "POST",
    body: JSON.stringify({
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      trade: params.trade,
      ...(params.calUsername ? { calUsername: params.calUsername } : {}),
      consultationPriceCents: params.consultationPriceCents,
      photoUrl: params.photoUrl,
      displayName: params.displayName,
      yearsOfExperience: params.yearsOfExperience,
      businessNumber: params.businessNumber,
      certifications: params.certifications,
      latitude: params.location?.latitude,
      longitude: params.location?.longitude,
      serviceRadiusMiles: params.serviceRadiusMiles,
    }),
  });
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

export async function uploadAvatar(localUri: string, userId: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const path = `${userId}.jpg`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function updateProPhotoUrl(photoUrl: string): Promise<void> {
  await request("/api/pro/profile/photo", {
    method: "PATCH",
    body: JSON.stringify({ photoUrl }),
  });
}

// ─── Auth / role ──────────────────────────────────────────────────────────────

export async function getUserRole(): Promise<"customer" | "pro" | null> {
  try {
    const data = await request<{ role: string }>("/api/auth/role");
    return data.role as "customer" | "pro";
  } catch {
    return null;
  }
}

export async function setUserRole(role: "customer" | "pro"): Promise<"customer" | "pro"> {
  const data = await request<{ role: string }>("/api/auth/role", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  return data.role as "customer" | "pro";
}

export async function updateConsultationFee(consultationPriceCents: number): Promise<void> {
  await request("/api/pro/profile/fee", {
    method: "PATCH",
    body: JSON.stringify({ consultationPriceCents }),
  });
}

// ─── Browse pros ──────────────────────────────────────────────────────────────

export type ProSummary = {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  trade: string;
  photo_url: string | null;
  years_of_experience: number | null;
  consultation_price_cents: number;
  cal_username: string | null;
  certifications: string | null;
};

export async function listPros(trade?: string): Promise<ProSummary[]> {
  const qs = trade ? `?trade=${encodeURIComponent(trade)}` : "";
  return request<ProSummary[]>(`/api/pros${qs}`);
}

// ─── Customer call history ────────────────────────────────────────────────────

export type CustomerCall = {
  id: string;
  trade: string;
  description: string;
  status: string;
  created_at: string;
  outcome: {
    diagnosis: string;
    estimateMin: number | null;
    estimateMax: number | null;
    onsiteNeeded: boolean;
  } | null;
};

export async function listCustomerCalls(): Promise<CustomerCall[]> {
  return request<CustomerCall[]>("/api/customer/calls");
}

// ─── Pro call history ─────────────────────────────────────────────────────────

export type ProCall = {
  id: string;
  trade: string;
  description: string;
  created_at: string;
  outcome: {
    diagnosis: string;
    estimateMin: number | null;
    estimateMax: number | null;
    onsiteNeeded: boolean;
  } | null;
};

export async function listProCalls(): Promise<ProCall[]> {
  return request<ProCall[]>("/api/pro/calls");
}

// ─── Stripe ───────────────────────────────────────────────────────────────────

export async function createPaymentIntent(requestId: string): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  calUsername: string | null;
}> {
  return request("/api/stripe/payment-intent", {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });
}

export async function confirmPayment(requestId: string, paymentIntentId: string): Promise<void> {
  await request("/api/stripe/confirm-payment", {
    method: "POST",
    body: JSON.stringify({ requestId, paymentIntentId }),
  });
}

// ─── Stripe Connect ───────────────────────────────────────────────────────────

export async function getStripeConnectOnboardingUrl(): Promise<string> {
  const data = await request<{ url: string }>("/api/stripe/connect/onboard", { method: "POST" });
  return data.url;
}

export async function getStripeConnectStatus(): Promise<{ connected: boolean; chargesEnabled?: boolean; payoutsEnabled?: boolean }> {
  return request("/api/stripe/connect/status");
}

// ─── Cal.com booking ──────────────────────────────────────────────────────────

export type CalSlot = { time: string };
export type CalSlotsResponse = { [date: string]: CalSlot[] };

export async function getCalSlots(
  requestId: string,
  startTime: string,
  endTime: string
): Promise<CalSlotsResponse> {
  return request<CalSlotsResponse>(
    `/api/cal/slots?requestId=${encodeURIComponent(requestId)}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
  );
}

export type CalBookingAttendee = { name: string; email: string; timeZone: string };

export async function createCalBooking(
  requestId: string,
  start: string,
  attendee: CalBookingAttendee
): Promise<{ uid: string }> {
  return request<{ uid: string }>("/api/cal/bookings", {
    method: "POST",
    body: JSON.stringify({ requestId, start, attendee }),
  });
}
