import { ClothingItem, OutfitLog, StyleProfile } from './types';
import { supabase } from './supabase';
import { withSignedClothingPhotos } from './storage';

export async function fetchClothingItems(userId: string): Promise<ClothingItem[]> {
  const { data, error } = await supabase
    .from('clothing_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return Promise.all((data || []).map(withSignedClothingPhotos));
}

export async function insertClothingItem(item: Partial<ClothingItem>): Promise<ClothingItem> {
  const { data, error } = await supabase
    .from('clothing_items')
    .insert(item)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return withSignedClothingPhotos(data);
}

export async function deleteClothingItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('clothing_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateClothingItem(id: string, updates: Partial<ClothingItem>): Promise<ClothingItem> {
  const { data, error } = await supabase
    .from('clothing_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return withSignedClothingPhotos(data);
}

export async function fetchOutfitLogs(userId: string): Promise<OutfitLog[]> {
  const { data, error } = await supabase
    .from('outfit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertOutfitLog(log: Partial<OutfitLog>): Promise<OutfitLog> {
  const { data, error } = await supabase
    .from('outfit_logs')
    .insert(log)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchStyleProfile(userId: string): Promise<StyleProfile | null> {
  const { data, error } = await supabase
    .from('style_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertStyleProfile(profile: Partial<StyleProfile>): Promise<StyleProfile> {
  const { data, error } = await supabase
    .from('style_profiles')
    .upsert(profile, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function insertOutfit(outfit: {
  occasion: string;
  weather: string | null;
  items: string[];
  ai_explanation: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('outfits')
    .insert(outfit)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}
