---
name: Supabase auth connectivity
description: Safe troubleshooting guidance for Supabase email sign-in and sign-up failures.
---

If Expo email authentication returns a network error, verify that the Project URL and public anon/publishable key belong to the same Supabase project. Keep service-role/secret keys out of the client.

**Why:** A malformed or unreachable URL, a rejected public key, and a CORS preflight failure produce similar client-side symptoms but require different fixes.

**How to apply:** Use status-only health and preflight checks; never print environment secret values. Restart Expo after changing `EXPO_PUBLIC_` secrets so the bundle uses the updated configuration.
