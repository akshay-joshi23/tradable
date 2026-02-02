import { z } from "zod";

export const tradeOptions = ["plumber", "handyman"] as const;

export const createRequestSchema = z.object({
  trade: z.enum(tradeOptions),
  description: z.string().min(10).max(1000),
});

export const outcomeSchema = z.object({
  callId: z.string().uuid(),
  diagnosisText: z.string().min(10).max(4000),
  nextStep: z.enum(["onsite_visit", "virtual_followup", "customer_fix", "quote_provided"]),
  estimateLow: z.number().int().nonnegative().nullable(),
  estimateHigh: z.number().int().nonnegative().nullable(),
  onsiteNeeded: z.boolean(),
});
