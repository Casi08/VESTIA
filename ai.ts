import { supabase } from './supabase';
import type { AnalyzedClothing, GeneratedOutfit, PackingResult, ClothingItem, StyleProfile } from './types';

export async function analyzeClothing(imageBase64: string, mimeType: string): Promise<AnalyzedClothing> {
  const { data, error } = await supabase.functions.invoke('analyze-clothing', {
    body: { imageBase64, mimeType },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  const result = data as Partial<AnalyzedClothing> | null;
  const name = typeof result?.name === 'string' ? result.name.trim() : '';
  const description = typeof result?.description === 'string' ? result.description.trim() : '';

  if (!result || !name || !description) {
    throw new Error('L’IA non ha generato un nome e una descrizione validi. Riprova.');
  }

  return { ...result, name, description } as AnalyzedClothing;
}

export async function generateOutfits(
  clothingItems: ClothingItem[],
  occasion: string,
  weather: string,
  styleProfile: StyleProfile | null
): Promise<{ outfits: GeneratedOutfit[] }> {
  const clothingMetadata = clothingItems.map((item) => {
    const { image_url: _imageUrl, back_image_url: _backImageUrl, ...metadata } = item;
    void _imageUrl;
    void _backImageUrl;
    return metadata;
  });

  const { data, error } = await supabase.functions.invoke('generate-outfit', {
    body: { clothingItems: clothingMetadata, occasion, weather, styleProfile },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data as { outfits: GeneratedOutfit[] };
}

export async function generatePackingList(
  destination: string,
  durationDays: number,
  weather: string,
  clothingItems: ClothingItem[]
): Promise<PackingResult> {
  const clothingMetadata = clothingItems.map((item) => {
    const { image_url: _imageUrl, back_image_url: _backImageUrl, ...metadata } = item;
    void _imageUrl;
    void _backImageUrl;
    return metadata;
  });

  const { data, error } = await supabase.functions.invoke('packing-assistant', {
    body: { destination, durationDays, weather, clothingItems: clothingMetadata },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data as PackingResult;
}
