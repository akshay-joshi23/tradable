# Tradable MVP

Tradable connects homeowners with vetted pros for quick remote diagnostics over LiveKit video.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   LIVEKIT_API_KEY=
   LIVEKIT_API_SECRET=
   LIVEKIT_URL=
   ```
   You can copy from `env.example` and rename it to `.env.example`
   if you want a tracked template file.
3. Apply the Supabase schema in `supabase/schema.sql` (SQL editor or migration).
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Supabase notes

- RLS is enabled on all tables. Server routes use the service role key for
  write operations after verifying the authenticated user.
- Users sign in with magic links (`/login`).

## Seed data (pro profile)

Create a pro profile for a user (replace `USER_ID` with the auth user UUID):

```sql
insert into pro_profiles (user_id, trade, service_radius_miles, min_consult_price, availability_text)
values ('USER_ID', 'plumber', 25, 99, 'Weekdays 9am-5pm');
```
