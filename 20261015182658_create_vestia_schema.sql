/*
# Vestia - Database Schema for AI Wardrobe Stylist

Creates the full data model for a multi-user wardrobe management app with AI-powered outfit generation.

## New Tables

1. `clothing_items` - Individual clothing pieces in a user's digital wardrobe
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - name (text) - item name/label
   - category (text) - e.g. "tops", "bottoms", "shoes", "accessories"
   - subcategory (text) - e.g. "t-shirt", "jeans", "sneakers"
   - color (text) - primary color
   - color_hex (text) - hex color code
   - material (text) - fabric/material
   - brand (text) - brand name
   - season (text) - spring/summer/fall/winter/all
   - image_url (text) - private storage object path for the stored photo
   - ai_description (text) - full AI-generated description
   - times_worn (int) - how many times the item has been worn
   - created_at (timestamptz)
   - updated_at (timestamptz)

2. `outfits` - AI-generated outfit combinations
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users)
   - occasion (text) - e.g. "work", "dinner", "casual"
   - weather (text) - weather context
   - items (jsonb) - array of clothing item IDs
   - ai_explanation (text) - why this outfit works
   - rating (int) - user rating 1-5
   - created_at (timestamptz)

3. `outfit_logs` - Daily log of what was worn
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users)
   - outfit_id (uuid, FK to outfits, nullable)
   - item_ids (jsonb) - array of clothing item IDs worn
   - date (date) - the day the outfit was worn
   - note (text) - optional note
   - created_at (timestamptz)

4. `style_profiles` - User's personal style profile
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, unique)
   - body_type (text)
   - skin_tone (text)
   - preferred_colors (jsonb) - array of preferred colors
   - style_preferences (jsonb) - style keywords
   - size_top (text)
   - size_bottom (text)
   - size_shoes (text)
   - updated_at (timestamptz)

5. `packing_lists` - AI-generated packing lists for trips
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users)
   - destination (text)
   - duration_days (int)
   - weather (text)
   - items (jsonb) - array of clothing item IDs with quantities
   - ai_suggestion (text) - AI-generated packing advice
   - created_at (timestamptz)

## Security
- RLS enabled on all tables
- Owner-scoped CRUD policies (user can only access their own data)
- All user_id columns default to auth.uid()
*/

-- Clothing items table
CREATE TABLE IF NOT EXISTS clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  subcategory text,
  color text,
  color_hex text,
  material text,
  brand text,
  season text DEFAULT 'all',
  image_url text,
  ai_description text,
  times_worn integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clothing" ON clothing_items;
CREATE POLICY "select_own_clothing" ON clothing_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clothing" ON clothing_items;
CREATE POLICY "insert_own_clothing" ON clothing_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clothing" ON clothing_items;
CREATE POLICY "update_own_clothing" ON clothing_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clothing" ON clothing_items;
CREATE POLICY "delete_own_clothing" ON clothing_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Outfits table
CREATE TABLE IF NOT EXISTS outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  occasion text NOT NULL DEFAULT 'casual',
  weather text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_explanation text,
  rating integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_outfits" ON outfits;
CREATE POLICY "select_own_outfits" ON outfits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_outfits" ON outfits;
CREATE POLICY "insert_own_outfits" ON outfits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_outfits" ON outfits;
CREATE POLICY "update_own_outfits" ON outfits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_outfits" ON outfits;
CREATE POLICY "delete_own_outfits" ON outfits FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Outfit logs table
CREATE TABLE IF NOT EXISTS outfit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id uuid REFERENCES outfits(id) ON DELETE SET NULL,
  item_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE outfit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_logs" ON outfit_logs;
CREATE POLICY "select_own_logs" ON outfit_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_logs" ON outfit_logs;
CREATE POLICY "insert_own_logs" ON outfit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_logs" ON outfit_logs;
CREATE POLICY "update_own_logs" ON outfit_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_logs" ON outfit_logs;
CREATE POLICY "delete_own_logs" ON outfit_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Style profiles table
CREATE TABLE IF NOT EXISTS style_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body_type text,
  skin_tone text,
  preferred_colors jsonb DEFAULT '[]'::jsonb,
  style_preferences jsonb DEFAULT '[]'::jsonb,
  size_top text,
  size_bottom text,
  size_shoes text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON style_profiles;
CREATE POLICY "select_own_profile" ON style_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON style_profiles;
CREATE POLICY "insert_own_profile" ON style_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON style_profiles;
CREATE POLICY "update_own_profile" ON style_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON style_profiles;
CREATE POLICY "delete_own_profile" ON style_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Packing lists table
CREATE TABLE IF NOT EXISTS packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  destination text NOT NULL DEFAULT '',
  duration_days integer NOT NULL DEFAULT 1,
  weather text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_suggestion text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_packing" ON packing_lists;
CREATE POLICY "select_own_packing" ON packing_lists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_packing" ON packing_lists;
CREATE POLICY "insert_own_packing" ON packing_lists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_packing" ON packing_lists;
CREATE POLICY "update_own_packing" ON packing_lists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_packing" ON packing_lists;
CREATE POLICY "delete_own_packing" ON packing_lists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_id ON clothing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_logs_user_id ON outfit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_logs_date ON outfit_logs(date);
CREATE INDEX IF NOT EXISTS idx_style_profiles_user_id ON style_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_packing_lists_user_id ON packing_lists(user_id);