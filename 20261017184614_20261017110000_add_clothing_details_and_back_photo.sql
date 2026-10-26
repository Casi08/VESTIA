/*
# Extend clothing items with editable details and an optional back photo

1. New columns on `clothing_items`
- `back_image_url` (text, nullable): private storage object path for the optional back view of the same garment.
- `personal_notes` (text, nullable): comments and personal details entered by the wardrobe owner.

2. Modified columns
- No existing columns are removed, renamed, or type-changed.
- Existing AI descriptions remain in `ai_description` and can be edited by the owner.

3. Security
- The existing owner-scoped RLS policies on `clothing_items` continue to protect all columns, including the new fields.
- No new public access is introduced.

4. Data safety
- Existing clothing items keep their current data; both new fields default to NULL.
*/

ALTER TABLE clothing_items
  ADD COLUMN IF NOT EXISTS back_image_url text,
  ADD COLUMN IF NOT EXISTS personal_notes text;