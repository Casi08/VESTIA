import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { VestiaBackground } from '@/components/VestiaBackground';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Shirt, Calendar, TrendingUp, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/lib/theme';
import { fetchClothingItems, fetchOutfitLogs, fetchStyleProfile } from '@/lib/data';
import { ClothingItem, OutfitLog, StyleProfile } from '@/lib/types';
import { clothingDisplayName } from '@/lib/clothing-utils';
import { generateOutfits } from '@/lib/ai';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [logs, setLogs] = useState<OutfitLog[]>([]);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOutfit, setLoadingOutfit] = useState(false);
  const [dailyOutfit, setDailyOutfit] = useState<any>(null);
  const [outfitError, setOutfitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedItems, fetchedLogs, fetchedProfile] = await Promise.all([
        fetchClothingItems(user.id),
        fetchOutfitLogs(user.id),
        fetchStyleProfile(user.id),
      ]);
      setItems(fetchedItems);
      setLogs(fetchedLogs);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const generateDailyOutfit = async () => {
    if (!user || items.length === 0) return;
    setLoadingOutfit(true);
    setOutfitError(null);
    try {
      const today = new Date();
      const occasion = 'everyday';
      const weather = 'comfortable';
      const result = await generateOutfits(items, occasion, weather, profile);
      if (result.outfits && result.outfits.length > 0) {
        const outfit = result.outfits[0];
        const outfitItems = outfit.item_ids
          .map((id) => items.find((i) => i.id === id))
          .filter(Boolean);
        setDailyOutfit({ ...outfit, resolvedItems: outfitItems });
      }
    } catch (err: any) {
      setOutfitError(err.message || 'Failed to generate outfit');
    } finally {
      setLoadingOutfit(false);
    }
  };

  const mostWornItems = [...items].sort((a, b) => b.times_worn - a.times_worn).slice(0, 3);
  const unwornItems = items.filter((i) => i.times_worn === 0);
  const totalCombinations = Math.min(
    items.length * Math.max(items.length - 1, 0),
    9999
  );

  return (
    <VestiaBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.hero}>
            <Text style={styles.heroBrand}>VESTIA</Text>
            <TouchableOpacity style={styles.primaryHeroButton} onPress={() => router.push('/(tabs)/stylist')} activeOpacity={0.85}>
              <Text style={styles.primaryHeroText}>CREA OUTFIT</Text>
              <ChevronRight color={Colors.primary} size={25} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryHeroButton} onPress={() => router.push('/(tabs)/wardrobe')} activeOpacity={0.85}>
              <Text style={styles.secondaryHeroText}>IL MIO GUARDAROBA · {items.length} CAPI</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Shirt color={Colors.accent} size={48} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
              <Text style={styles.emptyText}>
                Start by adding your clothing items. Snap a photo and let AI do the rest.
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(tabs)/wardrobe')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaButtonText}>Add Your First Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Sparkles color={Colors.accent} size={18} strokeWidth={2} />
                    <Text style={styles.sectionTitle}>Today's Outfit</Text>
                  </View>
                </View>

                {dailyOutfit ? (
                  <View style={styles.outfitCard}>
                    <Text style={styles.outfitName}>{dailyOutfit.name}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outfitItemsScroll}>
                      {dailyOutfit.resolvedItems?.map((item: ClothingItem, i: number) => (
                        <View key={i} style={styles.outfitItemChip}>
                          {item.image_url ? (
                            <Image source={{ uri: item.image_url }} style={styles.outfitItemImage} />
                          ) : (
                            <View style={[styles.outfitItemImage, styles.outfitItemPlaceholder]}>
                              <Shirt color={Colors.textTertiary} size={20} />
                            </View>
                          )}
                          <Text style={styles.outfitItemName} numberOfLines={1}>{clothingDisplayName(item)}</Text>
                        </View>
                      ))}
                    </ScrollView>
                    <Text style={styles.outfitExplanation}>{dailyOutfit.explanation}</Text>
                    <View style={styles.outfitTags}>
                      {dailyOutfit.style_tags?.map((tag: string, i: number) => (
                        <View key={i} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.generateCard}
                    onPress={generateDailyOutfit}
                    disabled={loadingOutfit}
                    activeOpacity={0.85}
                  >
                    {loadingOutfit ? (
                      <Text style={styles.generateText}>Creating your outfit...</Text>
                    ) : (
                      <>
                        <Sparkles color={Colors.accent} size={28} strokeWidth={1.5} />
                        <Text style={styles.generateTitle}>Get today's suggestion</Text>
                        <Text style={styles.generateText}>
                          AI will pick the perfect outfit from your {items.length} items
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {outfitError && (
                  <Text style={styles.errorText}>{outfitError}</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{items.length}</Text>
                    <Text style={styles.statLabel}>Items</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{logs.length}</Text>
                    <Text style={styles.statLabel}>Outfits Logged</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{unwornItems.length}</Text>
                    <Text style={styles.statLabel}>Unworn</Text>
                  </View>
                </View>
              </View>

              {mostWornItems.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <TrendingUp color={Colors.accent} size={18} strokeWidth={2} />
                      <Text style={styles.sectionTitle}>Most Worn</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/wardrobe')}>
                      <ChevronRight color={Colors.textTertiary} size={20} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {mostWornItems.map((item) => (
                      <View key={item.id} style={styles.miniItemCard}>
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} style={styles.miniItemImage} />
                        ) : (
                          <View style={[styles.miniItemImage, styles.outfitItemPlaceholder]}>
                            <Shirt color={Colors.textTertiary} size={24} />
                          </View>
                        )}
                        <Text style={styles.miniItemName} numberOfLines={1}>{clothingDisplayName(item)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Calendar color={Colors.accent} size={18} strokeWidth={2} />
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
                    <ChevronRight color={Colors.textTertiary} size={20} />
                  </TouchableOpacity>
                </View>
                {logs.length > 0 ? (
                  logs.slice(0, 3).map((log) => (
                    <View key={log.id} style={styles.logRow}>
                      <View style={styles.logDot} />
                      <View style={styles.logInfo}>
                        <Text style={styles.logDate}>
                          {new Date(log.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                        {log.note && <Text style={styles.logNote}>{log.note}</Text>}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySectionText}>
                    No outfits logged yet. Start tracking what you wear!
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </VestiaBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  hero: {
    minHeight: 430,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },
  heroBrand: {
    ...Typography.hero,
    color: Colors.accentLight,
    textAlign: 'center',
    letterSpacing: 9,
    marginBottom: Spacing.xxxl * 2,
  },
  primaryHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.round,
    minHeight: 64,
    paddingHorizontal: Spacing.xl,
  },
  primaryHeroText: {
    ...Typography.label,
    color: Colors.primary,
    letterSpacing: 3,
  },
  secondaryHeroButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(18, 14, 24, 0.62)',
  },
  secondaryHeroText: {
    ...Typography.label,
    color: Colors.text,
    letterSpacing: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
  },
  ctaButtonText: {
    ...Typography.h3,
    color: Colors.primary,
    fontFamily: 'Inter-Semi',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  generateCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  generateTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  generateText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  outfitCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  outfitName: {
    ...Typography.h2,
    color: Colors.accent,
    marginBottom: Spacing.md,
  },
  outfitItemsScroll: {
    marginBottom: Spacing.md,
  },
  outfitItemChip: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 80,
  },
  outfitItemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLighter,
    marginBottom: Spacing.xs,
  },
  outfitItemPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitItemName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  outfitExplanation: {
    ...Typography.body,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  outfitTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  tagText: {
    ...Typography.caption,
    color: Colors.accent,
    fontFamily: 'Inter-Medium',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    ...Typography.h1,
    color: Colors.accent,
    fontSize: 28,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  miniItemCard: {
    width: 120,
    marginRight: Spacing.md,
  },
  miniItemImage: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  miniItemName: {
    ...Typography.caption,
    color: Colors.text,
    fontFamily: 'Inter-Medium',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: Spacing.md,
  },
  logInfo: {
    flex: 1,
  },
  logDate: {
    ...Typography.body,
    color: Colors.text,
  },
  logNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptySectionText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
});
