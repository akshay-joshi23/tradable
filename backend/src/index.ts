import "dotenv/config";

import cors from "cors";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";
import Stripe from "stripe";
import { z } from "zod";

// ─── Env validation ───────────────────────────────────────────────────────────

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "CAL_API_KEY",
];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`FATAL: Missing required env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const livekitApiKey = process.env.LIVEKIT_API_KEY!;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET!;
const calApiKey = process.env.CAL_API_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const port = 3000;

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/(?:10|192\.168)\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
      allowed
        ? callback(null, true)
        : callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

// ─── External clients ─────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const CAL_API_BASE = "https://api.cal.com/v2";
const CAL_HEADERS = {
  Authorization: `Bearer ${calApiKey}`,
  "cal-api-version": "2024-06-11",
  "Content-Type": "application/json",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestRecord = {
  id: string;
  trade: string;
  description: string;
  status: string;
  created_at: string;
  customer_id: string | null;
  claimed_by: string | null;
  latitude: number | null;
  longitude: number | null;
};

type OutcomeRecord = {
  id: string;
  call_id: string;
  diagnosis: string;
  estimate_low: number | null;
  estimate_high: number | null;
  onsite_needed: boolean;
  created_at: string;
};

type ProProfileRecord = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  display_name: string | null;
  trade: string;
  years_of_experience: number | null;
  business_number: string | null;
  certifications: string | null;
  cal_username: string | null;
  consultation_price_cents: number;
  latitude: number | null;
  longitude: number | null;
  service_radius_miles: number | null;
  created_at: string;
};

type AuthedRequest = express.Request & { userId: string; userEmail: string };

// ─── Response helpers ─────────────────────────────────────────────────────────

const ok = <T>(res: express.Response, data: T, status = 200) =>
  res.status(status).json({ ok: true, data });

const fail = (res: express.Response, message: string, status = 400) =>
  res.status(status).json({ ok: false, message });

const zodMessage = (e: z.ZodError) =>
  e.issues[0]?.message ?? "Invalid request.";

// ─── Auth middleware ──────────────────────────────────────────────────────────

const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return fail(res, "You must be signed in to do this.", 401);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return fail(res, "Your session has expired. Please sign in again.", 401);

  (req as AuthedRequest).userId = user.id;
  (req as AuthedRequest).userEmail = user.email ?? "";
  next();
};

// ─── Haversine distance (miles) ───────────────────────────────────────────────

function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ─── Helper: resolve pro's Cal event type from a request ─────────────────────

async function getCalEventTypeForRequest(
  requestId: string,
  res: express.Response
): Promise<number | null> {
  const { data: requestData, error: requestError } = await supabase
    .from("requests")
    .select("claimed_by")
    .eq("id", requestId)
    .single();

  if (requestError || !requestData) {
    fail(res, "Request not found.", 404);
    return null;
  }

  if (!requestData.claimed_by) {
    fail(res, "No pro has been matched to this request yet.", 409);
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("pro_profiles")
    .select("cal_username")
    .eq("user_id", requestData.claimed_by)
    .single();

  if (profileError || !profile?.cal_username) {
    fail(res, "The matched pro hasn't set up their booking profile yet.", 409);
    return null;
  }

  // Fetch the pro's first event type from Cal.com using their username
  const calRes = await fetch(
    `${CAL_API_BASE}/event-types?username=${encodeURIComponent(profile.cal_username)}`,
    { headers: CAL_HEADERS }
  );
  const calData = await calRes.json();

  const eventTypes: { id: number; slug: string }[] = calData?.data ?? [];
  if (!eventTypes.length) {
    fail(res, "The pro's Cal.com account has no event types set up.", 409);
    return null;
  }

  return eventTypes[0].id;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const createRequestSchema = z.object({
  trade: z.string().min(1, "Please select a trade.").max(100, "Trade name is too long."),
  description: z
    .string()
    .min(5, "Please describe the issue in a bit more detail.")
    .max(2000, "Description is too long — please keep it under 2000 characters."),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const outcomeSchema = z.object({
  callId: z.string().uuid("Invalid call ID."),
  diagnosis: z
    .string()
    .min(1, "Please provide a diagnosis.")
    .max(2000, "Diagnosis is too long."),
  estimateMin: z.number().min(0, "Estimate must be a positive number.").optional(),
  estimateMax: z.number().min(0, "Estimate must be a positive number.").optional(),
  onsiteNeeded: z.boolean(),
}).refine(
  (d) => d.estimateMin == null || d.estimateMax == null || d.estimateMax >= d.estimateMin,
  { message: "Estimate max must be greater than or equal to estimate min." }
);

const proProfileSchema = z.object({
  fullName: z.string().min(1, "Full legal name is required.").max(200),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(7, "Please enter a valid phone number.").max(30),
  photoUrl: z.string().url("Invalid photo URL.").optional(),
  displayName: z.string().max(100, "Display name is too long.").optional(),
  trade: z.string().min(1, "Please select a trade.").max(100, "Trade name is too long."),
  yearsOfExperience: z.number().int().min(0).max(60).optional(),
  businessNumber: z.string().max(100).optional(),
  certifications: z.string().max(500).optional(),
  calUsername: z.string().min(1, "Cal.com username is required.").max(100),
  consultationPriceCents: z
    .number()
    .int("Price must be a whole number of cents.")
    .min(100, "Minimum price is $1.")
    .max(100000, "Maximum price is $1,000."),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  serviceRadiusMiles: z.number().int().min(1).max(500).optional(),
});

const calSlotsSchema = z.object({
  requestId: z.string().uuid("Invalid request ID."),
  startTime: z.string().datetime({ offset: true, message: "Invalid start time." }),
  endTime: z.string().datetime({ offset: true, message: "Invalid end time." }),
});

const calBookingSchema = z.object({
  requestId: z.string().uuid("Invalid request ID."),
  start: z.string().datetime({ offset: true, message: "Invalid start time." }),
  attendee: z.object({
    name: z.string().min(1, "Please enter your name."),
    email: z.string().email("Please enter a valid email address."),
    timeZone: z.string(),
  }),
});

// ─── Request routes ───────────────────────────────────────────────────────────

app.post("/api/requests", requireAuth, async (req, res) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const { trade, description, latitude, longitude } = parsed.data;
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("requests")
    .insert({
      trade,
      description,
      status: "open",
      customer_id: userId,
      claimed_by: null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/requests]", error.message);
    return fail(res, "Failed to create request. Please try again.", 500);
  }

  return ok(res, data as RequestRecord, 201);
});

app.get("/api/requests", requireAuth, async (req, res) => {
  const { id, status } = req.query as { id?: string; status?: string };

  if (id) {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return fail(res, "Request not found.", 404);

    const { data: outcome } = await supabase
      .from("outcomes")
      .select("*")
      .eq("call_id", id)
      .maybeSingle();

    const o = outcome as OutcomeRecord | null;

    return ok(res, {
      ...data,
      outcome: o
        ? {
            diagnosis: o.diagnosis,
            estimateMin: o.estimate_low ?? null,
            estimateMax: o.estimate_high ?? null,
            onsiteNeeded: o.onsite_needed,
          }
        : null,
    });
  }

  if (status === "open") {
    const userId = (req as AuthedRequest).userId;

    const [requestsResult, profileResult] = await Promise.all([
      supabase.from("requests").select("*").eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("pro_profiles").select("latitude, longitude, service_radius_miles").eq("user_id", userId).maybeSingle(),
    ]);

    if (requestsResult.error) {
      console.error("[GET /api/requests]", requestsResult.error.message);
      return fail(res, "Failed to load requests. Please try again.", 500);
    }

    let results = requestsResult.data as RequestRecord[];
    const profile = profileResult.data;

    if (
      profile?.latitude != null &&
      profile?.longitude != null &&
      profile?.service_radius_miles != null
    ) {
      results = results.filter((r) => {
        // Include requests with no location so they're always visible
        if (r.latitude == null || r.longitude == null) return true;
        const dist = haversineDistanceMiles(profile.latitude!, profile.longitude!, r.latitude, r.longitude);
        return dist <= profile.service_radius_miles!;
      });
    }

    return ok(res, results);
  }

  return fail(res, "Provide id or status=open.");
});

app.post("/api/requests/:requestId/match", requireAuth, async (req, res) => {
  const { requestId } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("requests")
    .update({ status: "matched", claimed_by: userId })
    .eq("id", requestId)
    .eq("status", "open")
    .select()
    .single();

  if (error || !data) {
    return fail(res, "This request has already been claimed.", 409);
  }

  return ok(res, data as RequestRecord);
});

// ─── LiveKit routes ───────────────────────────────────────────────────────────

app.post("/api/livekit/token", requireAuth, async (req, res) => {
  const { roomId } = req.body ?? {};
  if (!roomId || typeof roomId !== "string") {
    return fail(res, "roomId is required.");
  }

  const userId = (req as AuthedRequest).userId;
  const identity = `user-${userId}-${Date.now()}`;

  const token = new AccessToken(livekitApiKey, livekitApiSecret, { identity });
  token.addGrant({ room: roomId, roomJoin: true, canPublish: true, canSubscribe: true });

  const jwt = await token.toJwt();
  return ok(res, { token: jwt });
});

// ─── Outcome routes ───────────────────────────────────────────────────────────

app.post("/api/outcomes", requireAuth, async (req, res) => {
  const parsed = outcomeSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const { callId, diagnosis, estimateMin, estimateMax, onsiteNeeded } = parsed.data;

  const { error } = await supabase.from("outcomes").insert({
    call_id: callId,
    diagnosis,
    estimate_low: estimateMin ?? null,
    estimate_high: estimateMax ?? null,
    onsite_needed: onsiteNeeded,
  });

  if (error) {
    console.error("[POST /api/outcomes]", error.message);
    return fail(res, "Failed to save the outcome. Please try again.", 500);
  }

  await supabase.from("requests").update({ status: "completed" }).eq("id", callId);

  return ok(res, { saved: true });
});

// ─── Pro profile routes ───────────────────────────────────────────────────────

app.get("/api/pro/profile", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("pro_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/pro/profile]", error.message);
    return fail(res, "Failed to load profile. Please try again.", 500);
  }

  if (!data) return fail(res, "Pro profile not found.", 404);

  return ok(res, data as ProProfileRecord);
});

app.post("/api/pro/profile", requireAuth, async (req, res) => {
  const parsed = proProfileSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const {
    fullName, email, phone, photoUrl, displayName,
    trade, yearsOfExperience, businessNumber, certifications,
    calUsername, consultationPriceCents, latitude, longitude, serviceRadiusMiles,
  } = parsed.data;
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("pro_profiles")
    .upsert(
      {
        user_id: userId,
        full_name: fullName,
        email,
        phone,
        photo_url: photoUrl ?? null,
        display_name: displayName ?? null,
        trade,
        years_of_experience: yearsOfExperience ?? null,
        business_number: businessNumber ?? null,
        certifications: certifications ?? null,
        cal_username: calUsername,
        consultation_price_cents: consultationPriceCents,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        service_radius_miles: serviceRadiusMiles ?? null,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[POST /api/pro/profile]", error.message);
    return fail(res, "Failed to save profile. Please try again.", 500);
  }

  return ok(res, data as ProProfileRecord, 201);
});

// ─── Stripe routes ────────────────────────────────────────────────────────────

const PLATFORM_FEE_PERCENT = 0.05;

app.post("/api/stripe/payment-intent", requireAuth, async (req, res) => {
  if (!stripe) return fail(res, "Payments are not configured yet.", 503);

  const { requestId } = req.body;
  if (!requestId || typeof requestId !== "string") return fail(res, "requestId is required.");

  // Look up the request to find the claimed pro
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("claimed_by, payment_status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) return fail(res, "Request not found.", 404);
  if (request.payment_status === "paid") return fail(res, "This consultation has already been paid.", 409);
  if (!request.claimed_by) return fail(res, "No pro has been matched to this request.", 409);

  // Look up the pro's price and Cal.com username
  const { data: profile, error: profileError } = await supabase
    .from("pro_profiles")
    .select("consultation_price_cents, cal_username, full_name")
    .eq("user_id", request.claimed_by)
    .single();

  if (profileError || !profile) return fail(res, "Pro profile not found.", 404);

  const amount = profile.consultation_price_cents as number;
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    metadata: { requestId, platformFeeCents: platformFee },
    description: `Tradable consultation with ${profile.full_name ?? "pro"}`,
  });

  return ok(res, {
    clientSecret: paymentIntent.client_secret,
    amount,
    calUsername: profile.cal_username,
  });
});

app.post("/api/stripe/confirm-payment", requireAuth, async (req, res) => {
  if (!stripe) return fail(res, "Payments are not configured yet.", 503);

  const { requestId, paymentIntentId } = req.body;
  if (!requestId || !paymentIntentId) return fail(res, "requestId and paymentIntentId are required.");

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") return fail(res, "Payment has not succeeded.", 402);

  await supabase
    .from("requests")
    .update({ payment_status: "paid", amount_paid_cents: paymentIntent.amount })
    .eq("id", requestId);

  return ok(res, { paid: true });
});

// ─── Cal.com routes ───────────────────────────────────────────────────────────

app.get("/api/cal/slots", requireAuth, async (req, res) => {
  const parsed = calSlotsSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const { requestId, startTime, endTime } = parsed.data;

  const eventTypeId = await getCalEventTypeForRequest(requestId, res);
  if (eventTypeId === null) return;

  const url = `${CAL_API_BASE}/slots/available?eventTypeId=${eventTypeId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;

  const calRes = await fetch(url, { headers: CAL_HEADERS });
  const calData = await calRes.json();

  if (!calRes.ok) {
    console.error("[GET /api/cal/slots]", calData);
    return fail(res, "Failed to load available times. Please try again.", 502);
  }

  return ok(res, calData.data?.slots ?? calData.data);
});

app.post("/api/cal/bookings", requireAuth, async (req, res) => {
  const parsed = calBookingSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const { requestId, start, attendee } = parsed.data;

  const eventTypeId = await getCalEventTypeForRequest(requestId, res);
  if (eventTypeId === null) return;

  const calRes = await fetch(`${CAL_API_BASE}/bookings`, {
    method: "POST",
    headers: CAL_HEADERS,
    body: JSON.stringify({ eventTypeId, start, attendee }),
  });
  const calData = await calRes.json();

  if (!calRes.ok) {
    console.error("[POST /api/cal/bookings]", calData);
    return fail(res, "Failed to confirm the booking. Please try again.", 502);
  }

  return ok(res, calData.data);
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
