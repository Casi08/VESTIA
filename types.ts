export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subcategory: string | null;
  color: string | null;
  color_hex: string | null;
  material: string | null;
  brand: string | null;
  season: string;
  image_url: string | null;
  back_image_url: string | null;
  ai_description: string | null;
  personal_notes: string | null;
  times_worn: number;
  created_at: string;
  updated_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  occasion: string;
  weather: string | null;
  items: string[];
  ai_explanation: string | null;
  rating: number | null;
  created_at: string;
}

export interface OutfitLog {
  id: string;
  user_id: string;
  outfit_id: string | null;
  item_ids: string[];
  date: string;
  note: string | null;
  created_at: string;
}

export interface StyleProfile {
  id: string;
  user_id: string;
  body_type: string | null;
  skin_tone: string | null;
  preferred_colors: string[];
  style_preferences: string[];
  size_top: string | null;
  size_bottom: string | null;
  size_shoes: string | null;
  updated_at: string;
}

export interface PackingList {
  id: string;
  user_id: string;
  destination: string;
  duration_days: number;
  weather: string | null;
  items: any[];
  ai_suggestion: string | null;
  created_at: string;
}

export interface AnalyzedClothing {
  name: string;
  category: string;
  subcategory: string;
  color: string;
  color_hex: string;
  material: string;
  season: string;
  style_tags: string[];
  description: string;
}

export interface GeneratedOutfit {
  name: string;
  item_ids: string[];
  explanation: string;
  style_tags: string[];
}

export interface PackingResult {
  packing_list: {
    item_id: string;
    item_name: string;
    quantity: number;
    reason: string;
  }[];
  tips: string[];
  outfit_plan: string[];
}
