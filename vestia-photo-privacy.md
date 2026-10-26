---
name: VESTIA photo privacy
description: User-approved access policy for personal wardrobe photos.
---

Keep VESTIA clothing photos private per account. Store object paths in the clothing records and create short-lived signed URLs only when the app needs to display a photo. Do not make the clothing-photo bucket public.

**Why:** The user chose private photo access rather than public image links.

**How to apply:** Restrict storage policies to the authenticated user's own folder. Avoid forwarding signed photo URLs to AI endpoints that only need clothing metadata. Supabase schema and storage migrations must be applied to the user's project; the app's public key cannot create buckets or policies.
