import { supabase } from './supabase';
import type { ClothingItem } from './types';

export const CLOTHING_PHOTO_BUCKET = 'clothing-photos';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function getClothingPhotoPath(reference: string): string | null {
  if (!/^https?:\/\//i.test(reference)) {
    return reference;
  }

  try {
    const pathname = new URL(reference).pathname;
    const prefixes = [
      `/storage/v1/object/public/${CLOTHING_PHOTO_BUCKET}/`,
      `/storage/v1/object/sign/${CLOTHING_PHOTO_BUCKET}/`,
      `/storage/v1/object/authenticated/${CLOTHING_PHOTO_BUCKET}/`,
    ];
    const prefix = prefixes.find((candidate) => pathname.includes(candidate));
    if (!prefix) return null;

    const prefixIndex = pathname.indexOf(prefix);
    return decodeURIComponent(pathname.slice(prefixIndex + prefix.length));
  } catch {
    return null;
  }
}

export async function resolveClothingPhotoUrl(reference: string | null): Promise<string | null> {
  if (!reference) return null;

  const path = getClothingPhotoPath(reference);
  if (!path) return reference;

  const { data, error } = await supabase.storage
    .from(CLOTHING_PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw new Error(`Impossibile aprire la foto privata: ${error.message}`);
  }

  return data.signedUrl;
}

export async function withSignedClothingPhotos(item: ClothingItem): Promise<ClothingItem> {
  const [imageUrl, backImageUrl] = await Promise.all([
    resolveClothingPhotoUrl(item.image_url),
    resolveClothingPhotoUrl(item.back_image_url),
  ]);

  return {
    ...item,
    image_url: imageUrl,
    back_image_url: backImageUrl,
  };
}

export async function uploadClothingImage(
  userId: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: mimeType });

  const { data, error } = await supabase.storage
    .from(CLOTHING_PHOTO_BUCKET)
    .upload(fileName, blob, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    if (error.message.toLowerCase().includes('bucket not found')) {
      throw new Error(
        'Il bucket privato clothing-photos non è ancora stato creato nel progetto Supabase. Applica la migrazione di storage del progetto.'
      );
    }
    throw new Error(error.message);
  }

  return data.path;
}

export async function deleteClothingPhotos(references: Array<string | null | undefined>): Promise<void> {
  const paths = Array.from(new Set(
    references
      .map((reference) => reference ? getClothingPhotoPath(reference) : null)
      .filter((path): path is string => Boolean(path))
  ));

  if (paths.length === 0) return;

  const { error } = await supabase.storage
    .from(CLOTHING_PHOTO_BUCKET)
    .remove(paths);

  if (error) {
    if (error.message.toLowerCase().includes('bucket not found')) {
      throw new Error('Il bucket privato clothing-photos non è disponibile nel progetto Supabase.');
    }
    throw new Error(`Impossibile eliminare la foto privata: ${error.message}`);
  }
}
