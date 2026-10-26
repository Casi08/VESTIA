import type { ClothingItem } from './types';

export function clothingDisplayName(item: Pick<ClothingItem, 'name' | 'ai_description'>): string {
  if (item.name.trim() === 'Capo da descrivere' || !item.ai_description?.trim()) {
    return 'Analisi IA da completare';
  }

  return item.name;
}
