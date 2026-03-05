export type RequestStatus = "open" | "matched" | "in_call" | "completed" | "canceled";

export type ProProfile = {
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

// Shape used when submitting an outcome (pro → backend)
export type OutcomePayload = {
  diagnosis: string;
  estimateMin: number;
  estimateMax: number;
  onsiteNeeded: boolean;
};

// Shape returned by the backend when reading an outcome
export type Outcome = {
  diagnosis: string;
  estimateMin: number | null;
  estimateMax: number | null;
  onsiteNeeded: boolean;
};

export type Request = {
  id: string;
  trade: string;
  description: string;
  status: RequestStatus;
  created_at: string;
  customer_id: string | null;
  claimed_by: string | null;
  outcome?: Outcome | null;
};
