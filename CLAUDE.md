# Tradable — Claude Code Instructions

## What this app is
Tradable connects homeowners (customers) with vetted trade professionals (pros) for paid remote video consultations via LiveKit. After a call, pros submit a diagnosis and repair estimate. Customers can then book onsite visits via Cal.com.

## Running the project

```bash
# Mobile (from repo root)
npx expo start

# Backend (from repo root)
cd backend && npm run dev

# Both are required for the app to function
```

## Architecture rules — never break these

1. **Mobile never writes to Supabase directly.** All DB mutations go through the Express backend (`backend/src/index.ts`). Mobile uses Supabase only for auth session management.
2. **LiveKit tokens are always server-issued.** Never generate a LiveKit token in mobile code. Always call `POST /api/livekit/token`.
3. **Stripe secret key stays on the backend.** `STRIPE_SECRET_KEY` and `CAL_API_KEY` must never appear in mobile code or env vars prefixed with `EXPO_PUBLIC_`.
4. **Backend validates auth on every protected route.** Use the `requireAuth` middleware (validates Bearer JWT via `supabase.auth.getUser()`). Use `requireUserRole(["customer"|"pro"])` for role-gated routes.
5. **Role source of truth is SecureStore + user_profiles.** Mobile reads role from SecureStore (`tradable.role`). Backend reads from `user_profiles` table. Keep these in sync on login.

## Key file map

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | All Express API routes (single file) |
| `lib/api.ts` | All mobile → backend API calls |
| `lib/auth.tsx` | AuthProvider + useAuth hook (Supabase session) |
| `lib/role.tsx` | RoleProvider + useRole hook (SecureStore-backed) |
| `lib/types.ts` | Shared TypeScript types |
| `supabase/schema.sql` | DB schema (run migrations manually via Supabase dashboard) |
| `app/_layout.tsx` | Root provider stack |
| `app/index.tsx` | Auth + role → redirect logic |

## Adding a new API route

1. Add the route handler in `backend/src/index.ts`
2. Add a Zod schema for the request body
3. Use `requireAuth` (and `requireUserRole` if role-gated)
4. Add a corresponding function in `lib/api.ts` on the mobile side
5. Use `apiFetch()` — it handles auth headers and base URL automatically

## Adding a new screen

1. Create the file under `app/customer/` or `app/pro/` following expo-router file conventions
2. Wrap content in `<Screen>` component for consistent layout
3. Customer screens: protected by `app/customer/_layout.tsx` (has role enforcement)
4. Pro screens: protected by `app/pro/_layout.tsx`
5. Shared screens (e.g. call room): live under `app/` root

## Database changes

- Edit `supabase/schema.sql` to reflect the new state
- Apply the change manually via Supabase dashboard SQL editor or `supabase db push`
- Update `lib/types.ts` to match any added/removed columns
- Update affected routes in `backend/src/index.ts`

## Code conventions

- **TypeScript everywhere.** No `any` unless absolutely necessary — prefer `unknown` and narrow.
- **Zod for all external input.** Validate every request body in the backend with a Zod schema before touching the DB.
- **No inline styles.** Use `StyleSheet.create()` in React Native screens.
- **react-native-paper components** for UI (Button, TextInput, Card, etc.). Match the existing green color scheme (`#2D6A4F` primary).
- **`apiFetch` for all API calls.** Never use raw `fetch` in screens — always go through `lib/api.ts`.
- **Error handling:** Show user-facing errors via `Alert.alert()` or inline error state. Never swallow errors silently.

## DB schema facts (avoid mistakes)

- `requests.customer_id` is a UUID FK to `auth.users` (NOT `customer_email`)
- `requests.claimed_by` is a UUID FK to `pro_profiles.user_id` (NOT a text field)
- `requests.status` lifecycle: `open` → `matched` → `in_call` → `completed` (also: `canceled`, `expired`)
- `requests.payment_status`: `unpaid` → `paid`
- Request TTL: 10 minutes. Backend job expires old open requests automatically.
- Platform fee: 5% (`PLATFORM_FEE_PERCENT = 0.05` in backend)

## Environment variables

**Mobile** (prefix all with `EXPO_PUBLIC_`): `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LIVEKIT_URL`

**Backend only** (never expose to mobile): `SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `STRIPE_SECRET_KEY`, `CAL_API_KEY`

## What not to do

- Don't add new dependencies without checking if existing ones already cover the use case
- Don't modify RLS policies without understanding the full access pattern — wrong RLS = data leak or broken app
- Don't create new Supabase clients in components; use the singleton in `lib/supabase.ts`
- Don't store sensitive data (tokens, keys) in AsyncStorage; use SecureStore
- Don't add loading spinners or optimistic UI unless the existing patterns already use them — stay consistent
