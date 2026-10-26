import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { VestiaBackground } from '@/components/VestiaBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Sparkles, GraduationCap, Briefcase, Crown, UtensilsCrossed, Heart, Footprints, Heart as HeartIcon } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/lib/theme';
import { fetchClothingItems, fetchStyleProfile, insertOutfitLog, insertOutfit } from '@/lib/data';
import { clothingDisplayName } from '@/lib/clothing-utils';
import { generateOutfits } from '@/lib/ai';
import { ClothingItem, StyleProfile, GeneratedOutfit } from '@/lib/types';

const OCCASIONS = [
  { label: 'Scuola', subtitle: 'COMODO, ORDINATO, EASY', icon: GraduationCap, value: 'school' },
  { label: 'Cena', subtitle: 'ELEGANTE MA DISINVOLTO', icon: UtensilsCrossed, value: 'dinner' },
  { label: 'Evento importante', subtitle: 'FORMALE E MEMORABILE', icon: Crown, value: 'formal' },
  { label: 'Cena romantica', subtitle: 'SEDUCENTE E SOFISTICATO', icon: Heart, value: 'date' },
  { label: 'Uscita classica', subtitle: 'PULITO E SENZA TEMPO', icon: Briefcase, value: 'classic' },
  { label: 'Street', subtitle: 'URBAN E CONTEMPORANEO', icon: Footprints, value: 'street' },
];

const WEATHERS = [
  { label: 'Hot', value: 'hot' },
  { label: 'Warm', value: 'warm' },
  { label: 'Mild', value: 'mild' },
  { label: 'Cool', value: 'cool' },
  { label: 'Cold', value: 'cold' },
];

export default function StylistScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [occasion, setOccasion] = useState('casual');
  const [weather, setWeather] = useState('mild');
  const [customOccasion, setCustomOccasion] = useState('');
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOutfits, setSavedOutfits] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedItems, fetchedProfile] = await Promise.all([
        fetchClothingItems(user.id),
        fetchStyleProfile(user.id),
      ]);
      setItems(fetchedItems);
      setProfile(fetchedProfile);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleGenerate = async () => {
    if (items.length < 2) {
      setError('You need at least 2 items in your wardrobe to generate outfits.');
      return;
    }
    setLoading(true);
    setError(null);
    setOutfits([]);
    setSavedOutfits(new Set());

    try {
      const occ = customOccasion || occasion;
      const result = await generateOutfits(items, occ, weather, profile);
      setOutfits(result.outfits || []);
    } catch (err: any) {
      setError(err.message || 'Failed to generate outfits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOutfit = async (outfit: GeneratedOutfit, index: number) => {
    if (!user || savedOutfits.has(index)) return;
    try {
      const outfitId = await insertOutfit({
        occasion: customOccasion || occasion,
        weather,
        items: outfit.item_ids,
        ai_explanation: outfit.explanation,
      });
      await insertOutfitLog({
        outfit_id: outfitId,
        item_ids: outfit.item_ids,
        date: new Date().toISOString().split('T')[0],
      });
      setSavedOutfits((prev) => new Set([...prev, index]));
    } catch (err) {
      setError('Failed to save outfit.');
    }
  };

  const getOutfitItems = (outfit: GeneratedOutfit) =>
    outfit.item_ids
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean) as ClothingItem[];

  return (
    <VestiaBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>PASSO 1 DI 2</Text>
            <Text style={styles.title}>Qual è l'occasione?</Text>
            <Text style={styles.subtitle}>Scegli il tema e Vestia comporrà tre proposte usando solo i capi del tuo guardaroba.</Text>
          </View>

          <>
              <View style={styles.section}>
                <View style={styles.optionGrid}>
                  {OCCASIONS.map((occ) => {
                    const Icon = occ.icon;
                    const isActive = occasion === occ.value;
                    return (
                      <TouchableOpacity
                        key={occ.value}
                        style={[styles.optionCard, isActive && styles.optionCardActive]}
                        onPress={() => { setOccasion(occ.value); setCustomOccasion(''); }}
                      >
                        <View style={[styles.optionIcon, isActive && styles.optionIconActive]}>
                          <Icon color={isActive ? Colors.accent : Colors.textSecondary} size={25} strokeWidth={1.8} />
                        </View>
                        <Text style={styles.optionCardTitle}>{occ.label}</Text>
                        <Text style={styles.optionCardSubtitle}>{occ.subtitle}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.customInput}
                  placeholder="Or describe your own occasion..."
                  placeholderTextColor={Colors.textTertiary}
                  value={customOccasion}
                  onChangeText={setCustomOccasion}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Weather</Text>
                <View style={styles.weatherRow}>
                  {WEATHERS.map((w) => {
                    const isActive = weather === w.value;
                    return (
                      <TouchableOpacity
                        key={w.value}
                        style={[styles.weatherChip, isActive && styles.weatherChipActive]}
                        onPress={() => setWeather(w.value)}
                      >
                        <Text style={[styles.weatherChipText, isActive && styles.weatherChipTextActive]}>
                          {w.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {items.length < 2 && (
                <View style={styles.wardrobeNotice}>
                  <Sparkles color={Colors.accent} size={20} strokeWidth={1.7} />
                  <Text style={styles.wardrobeNoticeText}>Aggiungi almeno due capi per generare il tuo outfit.</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.generateButton, items.length < 2 && styles.generateButtonDisabled]}
                onPress={handleGenerate}
                disabled={loading || items.length < 2}
                activeOpacity={0.85}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={styles.generateButtonText}>Creating outfits...</Text>
                  </>
                ) : (
                  <>
                    <Sparkles color={Colors.primary} size={22} strokeWidth={2} />
                    <Text style={styles.generateButtonText}>Genera outfit</Text>
                  </>
                )}
              </TouchableOpacity>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {outfits.length > 0 && (
                <View style={styles.outfitsSection}>
                  <Text style={styles.outfitsTitle}>{outfits.length} outfits created</Text>
                  {outfits.map((outfit, index) => {
                    const outfitItems = getOutfitItems(outfit);
                    const isSaved = savedOutfits.has(index);
                    return (
                      <View key={index} style={styles.outfitCard}>
                        <Text style={styles.outfitName}>{outfit.name}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outfitItemsScroll}>
                          {outfitItems.map((item, i) => (
                            <View key={i} style={styles.outfitItemChip}>
                              {item.image_url ? (
                                <Image source={{ uri: item.image_url }} style={styles.outfitItemImage} />
                              ) : (
                                <View style={[styles.outfitItemImage, styles.placeholderImg]}>
                                  <Text style={styles.placeholderText}>{clothingDisplayName(item)[0]}</Text>
                                </View>
                              )}
                              <Text style={styles.outfitItemName} numberOfLines={1}>{clothingDisplayName(item)}</Text>
                              <Text style={styles.outfitItemCat}>{item.category}</Text>
                            </View>
                          ))}
                        </ScrollView>
                        <Text style={styles.outfitExplanation}>{outfit.explanation}</Text>
                        <View style={styles.outfitActions}>
                          <View style={styles.outfitTags}>
                            {outfit.style_tags?.map((tag, i) => (
                              <View key={i} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                          <TouchableOpacity
                            style={[styles.saveButton, isSaved && styles.saveButtonActive]}
                            onPress={() => handleSaveOutfit(outfit, index)}
                            disabled={isSaved}
                          >
                            <HeartIcon
                              color={isSaved ? Colors.primary : Colors.accent}
                              size={16}
                              fill={isSaved ? Colors.primary : 'none'}
                            />
                            <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextActive]}>
                              {isSaved ? 'Saved' : 'Save & Log'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
        </ScrollView>
      </SafeAreaView>
    </VestiaBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    fontSize: 34,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 25,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 2.5,
    marginBottom: Spacing.md,
  },
  optionGrid: {
    gap: Spacing.md,
  },
  optionCard: {
    minHeight: 150,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(16, 13, 20, 0.58)',
  },
  optionCardActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(28, 23, 22, 0.7)',
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  optionIconActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  optionCardTitle: {
    ...Typography.h2,
    color: Colors.text,
    fontSize: 22,
  },
  optionCardSubtitle: {
    ...Typography.label,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    letterSpacing: 2.5,
  },
  customInput: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  weatherRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  weatherChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weatherChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  weatherChipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  weatherChipTextActive: {
    color: Colors.primary,
  },
  wardrobeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(18, 15, 21, 0.62)',
  },
  wardrobeNoticeText: {
    ...Typography.bodySmall,
    flex: 1,
    color: Colors.textSecondary,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4,
    marginBottom: Spacing.lg,
  },
  generateButtonDisabled: {
    opacity: 0.45,
  },
  generateButtonText: {
    ...Typography.h3,
    color: Colors.primary,
    fontFamily: 'Inter-Semi',
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  outfitsSection: {
    marginTop: Spacing.sm,
  },
  outfitsTitle: {
    ...Typography.h3,
    color: Colors.accent,
    marginBottom: Spacing.md,
  },
  outfitCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  outfitName: {
    ...Typography.h2,
    color: Colors.text,
    fontSize: 22,
    marginBottom: Spacing.md,
  },
  outfitItemsScroll: {
    marginBottom: Spacing.md,
  },
  outfitItemChip: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 90,
  },
  outfitItemImage: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLighter,
    marginBottom: Spacing.xs,
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...Typography.h2,
    color: Colors.textTertiary,
  },
  outfitItemName: {
    ...Typography.caption,
    color: Colors.text,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  outfitItemCat: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  outfitExplanation: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  outfitActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outfitTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    flex: 1,
  },
  tag: {
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
  },
  tagText: {
    ...Typography.caption,
    color: Colors.accent,
    fontFamily: 'Inter-Medium',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  saveButtonText: {
    ...Typography.caption,
    color: Colors.accent,
    fontFamily: 'Inter-Medium',
  },
  saveButtonTextActive: {
    color: Colors.primary,
  },
});
